// hooks/useSherlockProactiveConnection.js

import { useContext, useEffect } from 'react';

import { StateContext } from '../components/StateContextProvider';
import { characters } from '../components/ChatCharacters';
import sherlockWebSocket, { ConnectionState } from '../services/sherlock.websocket';
import { getCustomerId, getTextShowReasoning } from '../utils/configuration';
import { formatDate } from '../utils/misc';

const getCharacterMeta = (characterName) =>
  characters.find((character) => character.nameForAPI === characterName);

const isClaudeCodeCharacter = (characterName) =>
  Boolean(getCharacterMeta(characterName)?.isClaudeCodeCharacter);

const getCharacterDisplayName = (characterName) =>
  getCharacterMeta(characterName)?.name || 'Sherlock';

const buildUserMessage = (msgData, characterName) => ({
  message: msgData.content || '',
  isUserMessage: true,
  message_id: msgData.message_id || null,
  created_at: formatDate(msgData.created_at || new Date().toISOString()),
  image_locations: msgData.image_locations || [],
  file_locations: msgData.file_locations || [],
  ai_character_name: characterName,
});

const buildAiPlaceholder = (characterName, modelName = '') => ({
  message: `${getCharacterDisplayName(characterName)} is investigating...`,
  isUserMessage: false,
  api_text_gen_model_name: modelName,
  created_at: formatDate(new Date().toISOString()),
  image_locations: [],
  file_locations: [],
  ai_character_name: characterName,
  chart_data: [],
});

export const useSherlockProactiveConnection = () => {
  const {
    chatContent,
    currentSessionIndex,
    setChatContent,
    mScrollToBottom,
    currentSessionIndexRef,
    setChartLoadingState,
    setChartError,
    setIsLoading,
    manageProgressText,
  } = useContext(StateContext);

  const currentSession = chatContent[currentSessionIndex] || null;
  const currentSessionId = currentSession?.session_id || null;
  const currentSessionCharacter = currentSession?.ai_character_name || '';

  useEffect(() => {
    console.log('Sherlock WS: Auto-connect check', {
      session_id: currentSessionId,
      character: currentSessionCharacter,
      is_claude: isClaudeCodeCharacter(currentSessionCharacter),
    });

    if (!isClaudeCodeCharacter(currentSessionCharacter)) {
      console.log('Sherlock WS: Auto-connect skipped (non-Claude character)');
      if (sherlockWebSocket.getConnectionState() !== ConnectionState.DISCONNECTED) {
        sherlockWebSocket.disconnect();
      }
      return;
    }

    if (!currentSessionId) {
      console.log('Sherlock WS: Auto-connect skipped (missing session id)');
      return;
    }

    const userId = getCustomerId() ?? 1;

    console.log('Sherlock WS: Auto-connect starting', {
      user_id: userId,
      session_id: currentSessionId,
      character: currentSessionCharacter,
    });

    sherlockWebSocket.setCallbacks({
      onConnectionStateChange: (state) => {
        console.log(`Sherlock WS: Auto-connect state ${state} session=${currentSessionId}`);
      },
      onStreamStart: () => {
        setChatContent((prevChatContent) => {
          const updated = [...prevChatContent];
          const sessionIdx = currentSessionIndexRef.current;
          const session = updated[sessionIdx];
          if (!session) return prevChatContent;
          if (session.session_id && session.session_id !== currentSessionId) return prevChatContent;

          const messages = [...session.messages];
          let aiIndex = messages.length - 1;

          if (aiIndex < 0 || messages[aiIndex].isUserMessage) {
            messages.push(buildAiPlaceholder(session.ai_character_name));
            aiIndex = messages.length - 1;
          }

          messages[aiIndex] = {
            ...messages[aiIndex],
            message: '',
            ai_reasoning: '',
          };

          updated[sessionIdx] = { ...session, messages };
          return updated;
        });
      },
      onTextChunk: (content) => {
        if (!content) return;
        setChatContent((prevChatContent) => {
          const updated = [...prevChatContent];
          const sessionIdx = currentSessionIndexRef.current;
          const session = updated[sessionIdx];
          if (!session) return prevChatContent;
          if (session.session_id && session.session_id !== currentSessionId) return prevChatContent;

          const messages = [...session.messages];
          let aiIndex = messages.length - 1;

          if (aiIndex < 0 || messages[aiIndex].isUserMessage) {
            messages.push(buildAiPlaceholder(session.ai_character_name));
            aiIndex = messages.length - 1;
          }

          const previousText = messages[aiIndex].message || '';
          messages[aiIndex] = {
            ...messages[aiIndex],
            message: previousText + content,
          };

          updated[sessionIdx] = { ...session, messages };
          return updated;
        });
        mScrollToBottom(currentSessionIndexRef.current, false);
      },
      onThinkingChunk: (content) => {
        if (!content || !getTextShowReasoning()) return;
        setChatContent((prevChatContent) => {
          const updated = [...prevChatContent];
          const sessionIdx = currentSessionIndexRef.current;
          const session = updated[sessionIdx];
          if (!session) return prevChatContent;
          if (session.session_id && session.session_id !== currentSessionId) return prevChatContent;

          const messages = [...session.messages];
          let aiIndex = messages.length - 1;

          if (aiIndex < 0 || messages[aiIndex].isUserMessage) {
            messages.push(buildAiPlaceholder(session.ai_character_name));
            aiIndex = messages.length - 1;
          }

          const previousReasoning = messages[aiIndex].ai_reasoning || '';
          messages[aiIndex] = {
            ...messages[aiIndex],
            ai_reasoning: previousReasoning + content,
          };

          updated[sessionIdx] = { ...session, messages };
          return updated;
        });
      },
      onStreamEnd: (data) => {
        // Clear loading state - stream has ended
        setIsLoading(false);
        manageProgressText('hide', 'Text');

        if (!data?.message_id) return;
        setChatContent((prevChatContent) => {
          const updated = [...prevChatContent];
          const sessionIdx = currentSessionIndexRef.current;
          const session = updated[sessionIdx];
          if (!session) return prevChatContent;
          if (session.session_id && session.session_id !== currentSessionId) return prevChatContent;

          const messages = [...session.messages];
          const aiIndex = messages.length - 1;
          if (aiIndex < 0 || messages[aiIndex].isUserMessage) return prevChatContent;

          messages[aiIndex] = {
            ...messages[aiIndex],
            message_id: data.message_id,
            tool_activity: '', // Clear tool activity when stream ends
          };

          updated[sessionIdx] = { ...session, messages };
          return updated;
        });
      },
      onToolStart: ({ toolName, displayText, sessionId }) => {
        setChatContent((prevChatContent) => {
          const updated = [...prevChatContent];
          const sessionIdx = currentSessionIndexRef.current;
          const session = updated[sessionIdx];
          if (!session) return prevChatContent;
          if (sessionId && session.session_id && sessionId !== session.session_id) return prevChatContent;

          const messages = [...session.messages];
          let aiIndex = messages.length - 1;

          if (aiIndex < 0 || messages[aiIndex].isUserMessage) {
            messages.push(buildAiPlaceholder(session.ai_character_name));
            aiIndex = messages.length - 1;
          }

          // Show the display_text from backend (already formatted)
          messages[aiIndex] = {
            ...messages[aiIndex],
            tool_activity: displayText || `${toolName}...`,
          };

          updated[sessionIdx] = { ...session, messages };
          return updated;
        });
      },
      onToolResult: ({ toolName, toolInput, toolResult, sessionId }) => {
        setChatContent((prevChatContent) => {
          const updated = [...prevChatContent];
          const sessionIdx = currentSessionIndexRef.current;
          const session = updated[sessionIdx];
          if (!session) return prevChatContent;
          if (sessionId && session.session_id && sessionId !== session.session_id) return prevChatContent;

          const messages = [...session.messages];
          const aiIndex = messages.length - 1;
          if (aiIndex < 0 || messages[aiIndex].isUserMessage) return prevChatContent;

          // Clear tool activity on result (tool completed)
          messages[aiIndex] = {
            ...messages[aiIndex],
            tool_activity: '',
          };

          updated[sessionIdx] = { ...session, messages };
          return updated;
        });
      },
      onNotification: (data) => {
        if (data.direction !== 'agent_to_user' || data.is_heartbeat_ok) {
          return;
        }

        setChatContent((prevChatContent) => {
          const updated = [...prevChatContent];
          const sessionIdx = currentSessionIndexRef.current;
          const session = updated[sessionIdx];
          if (!session) return prevChatContent;
          if (data.session_id && session.session_id && data.session_id !== session.session_id) {
            return prevChatContent;
          }

          const messages = [...session.messages];
          let aiIndex = messages.length - 1;
          if (aiIndex < 0 || messages[aiIndex].isUserMessage) {
            messages.push(buildAiPlaceholder(session.ai_character_name, session.ai_text_gen_model));
            aiIndex = messages.length - 1;
          }

          messages[aiIndex] = {
            ...messages[aiIndex],
            message: data.content || messages[aiIndex].message,
            message_id: data.message_id || messages[aiIndex].message_id,
            ai_reasoning: getTextShowReasoning()
              ? (data.ai_reasoning || messages[aiIndex].ai_reasoning)
              : messages[aiIndex].ai_reasoning,
          };

          updated[sessionIdx] = { ...session, messages };
          return updated;
        });
        mScrollToBottom(currentSessionIndexRef.current, false);
      },
      onUserMessage: (data) => {
        setChatContent((prevChatContent) => {
          const updated = [...prevChatContent];
          const sessionIdx = currentSessionIndexRef.current;
          const session = updated[sessionIdx];
          if (!session) return prevChatContent;
          if (data.session_id && session.session_id && data.session_id !== session.session_id) {
            return prevChatContent;
          }

          // Deduplication: Skip if message already exists in session
          // This handles the race condition where notification arrives before message_sent ACK
          const messageId = data.message_id;
          const messageContent = data.content || '';
          const existingMessage = session.messages.find(
            (msg) => msg.isUserMessage && (
              (msg.message_id && msg.message_id === messageId) ||
              (msg.message === messageContent && !msg.message_id)  // Match by content for pending messages
            )
          );
          if (existingMessage) {
            console.log('Sherlock WS: Skipping duplicate user message', messageId);
            return prevChatContent;
          }

          const messages = [
            ...session.messages,
            buildUserMessage(data, session.ai_character_name),
            buildAiPlaceholder(session.ai_character_name, session.ai_text_gen_model),
          ];

          updated[sessionIdx] = { ...session, messages };
          return updated;
        });
        mScrollToBottom(currentSessionIndexRef.current, false);
      },
      onError: (error) => {
        console.error('Sherlock WS: Auto-connect error', error);
      },
      onStreamError: ({ code, message, sessionId }) => {
        console.error('Sherlock WS: Stream error', { code, message, sessionId });

        // Clear loading state
        setIsLoading(false);
        manageProgressText('hide', 'Text');

        // Add error message to chat
        setChatContent((prevChatContent) => {
          const updated = [...prevChatContent];
          const sessionIdx = currentSessionIndexRef.current;
          const session = updated[sessionIdx];
          if (!session) return prevChatContent;
          if (sessionId && session.session_id && sessionId !== session.session_id) {
            return prevChatContent;
          }

          const messages = [...session.messages];
          let aiIndex = messages.length - 1;

          // Update or create AI message with error content
          if (aiIndex < 0 || messages[aiIndex].isUserMessage) {
            messages.push(buildAiPlaceholder(session.ai_character_name));
            aiIndex = messages.length - 1;
          }

          messages[aiIndex] = {
            ...messages[aiIndex],
            message: message,
            isError: true,
            errorCode: code,
            tool_activity: '', // Clear any tool activity
          };

          updated[sessionIdx] = { ...session, messages };
          return updated;
        });
        mScrollToBottom(currentSessionIndexRef.current, false);
      },
      onCustomEvent: (data) => {
        if (!data) return;
        const eventType = data.event_type;
        const eventContent = data.content || {};
        const eventSessionId = data.sessionId;

        console.log('Sherlock WS: Custom event received', { eventType, eventSessionId });

        // Handle chart generation started
        if (eventType === 'chartGenerationStarted') {
          setChartLoadingState({
            chart_type: eventContent?.chart_type || 'chart',
            title: eventContent?.title || '',
          });
          setChartError(null);
          return;
        }

        // Handle chart generated - add to current AI message
        if (eventType === 'chartGenerated' && eventContent) {
          setChartLoadingState(null);

          setChatContent((prevChatContent) => {
            const updated = [...prevChatContent];
            const sessionIdx = currentSessionIndexRef.current;
            const session = updated[sessionIdx];
            if (!session) return prevChatContent;
            // Verify session matches (eventSessionId is backend session ID)
            if (eventSessionId && session.session_id && eventSessionId !== session.session_id) {
              console.log('Sherlock WS: Chart event session mismatch, skipping');
              return prevChatContent;
            }

            const messages = [...session.messages];
            const aiIndex = messages.length - 1;
            if (aiIndex < 0 || messages[aiIndex].isUserMessage) return prevChatContent;

            // Duplicate prevention
            const currentCharts = Array.isArray(messages[aiIndex].chart_data) ? messages[aiIndex].chart_data : [];
            const isDuplicate = currentCharts.some(
              (chart) => chart?.chart_id && chart.chart_id === eventContent.chart_id
            );
            if (isDuplicate) {
              console.log('Sherlock WS: Duplicate chart, skipping', eventContent.chart_id);
              return prevChatContent;
            }

            messages[aiIndex] = {
              ...messages[aiIndex],
              chart_data: [...currentCharts, eventContent],
            };

            updated[sessionIdx] = { ...session, messages };
            console.log('Sherlock WS: Chart added to message', eventContent.chart_id);
            return updated;
          });
          mScrollToBottom(currentSessionIndexRef.current, false);
          return;
        }

        // Handle chart error
        if (eventType === 'chartError') {
          setChartLoadingState(null);
          setChartError({
            error: eventContent?.error || 'Failed to generate chart',
            chart_type: eventContent?.chart_type,
            title: eventContent?.title,
          });
          return;
        }

        // Handle deep research events
        if (eventType === 'deepResearch') {
          const contentType = eventContent?.type;
          console.log('Sherlock WS: Deep research event', { contentType, eventContent });

          // Update tool activity to show deep research progress
          if (contentType === 'deepResearchStarted' || contentType === 'deepResearchOptimizing' ||
              contentType === 'deepResearchSearching' || contentType === 'deepResearchAnalyzing') {
            const progressMessage = eventContent?.message || 'Deep research in progress...';
            setChatContent((prevChatContent) => {
              const updated = [...prevChatContent];
              const sessionIdx = currentSessionIndexRef.current;
              const session = updated[sessionIdx];
              if (!session) return prevChatContent;
              if (eventSessionId && session.session_id && eventSessionId !== session.session_id) {
                return prevChatContent;
              }

              const messages = [...session.messages];
              const aiIndex = messages.length - 1;
              if (aiIndex < 0 || messages[aiIndex].isUserMessage) return prevChatContent;

              messages[aiIndex] = {
                ...messages[aiIndex],
                tool_activity: progressMessage,
              };

              updated[sessionIdx] = { ...session, messages };
              return updated;
            });
          }

          // Deep research completed - clear tool activity
          if (contentType === 'deepResearchCompleted') {
            console.log('Sherlock WS: Deep research completed', {
              filePath: eventContent?.file_path,
              citationsCount: eventContent?.citations_count,
              durationSeconds: eventContent?.duration_seconds,
            });
            setChatContent((prevChatContent) => {
              const updated = [...prevChatContent];
              const sessionIdx = currentSessionIndexRef.current;
              const session = updated[sessionIdx];
              if (!session) return prevChatContent;
              if (eventSessionId && session.session_id && eventSessionId !== session.session_id) {
                return prevChatContent;
              }

              const messages = [...session.messages];
              const aiIndex = messages.length - 1;
              if (aiIndex < 0 || messages[aiIndex].isUserMessage) return prevChatContent;

              messages[aiIndex] = {
                ...messages[aiIndex],
                tool_activity: '', // Clear tool activity
              };

              updated[sessionIdx] = { ...session, messages };
              return updated;
            });
          }

          // Deep research error
          if (contentType === 'deepResearchError') {
            console.error('Sherlock WS: Deep research error', eventContent?.error);
            setChatContent((prevChatContent) => {
              const updated = [...prevChatContent];
              const sessionIdx = currentSessionIndexRef.current;
              const session = updated[sessionIdx];
              if (!session) return prevChatContent;
              if (eventSessionId && session.session_id && eventSessionId !== session.session_id) {
                return prevChatContent;
              }

              const messages = [...session.messages];
              const aiIndex = messages.length - 1;
              if (aiIndex < 0 || messages[aiIndex].isUserMessage) return prevChatContent;

              messages[aiIndex] = {
                ...messages[aiIndex],
                tool_activity: '', // Clear tool activity on error
              };

              updated[sessionIdx] = { ...session, messages };
              return updated;
            });
          }
          return;
        }
      },
    });

    sherlockWebSocket.connect(userId, currentSessionId);
  }, [
    currentSessionCharacter,
    currentSessionId,
    currentSessionIndexRef,
    mScrollToBottom,
    setChatContent,
    setChartLoadingState,
    setChartError,
    setIsLoading,
    manageProgressText,
  ]);
};

export default useSherlockProactiveConnection;
