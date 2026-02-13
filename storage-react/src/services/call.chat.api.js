/**
 * call.chat.api.js - Chat API orchestration
 *
 * Main entry point for sending chat messages.
 * Handles:
 * - New messages and message edits
 * - Both WebSocket and HTTP streaming modes
 * - Optimistic UI updates
 * - Character switching
 * - Image generation
 * - Database operations
 *
 * Uses:
 * - streamingUtils.js for payload preparation
 * - api.websocket.js for WebSocket connections
 * - api.methods.js for database operations
 */

// Config
import config from '../config';

// Components
import { characters } from '../components/ChatCharacters';

// Services
import {
  extractResponseData,
  generateImage,
  prepareChatHistoryForDB,
  triggerAPIRequest,
  triggerStreamingAPIRequest,
  triggerStreamingWSTextRequest,
  updateSessionInDB
} from '../services/api.methods';
import {
  getOrCreateSherlockSession
} from '../services/sherlock.api';
import sherlockWebSocket from '../services/sherlock.websocket';

// Utils
import { formatDate, generateUUID } from '../utils/misc';
import {
  getCustomerId,
  getImageArtgenShowPrompt,
  getImageAutoGenerateImage,
  getUseWebsockets,
  getTextShowReasoning
} from '../utils/configuration';
import {
  prepareChatHistory,
  prepareResponseChatItem,
  prepareUserInputForWebsocketsRequest,
  prepareUserPrompt
} from '../utils/streamingUtils';

// to clarify some of params:
// editMessagePosition - this is set to index of edited message - if its null its normal, new message, if not - it is edited message
// sessionIndexForAPI, sessionIdForAPI - those are needed because we want to be sure that we're generating data for proper session (if user switches or whatever happens)
// apiAIModelName - model name that we are using for generating the message (sent to API). this will be recorded in order to show which model generated each message
// isHealthMode - this is to differentiate between normal chat and health chat (in health chat we don't execute few things)! i use it also in vibes demos
// With WebSockets, database operations (like saving messages) are handled directly by the backend,
// which then sends back confirmation via dbOperationExecuted events
const CallChatAPI = async ({
  userInput,
  assetInput,
  editMessagePosition,
  attachedImages,
  attachedFiles,
  sessionIndexForAPI,
  sessionIdForAPI,
  isNewSessionFromHere,
  setIsNewSessionFromHere,
  chatContentSnapshot,
  setChatContent,
  apiAIModelName,
  isHealthMode,
  setFocusInput,
  setTriggerSessionAutoRename,
  setIsLoading,
  setErrorMsg,
  manageProgressText,
  mScrollToBottom,
  getSettings,
  navigate,
  setChartLoadingState,
  setChartError,
  setShouldSkipSessionFetching
}) => {
  setIsLoading(true);
  manageProgressText("show", "Text");
  attachedImages.map(image => image.url)
  setChartLoadingState(null);
  setChartError(null);

  const customerId = getCustomerId() ?? 1;

  if (config.VERBOSE_SUPERB === 1) {
    console.log("chatContent: ", chatContentSnapshot)
    console.log("attachedFiles: ", attachedFiles)
    console.log("assetInput: ", assetInput)
  }

  const getResultPayload = (response) => extractResponseData(response) || {};

  // get current character (later we will check if auto response is set)
  const currentAICharacter = chatContentSnapshot[sessionIndexForAPI].ai_character_name;
  const currentCharacter = characters.find(character => character.nameForAPI === currentAICharacter);
  console.log("currentAICharacter: ", currentAICharacter);
  console.log("Current character: ", currentCharacter);
  // Add the user message to chat content FIRST so we can build payload from it
  const userMessage = {
    message: userInput,
    isUserMessage: true,
    created_at: formatDate(new Date().toISOString()),
    image_locations: attachedImages.map(image => image.url),
    file_locations: attachedFiles.map(file => file.url),
  };

  // Add or replace user message
  if (editMessagePosition === null) {
    chatContentSnapshot[sessionIndexForAPI].messages.push(userMessage);
  } else {
    // Extract the URLs from attachedImages and attachedFile
    const imageUrls = attachedImages.map(image => image.url);
    const fileUrls = attachedFiles.map(file => file.url);
    chatContentSnapshot[sessionIndexForAPI].messages[editMessagePosition.index].message = userInput;
    chatContentSnapshot[sessionIndexForAPI].messages[editMessagePosition.index].image_locations = imageUrls;
    chatContentSnapshot[sessionIndexForAPI].messages[editMessagePosition.index].file_locations = fileUrls;
  }

  // Now prepare payload using streamingUtils (after chatContentSnapshot is updated)
  // Prepare chat history (excluding messages being edited)
  const chatHistory = prepareChatHistory(
    chatContentSnapshot,
    sessionIndexForAPI,
    editMessagePosition
  );

  // Prepare user prompt and get active chat item
  const { userPrompt, userActiveChatItem } = prepareUserPrompt(
    chatContentSnapshot,
    sessionIndexForAPI,
    editMessagePosition
  );

  // Prepare AI response placeholder
  const { chatItem: aiResponseChatItem } = prepareResponseChatItem(
    chatContentSnapshot,
    sessionIndexForAPI,
    editMessagePosition,
    currentAICharacter
  );

  // Also create a simple finalUserInput for non-WebSocket code path (legacy support)
  const finalUserInput = {
    prompt: userPrompt,
    chat_history: chatHistory
  };

  // Buffer to hold the chunks until the message is complete
  let chunkBuffer = '';
  let aiMessageIndex;

  try {
    // most characters will have autoResponse - set to true - because we want them to respond (but there are exceptions)
    if (currentCharacter.autoResponse) {
      if (editMessagePosition === null) {
        // Add a placeholder for the AI message
        const aiMessagePlaceholder = {
          message: '',
          isUserMessage: false,
          api_text_gen_model_name: apiAIModelName,
          created_at: formatDate(new Date().toISOString()),
          image_locations: [],
          file_locations: [],
          ai_character_name: currentAICharacter,
          chart_data: []
        };
        chatContentSnapshot[sessionIndexForAPI].messages.push(aiMessagePlaceholder);
        aiMessageIndex = chatContentSnapshot[sessionIndexForAPI].messages.length - 1;
      } else {
        // if its edited message - overwrite AI response
        aiMessageIndex = editMessagePosition.index + 1;
        // but if it doesn't exist - let's create it
        if (aiMessageIndex >= chatContentSnapshot[sessionIndexForAPI].messages.length) {
          const aiMessagePlaceholder = {
            message: '',
            isUserMessage: false,
            api_text_gen_model_name: apiAIModelName,
            created_at: formatDate(new Date().toISOString()),
            image_locations: [],
            file_locations: [],
            ai_character_name: currentAICharacter,
            chart_data: []
          };
          chatContentSnapshot[sessionIndexForAPI].messages.push(aiMessagePlaceholder);
        } else {
          // if exists - overwrite
          chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].message = '';
          chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].api_text_gen_model_name = apiAIModelName;
          chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].created_at = formatDate(new Date().toISOString());
          chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].ai_character_name = currentAICharacter
        }
      }

      setChatContent(chatContentSnapshot);

      if (config.VERBOSE_SUPERB === 1) {
        console.log("API call. Final User Input", finalUserInput);
      }

      // scroll to make sure that AI message is visible
      setTimeout(() => {
        mScrollToBottom(sessionIndexForAPI, false);
      }, 1500);

      // Check if Claude Code character (Sherlock, Bugsy) - uses WebSocket streaming
      if (currentCharacter.isClaudeCodeCharacter) {
        console.log("Using Claude Code WebSocket streaming for text");

        const ensureSherlockSessionId = () => {
          let currentSessionId = sessionIdForAPI ||
            chatContentSnapshot[sessionIndexForAPI].session_id || '';

          if (!currentSessionId) {
            currentSessionId = generateUUID();
            chatContentSnapshot[sessionIndexForAPI].session_id = currentSessionId;
            if (setShouldSkipSessionFetching) {
              setShouldSkipSessionFetching(true);
            }
            setChatContent([...chatContentSnapshot]);
          }

          return currentSessionId;
        };

        const currentSessionId = ensureSherlockSessionId();

        // Accumulators for streaming content
        let streamedResponse = '';
        let streamedThinking = '';
        const showReasoning = getTextShowReasoning();

        // Update AI placeholder with initial status
        const characterName = currentCharacter.name || 'Sherlock';
        chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].message = `${characterName} is investigating...`;
        setChatContent([...chatContentSnapshot]);

        try {
          // Get or create Claude Code character session for WebSocket
          const { sessionId: sherlockSessionId } = await getOrCreateSherlockSession(currentSessionId, currentAICharacter);
          const userId = getCustomerId() ?? 1;

          console.log(`Sherlock text: Using session ${sherlockSessionId}`);

          // Setup WebSocket callbacks
          sherlockWebSocket.setCallbacks({
            onConnectionStateChange: (state) => {
              console.log(`Sherlock WS: Connection state changed to ${state}`);
            },
            onStreamStart: (data) => {
              console.log('Sherlock text: Stream started');
              streamedResponse = '';
              streamedThinking = '';
              // Clear placeholder using functional update
              setChatContent((prevChatContent) => {
                const updated = prevChatContent.map((session, sIdx) => {
                  if (sIdx !== sessionIndexForAPI) return session;
                  return {
                    ...session,
                    messages: session.messages.map((msg, mIdx) => {
                      if (mIdx !== aiMessageIndex) return msg;
                      return { ...msg, message: '' };
                    })
                  };
                });
                return updated;
              });
            },
            onTextChunk: (content, wsSessionId) => {
              streamedResponse += content;
              // Use functional update to avoid stale state
              setChatContent((prevChatContent) => {
                const updated = prevChatContent.map((session, sIdx) => {
                  if (sIdx !== sessionIndexForAPI) return session;
                  return {
                    ...session,
                    messages: session.messages.map((msg, mIdx) => {
                      if (mIdx !== aiMessageIndex) return msg;
                      return { ...msg, message: streamedResponse };
                    })
                  };
                });
                return updated;
              });
              mScrollToBottom(sessionIndexForAPI, false);
            },
            onThinkingChunk: (content, wsSessionId) => {
              if (showReasoning) {
                streamedThinking += content;
                // Store reasoning in the message with new object references
                setChatContent((prevChatContent) => {
                  const updated = prevChatContent.map((session, sIdx) => {
                    if (sIdx !== sessionIndexForAPI) return session;
                    return {
                      ...session,
                      messages: session.messages.map((msg, mIdx) => {
                        if (mIdx !== aiMessageIndex) return msg;
                        return { ...msg, ai_reasoning: streamedThinking };
                      })
                    };
                  });
                  return updated;
                });
              }
            },
            onStreamEnd: (data) => {
              console.log('Sherlock text: Stream ended', data);
              // Final update using functional update
              setChatContent((prevChatContent) => {
                const updated = prevChatContent.map((session, sIdx) => {
                  if (sIdx !== sessionIndexForAPI) return session;
                  return {
                    ...session,
                    messages: session.messages.map((msg, mIdx) => {
                      if (mIdx !== aiMessageIndex) return msg;
                      const updatedMsg = { ...msg };
                      if (data.message_id) {
                        updatedMsg.message_id = data.message_id;
                      }
                      if (streamedResponse) {
                        updatedMsg.message = streamedResponse;
                      }
                      if (showReasoning && streamedThinking) {
                        updatedMsg.ai_reasoning = streamedThinking;
                      }
                      return updatedMsg;
                    })
                  };
                });
                return updated;
              });
              setIsLoading(false);
              manageProgressText("hide", "Text");
            },
            onNotification: (data) => {
              console.log('Sherlock text: Notification received', data);
              // Only process agent_to_user messages (not heartbeats or user echoes)
              if (data.direction !== 'agent_to_user' || data.is_heartbeat_ok) {
                console.log('Sherlock text: Skipping notification (not agent response)');
                return;
              }

              // Update chat content with notification data (complete message)
              setChatContent((prevChatContent) => {
                const updated = prevChatContent.map((session, sIdx) => {
                  if (sIdx !== sessionIndexForAPI) return session;
                  return {
                    ...session,
                    messages: session.messages.map((msg, mIdx) => {
                      if (mIdx !== aiMessageIndex) return msg;
                      const updatedMsg = { ...msg };
                      if (data.message_id) {
                        updatedMsg.message_id = data.message_id;
                      }
                      if (data.content) {
                        updatedMsg.message = data.content;
                      }
                      if (showReasoning && data.ai_reasoning) {
                        updatedMsg.ai_reasoning = data.ai_reasoning;
                      }
                      return updatedMsg;
                    })
                  };
                });
                return updated;
              });
              setIsLoading(false);
              manageProgressText("hide", "Text");
            },
            onUserMessage: (data) => {
              // User message from another client (multi-client sync)
              console.log('Sherlock text: User message from other client', data);

              // Add user message to chat and create AI placeholder
              setChatContent((prevChatContent) => {
                const updated = prevChatContent.map((session, sIdx) => {
                  if (sIdx !== sessionIndexForAPI) return session;

                  // Create user message
                  const userMessage = {
                    message: data.content || '',
                    isUserMessage: true,
                    message_id: data.message_id || null,
                    created_at: formatDate(data.created_at || new Date().toISOString()),
                    image_locations: [],
                    file_locations: [],
                    ai_character_name: currentAICharacter
                  };

                  // Create AI placeholder for upcoming response
                  const aiPlaceholder = {
                    message: `${currentCharacter.name || 'Sherlock'} is investigating...`,
                    isUserMessage: false,
                    api_text_gen_model_name: apiAIModelName,
                    created_at: formatDate(new Date().toISOString()),
                    image_locations: [],
                    file_locations: [],
                    ai_character_name: currentAICharacter,
                    chart_data: []
                  };

                  // Update aiMessageIndex to point to new placeholder
                  aiMessageIndex = session.messages.length + 1;

                  return {
                    ...session,
                    messages: [...session.messages, userMessage, aiPlaceholder]
                  };
                });
                return updated;
              });

              // Show loading and scroll to bottom
              setIsLoading(true);
              manageProgressText("show", "Text");
              setTimeout(() => {
                mScrollToBottom(sessionIndexForAPI, false);
              }, 100);
            },
            onToolStart: ({ toolName, displayText, sessionId }) => {
              console.log('Sherlock text: Tool started', { toolName, displayText });
              setChatContent((prevChatContent) => {
                const updated = prevChatContent.map((session, sIdx) => {
                  if (sIdx !== sessionIndexForAPI) return session;
                  return {
                    ...session,
                    messages: session.messages.map((msg, mIdx) => {
                      if (mIdx !== aiMessageIndex) return msg;
                      return { ...msg, tool_activity: displayText || `${toolName}...` };
                    })
                  };
                });
                return updated;
              });
            },
            onToolResult: ({ toolName, displayText, sessionId }) => {
              console.log('Sherlock text: Tool completed', { toolName, displayText });
              setChatContent((prevChatContent) => {
                const updated = prevChatContent.map((session, sIdx) => {
                  if (sIdx !== sessionIndexForAPI) return session;
                  return {
                    ...session,
                    messages: session.messages.map((msg, mIdx) => {
                      if (mIdx !== aiMessageIndex) return msg;
                      return { ...msg, tool_activity: '' };  // Clear on completion
                    })
                  };
                });
                return updated;
              });
            },
            onError: (error) => {
              console.error('Sherlock WS error:', error);
              setChatContent((prevChatContent) => {
                const updated = prevChatContent.map((session, sIdx) => {
                  if (sIdx !== sessionIndexForAPI) return session;
                  return {
                    ...session,
                    messages: session.messages.map((msg, mIdx) => {
                      if (mIdx !== aiMessageIndex) return msg;
                      return { ...msg, message: `Error: ${error}. Please try again.` };
                    })
                  };
                });
                return updated;
              });
              setIsLoading(false);
              manageProgressText("hide", "Text");
            },
            onCustomEvent: (eventData) => {
              console.log('Sherlock text: onCustomEvent received', eventData);
              if (!eventData) return;

              const eventType = eventData.event_type;
              const eventContent = eventData.content || {};

              console.log('Sherlock text: Processing custom event', { eventType, hasContent: !!eventContent });

              if (eventType === 'chartGenerationStarted') {
                setChartLoadingState({
                  chart_type: eventContent?.chart_type || 'chart',
                  title: eventContent?.title || ''
                });
                setChartError(null);
                return;
              }

              if (eventType === 'chartGenerated' && eventContent) {
                console.log('Sherlock text: Chart generated', eventContent.chart_id);
                setChartLoadingState(null);
                setChartError(null);

                setChatContent((prevChatContent) => {
                  const updated = prevChatContent.map((session, sIdx) => {
                    if (sIdx !== sessionIndexForAPI) return session;

                    // Find the last AI message
                    const messages = [...session.messages];
                    let targetIdx = messages.length - 1;
                    while (targetIdx >= 0 && messages[targetIdx].isUserMessage) {
                      targetIdx--;
                    }
                    if (targetIdx < 0) {
                      console.log('Sherlock text: No AI message found for chart');
                      return session;
                    }

                    const currentCharts = Array.isArray(messages[targetIdx].chart_data) ? messages[targetIdx].chart_data : [];
                    if (currentCharts.some(c => c?.chart_id === eventContent.chart_id)) {
                      console.log('Sherlock text: Duplicate chart, skipping');
                      return session;
                    }

                    messages[targetIdx] = {
                      ...messages[targetIdx],
                      chart_data: [...currentCharts, eventContent]
                    };
                    console.log('Sherlock text: Chart added, total:', messages[targetIdx].chart_data.length);

                    return { ...session, messages };
                  });
                  return updated;
                });
                mScrollToBottom(sessionIndexForAPI, false);
                return;
              }

              if (eventType === 'chartError') {
                setChartLoadingState(null);
                setChartError({
                  error: eventContent?.error || 'Failed to generate chart',
                  chart_type: eventContent?.chart_type,
                  title: eventContent?.title
                });
                return;
              }
            },
          });

          // Connect to WebSocket
          sherlockWebSocket.connect(userId, sherlockSessionId);

          // Wait briefly for connection
          await new Promise(resolve => setTimeout(resolve, 500));

          const sherlockAttachments = {
            image_locations: (attachedImages || [])
              .filter((image) => image.url)
              .map((image) => image.url),
            file_locations: (attachedFiles || [])
              .filter((file) => file.url)
              .map((file) => file.url),
          };
          const attachmentsToSend =
            sherlockAttachments.image_locations.length > 0 || sherlockAttachments.file_locations.length > 0
              ? sherlockAttachments
              : null;

          const { session_id: returnedSessionId, queued, message_id: messageId } = await sherlockWebSocket.sendMessage(
            userInput,
            'text',
            currentAICharacter,  // Pass current character (sherlock or bugsy)
            attachmentsToSend
          );

          // messageId is already marked for deduplication in sendMessage() ACK handler
          console.log('Sherlock: Message sent via WebSocket, messageId:', messageId);

          // Update session ID if returned
          if (returnedSessionId && returnedSessionId !== currentSessionId) {
            if (setShouldSkipSessionFetching) {
              setShouldSkipSessionFetching(true);
            }
            chatContentSnapshot[sessionIndexForAPI].session_id = returnedSessionId;
            setChatContent([...chatContentSnapshot]);
          }

          if (!queued) {
            // Message wasn't queued - unexpected
            chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].message =
              'Message not queued. Please try again.';
            setChatContent([...chatContentSnapshot]);
            setIsLoading(false);
            manageProgressText("hide", "Text");
          }
          // If queued, response will come via WebSocket callbacks
        } catch (error) {
          console.error('Sherlock: Error:', error);
          chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].message =
            `Error: ${error.message}. Please try again.`;
          setChatContent([...chatContentSnapshot]);
          setIsLoading(false);
          manageProgressText("hide", "Text");
        }

        return; // Exit early - don't continue to WebSocket/HTTP paths
      }

      // Check if we should use WebSockets for streaming
      const useWebSockets = getUseWebsockets();

      if (useWebSockets) {
        // Use WebSocket-based streaming
        console.log("Using WebSocket-based streaming for text");

        // Get the current session ID from chatContent (may have been set by previous DB operation)
        // Priority: parameter > stored in chatContent > empty string
        const currentSessionId = sessionIdForAPI ||
          chatContentSnapshot[sessionIndexForAPI].session_id || '';

        // Reasoning buffer for streaming thinking/reasoning chunks
        let reasoningBuffer = '';
        const showReasoning = getTextShowReasoning();

        console.log("Using session ID:", currentSessionId,
          "(from param:", sessionIdForAPI,
          "from chatContent:", chatContentSnapshot[sessionIndexForAPI].session_id, ")");

        // Prepare complete WebSocket payload using streamingUtils
        const websocketPayload = prepareUserInputForWebsocketsRequest(
          userPrompt,
          chatHistory,
          currentSessionId,  // ← Use currentSessionId instead of sessionIdForAPI
          userActiveChatItem,
          aiResponseChatItem,
          editMessagePosition,
          null, // audioFileName
          currentAICharacter,
          false, // autoTriggerTts
          apiAIModelName
        );

        console.log("WebSocket payload prepared:", websocketPayload);

        triggerStreamingWSTextRequest({
          endpoint: "chat/ws",
          requestType: "text",
          userInput: websocketPayload,
          assetInput: assetInput,
          getSettings: getSettings,
          chatContent: chatContentSnapshot,
          currentSessionIndex: sessionIndexForAPI,
          aiMessageIndex: aiMessageIndex,
          editMessagePosition: editMessagePosition,
          attachedImages: attachedImages,
          attachedFiles: attachedFiles,
          onChunkReceived: (chunk) => {
            // if it's artgen and user disabled show prompt - don't show it
            if (currentAICharacter === "iris" && getImageArtgenShowPrompt() === false) {
              return
            }
            chunkBuffer += chunk;
            // here even though we execute setChatContent in next step - we save chunk buffers because this will be saved into DB
            chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].message = chunkBuffer;
            // Update UI with functional update
            setChatContent((prevChatContent) => {
              // Make sure we update the correct session
              const updatedContent = [...prevChatContent];
              updatedContent[sessionIndexForAPI].messages[aiMessageIndex].message = chunkBuffer;
              return updatedContent;
            });
            mScrollToBottom(sessionIndexForAPI);
          },
          onStreamEnd: async (fullResponse) => {
            manageProgressText("hide", "Text");
            mScrollToBottom(sessionIndexForAPI);

            // Handle the same post-streaming logic as in the non-WebSocket case
            await handleStreamEnd(fullResponse);
          },
          onStreamingError: (error) => {
            setIsLoading(false);
            manageProgressText("hide", "Text");
            setErrorMsg("Error during WebSocket streaming. Try again.");
            console.error('Error during WebSocket streaming:', error);
          },
          onCustomEvent: async (eventData) => {
            console.log('Sherlock text: onCustomEvent received', eventData);
            if (!eventData) {
              return;
            }

            const eventType = eventData.event_type;
            if (!eventType) {
              console.error('custom_event missing event_type:', eventData);
              return;
            }
            const eventContent = eventData.content || eventData;
            const sessionMessages = chatContentSnapshot[sessionIndexForAPI]?.messages || [];
            const targetMessage = sessionMessages[aiMessageIndex];

            console.log('Sherlock text: onCustomEvent processing', {
              eventType,
              hasEventContent: !!eventContent,
              hasTargetMessage: !!targetMessage,
              aiMessageIndex,
              sessionMessagesLength: sessionMessages.length
            });

            if (eventType === "chartGenerationStarted") {
              setChartLoadingState({
                chart_type: eventContent?.chart_type || 'chart',
                title: eventContent?.title || ''
              });
              setChartError(null);
              return;
            }

            if (eventType === "chartGenerated" && eventContent) {
              console.log("Received chartGenerated event with payload:", eventContent);
              setChartLoadingState(null);
              setChartError(null);

              const chartPayload = eventContent;

              // Use functional update to get current state, not stale snapshot
              setChatContent((prevChatContent) => {
                const updatedContent = [...prevChatContent];
                const session = updatedContent[sessionIndexForAPI];
                if (!session?.messages?.length) {
                  console.log("Chart debug → no session or messages found");
                  return prevChatContent;
                }

                // Find the last AI message (not user message)
                let targetIdx = session.messages.length - 1;
                while (targetIdx >= 0 && session.messages[targetIdx].isUserMessage) {
                  targetIdx--;
                }
                if (targetIdx < 0) {
                  console.log("Chart debug → no AI message found");
                  return prevChatContent;
                }

                const currentMessage = session.messages[targetIdx];
                console.log(
                  "Chart debug → current chart_data before update:",
                  currentMessage.chart_data,
                  "adding",
                  chartPayload.chart_id,
                  "payload data preview:",
                  chartPayload?.data
                );

                const currentCharts = Array.isArray(currentMessage.chart_data) ? currentMessage.chart_data : [];
                if (currentCharts.some((chart) => chart?.chart_id && chart.chart_id === chartPayload.chart_id)) {
                  console.log("Chart already in state, skipping");
                  return prevChatContent;
                }

                session.messages[targetIdx] = {
                  ...currentMessage,
                  chart_data: [...currentCharts, chartPayload],
                };
                console.log(
                  "Chart debug → chart appended, total chart_data:",
                  session.messages[targetIdx].chart_data?.length || 0
                );
                return updatedContent;
              });

              mScrollToBottom(sessionIndexForAPI);
              return;
            }

            if (eventType === "chartError") {
              setChartLoadingState(null);
              const errorPayload = eventContent || {};
              setChartError({
                error: errorPayload.error || "Failed to generate chart",
                chart_type: errorPayload.chart_type,
                title: errorPayload.title
              });
              return;
            }

            if (eventContent?.type === "image" && eventContent.message === "imageGenerated" && eventContent.image_url && targetMessage) {
              console.log("Received imageGenerated event with URL:", eventContent.image_url);

              const imageUrl = eventContent.image_url;

              setChatContent((prevChatContent) => {
                const updatedContent = [...prevChatContent];
                const currentMessage = updatedContent[sessionIndexForAPI]?.messages?.[aiMessageIndex];
                if (!currentMessage) {
                  return prevChatContent;
                }
                const existingImageLocations = currentMessage.image_locations || [];

                if (!existingImageLocations.includes(imageUrl)) {
                  currentMessage.image_locations = [...existingImageLocations, imageUrl];
                }

                return updatedContent;
              });

              mScrollToBottom(sessionIndexForAPI);
            }

            // Handle reasoning/thinking chunks - stream in real-time
            if (eventContent?.type === "reasoning" && eventContent.message === "reasoningReceived" && eventContent.reasoning) {
              console.log('Reasoning chunk received:', eventContent.reasoning.substring(0, 50) + '...');
              if (showReasoning) {
                reasoningBuffer += eventContent.reasoning;
                console.log('Reasoning buffer updated, length:', reasoningBuffer.length);
                // Update the AI message with accumulated reasoning
                // Create new object references to trigger React.memo re-render
                setChatContent((prevChatContent) => {
                  const updatedContent = prevChatContent.map((session, sIdx) => {
                    if (sIdx !== sessionIndexForAPI) return session;
                    return {
                      ...session,
                      messages: session.messages.map((msg, mIdx) => {
                        if (mIdx !== aiMessageIndex) return msg;
                        return { ...msg, ai_reasoning: reasoningBuffer };
                      })
                    };
                  });
                  return updatedContent;
                });
                // Also update snapshot for later use
                chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].ai_reasoning = reasoningBuffer;
              } else {
                console.log('Reasoning received but showReasoning is disabled');
              }
            }
          },
          onDBOperationExecuted: (dbResult) => {
            console.log('Database operation result received from WebSocket:', dbResult);

            // Extract database operation results (using canonical snake_case)
            const userMessageId = dbResult?.user_message_id ?? null;
            const aiMessageId = dbResult?.ai_message_id ?? null;
            const sessionIdentifier = dbResult?.session_id ?? null;

            // Update session in chatContent if not already set
            if (sessionIdentifier && !chatContentSnapshot[sessionIndexForAPI].session_id) {
              chatContentSnapshot[sessionIndexForAPI].session_id = sessionIdentifier;
              setChatContent((prevChatContent) => {
                // Make sure we update the correct session
                const updatedContent = [...prevChatContent];
                updatedContent[sessionIndexForAPI].session_id = sessionIdentifier;
                return updatedContent;
              });
            }

            // Trigger auto rename session (only for first few messages)
            if (sessionIdentifier && chatContentSnapshot[sessionIndexForAPI].messages.length < 3) {
              setTriggerSessionAutoRename(sessionIdentifier);
            }

            // Update navigation if needed
            if (sessionIdentifier && !sessionIdForAPI) {
              sessionIdForAPI = sessionIdentifier;
              if (!isHealthMode) {
                navigate(`/session/${sessionIdentifier}`);
              }
            }

            // Update message_ids in chatContent
            if (aiMessageId) {
              chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].message_id = aiMessageId;
            }

            if (userMessageId) {
              chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex - 1].message_id = userMessageId;
            }

            // Update UI with the latest chatContent
            setChatContent([...chatContentSnapshot]);
          }
        });
      } else {
        // Use traditional fetch-based streaming
        await triggerStreamingAPIRequest("chat", "text", "chat", finalUserInput, assetInput, getSettings, {
          onChunkReceived: (chunk) => {
            // if it's artgen and user disabled show prompt - don't show it
            if (currentAICharacter === "iris" && getImageArtgenShowPrompt() === false) {
              return
            }

            chunkBuffer += chunk;

            // here even though we execute setChatContent in next step - we save chunk buffers because this will be saved into DB
            chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].message = chunkBuffer;
            // i leave it on purpose - because it did not work this way (with snapshot)
            //setChatContent(chatContentSnapshot);
            // i needed to do functional update to update UI
            setChatContent((prevChatContent) => {
              // Make sure we update the correct session
              const updatedContent = [...prevChatContent];
              updatedContent[sessionIndexForAPI].messages[aiMessageIndex].message = chunkBuffer;
              return updatedContent;
            });
            mScrollToBottom(sessionIndexForAPI);
          },
          onStreamEnd: async (fullResponse) => {
            manageProgressText("hide", "Text");

            mScrollToBottom(sessionIndexForAPI);

            // Handle stream end
            await handleStreamEnd(fullResponse);
          },
          onError: (error) => {
            setIsLoading(false);
            manageProgressText("hide", "Text")
            setErrorMsg("Error during streaming. Try again.")
            console.error('Error during streaming:', error);
          }
        });
      }

      // Define a helper function to handle stream end logic (to avoid code duplication)
      async function handleStreamEnd(fullResponse) {
        // save to DB
        const currentUserMessage = chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex - 1];
        const currentAIResponse = chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex];

        console.log('fullResponse: ', fullResponse);

        // Check if we are using WebSockets - if so, skip DB operations as they're handled on the backend
        const useWebSockets = getUseWebsockets();

        // Only perform DB operations if not using WebSockets
        if (!useWebSockets) {
          const finalInputForDB = prepareFinalInputForDB(sessionIdForAPI, currentUserMessage, currentAIResponse, currentAICharacter, chatContentSnapshot[sessionIndexForAPI], editMessagePosition, isNewSessionFromHere, setIsNewSessionFromHere)

          var apiCallDbMethod = "db_new_message";
          if (editMessagePosition !== null) {
            apiCallDbMethod = "db_edit_message";
          }

          await triggerAPIRequest("api/db", "provider.db", apiCallDbMethod, finalInputForDB, getSettings).then((response) => {
            if (response.success) {
              const result = getResultPayload(response);
              const sessionIdentifier = result.session_id ?? null;

              if (sessionIdentifier && !chatContentSnapshot[sessionIndexForAPI].session_id) {
                chatContentSnapshot[sessionIndexForAPI].session_id = sessionIdentifier;
                setChatContent((prevChatContent) => {
                  const updatedContent = [...prevChatContent];
                  updatedContent[sessionIndexForAPI].session_id = sessionIdentifier;
                  return updatedContent;
                });
              }

              if (sessionIdentifier && chatContentSnapshot[sessionIndexForAPI].messages.length < 3) {
                setTriggerSessionAutoRename(sessionIdentifier);
              }
              if (sessionIdentifier && !sessionIdForAPI) {
                sessionIdForAPI = sessionIdentifier;
                if (!isHealthMode) {
                  navigate(`/session/${sessionIdForAPI}`);
                }
              }
              const aiMessageId = result.ai_message_id;
              const userMessageId = result.user_message_id;
              if (aiMessageId) {
                currentAIResponse.message_id = aiMessageId;
              }
              if (userMessageId) {
                currentUserMessage.message_id = userMessageId;
              }
            }
          });
        }


        // TODO - test it!
        // for artgen mode - if image is enabled and no images attached - generate image
        if (currentAIResponse.ai_character_name === "iris" && getImageAutoGenerateImage() && attachedImages.length === 0) {
          manageProgressText("show", "Image");
          try {
            console.log("Image")
            const imageLocation = await generateImage(fullResponse, getSettings);
            if (imageLocation) {
              // update chatContent with generated image
              chatContentSnapshot[sessionIndexForAPI].messages[aiMessageIndex].image_locations = [imageLocation];
              setChatContent(chatContentSnapshot);

              manageProgressText("hide", "Image");
              mScrollToBottom(sessionIndexForAPI);
              setFocusInput(true);
              //db_update_session to DB 
              await updateSessionInDB(chatContentSnapshot[sessionIndexForAPI], sessionIdForAPI, getSettings);
            } else {
              setErrorMsg("Problem generating image");
              manageProgressText("hide", "Image");
            }
          } catch (error) {
            setIsLoading(false);
            manageProgressText("hide", "Text")
            setErrorMsg("Error during streaming. Try again.")
            console.error('Error during streaming:', error);
            console.error(error);
          } finally {
            manageProgressText("hide", "Image");
          }
        }
      }
    } else { // if its message for AI character without autoResponse
      // Only send the user message to DB if autoResponse is false
      const finalInputForDB = {
        "customer_id": customerId,
        "session_id": sessionIdForAPI,
        "userMessage": {
          "sender": "User",
          "message": userInput,
          "message_id": editMessagePosition !== null ? editMessagePosition.message_id : 0,
          "image_locations": attachedImages.map(image => image.url),
          "file_locations": [],
        },
        "new_ai_character_name": currentAICharacter,
        "chat_history": prepareChatHistoryForDB(chatContentSnapshot[sessionIndexForAPI])
      };

      var apiCallDbMethod = "db_new_message";
      if (editMessagePosition !== null) {
        apiCallDbMethod = "db_edit_message";
      }
      await triggerAPIRequest("api/db", "provider.db", apiCallDbMethod, finalInputForDB, getSettings).then((response) => {
        if (response.success) {
          const result = getResultPayload(response);
          const sessionIdentifier = result.session_id;

          if (!chatContentSnapshot[sessionIndexForAPI].session_id && sessionIdentifier) {
            setChatContent((prevChatContent) => {
              const updatedContent = [...prevChatContent];
              updatedContent[sessionIndexForAPI].session_id = sessionIdentifier;
              updatedContent[sessionIndexForAPI].ai_character_name = currentCharacter.nameForAPI;
              return updatedContent;
            });
          }
          const userMessageId = result.user_message_id;
          if (userMessageId) {
            chatContentSnapshot[sessionIndexForAPI]
              .messages[chatContentSnapshot[sessionIndexForAPI].messages.length - 1]
              .message_id = userMessageId;
          }

          if (chatContentSnapshot[sessionIndexForAPI].messages.length < 2 && sessionIdentifier) {
            setTriggerSessionAutoRename(sessionIdentifier);
          }
        }
      }).catch((error) => {
        setIsLoading(false);
        manageProgressText("hide", "Text");
        setErrorMsg("Error saving message. Try again.");
        console.error('Error saving message:', error);
      });
    }

    setIsLoading(false);
    manageProgressText("hide", "Text");
    setFocusInput(true);


    const original_ai_character = chatContentSnapshot[sessionIndexForAPI].original_ai_character
    // fallback to original AI character (after single use of different one)
    if (original_ai_character !== "" && original_ai_character !== undefined) {
      setChatContent((prevChatContent) => {
        const updatedChatContent = [...prevChatContent];
        updatedChatContent[sessionIndexForAPI].ai_character_name = original_ai_character
        updatedChatContent[sessionIndexForAPI].original_ai_character = "";
        return updatedChatContent;
      });
    }
  } catch (error) {
    setIsLoading(false);
    manageProgressText("hide", "Text")
    setErrorMsg("Error during streaming. Try again.")
    console.error('Error during streaming:', error);
  }

}

/**
 * Prepares input for database operations in non-WebSocket mode.
 *
 * NOTE: This function is NOT used for WebSocket requests.
 * For WebSocket mode, the backend handles database operations directly
 * and sends confirmation via dbOperationExecuted events.
 *
 * This is only called when getUseWebsockets() returns false.
 *
 * @param {string} sessionIdForAPI - Session ID
 * @param {Object} currentUserMessage - User message object
 * @param {Object} currentAIResponse - AI response object
 * @param {string} currentAICharacter - AI character name
 * @param {Object} chatContentForSession - Session chat content
 * @param {Object|null} editMessagePosition - Edit position if editing
 * @param {boolean} isNewSessionFromHere - Whether this starts a new session
 * @param {Function} setIsNewSessionFromHere - Function to update session state
 * @returns {Object} - Prepared payload for database operation
 */
const prepareFinalInputForDB = (sessionIdForAPI, currentUserMessage, currentAIResponse, currentAICharacter, chatContentForSession, editMessagePosition, isNewSessionFromHere, setIsNewSessionFromHere) => {
  console.log("prepareFinalInputForDB: ", currentUserMessage, currentAIResponse);
  const customerId = getCustomerId() ?? 1;
  const finalInputForDB = {
    "customer_id": customerId,
    "session_id": sessionIdForAPI,
    "userMessage": {
      "sender": "User",
      "message": currentUserMessage.message,
      "message_id": currentUserMessage.message_id || 0,
      "image_locations": currentUserMessage.image_locations || [],
      "file_locations": currentUserMessage.file_locations || [],
    },
    "aiResponse": {
      "sender": "AI",
      "message": currentAIResponse.message,
      "message_id": currentAIResponse.message_id || 0,
      "image_locations": currentAIResponse.image_locations || [],
      "file_locations": currentAIResponse.file_locations || [],
      "ai_character_name": currentAICharacter
    },
    "new_ai_character_name": currentAICharacter,
    "chat_history": prepareChatHistoryForDB(chatContentForSession)
  }

  console.log("isNewSessionFromHere: ", isNewSessionFromHere);
  if (isNewSessionFromHere) {
    console.log("isNewSessionFromHere: true");
    // Get all messages from the chat content
    const messages = chatContentForSession.messages;
    let messagesWithoutLast;

    if (editMessagePosition === null) {
      // Drop last 2 messages as this is user request + ai response (empty)
      messagesWithoutLast = messages.slice(0, -2);
    } else {
      // Keep only messages before the edited position
      messagesWithoutLast = messages.slice(0, editMessagePosition.index);
    }

    finalInputForDB["new_session_from_here_full_chat_history"] = prepareChatHistoryForDB({
      messages: messagesWithoutLast
    });
    setIsNewSessionFromHere(false);
  }

  return finalInputForDB;
}

export default CallChatAPI;
