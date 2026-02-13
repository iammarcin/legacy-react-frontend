import { triggerStreamingWSRequest } from '../services/api.websocket';
import sherlockWebSocket, { ConnectionState } from '../services/sherlock.websocket';
import { getOrCreateSherlockSession } from '../services/sherlock.api';
import {
  prepareChatHistory,
  prepareSettingsForWebsocketsRequest,
  prepareAudioUserInput
} from './streamingUtils';
import { getCustomerId, getTextModelName, getTextShowReasoning } from './configuration';
import { generateUUID } from './misc';

class AudioRecorder {
  constructor(options) {
    // Store config options
    this.getSettings = options.getSettings;
    this.onTranscriptionUpdate = options.onTranscriptionUpdate;
    this.onAiAnswerUpdate = options.onAiAnswerUpdate;
    this.onError = options.onError;
    this.onTTSFileUploaded = options.onTTSFileUploaded;

    // Callback to get current character info
    this.getCurrentCharacter = options.getCurrentCharacter;
    // Callback to get current session ID
    this.getSessionId = options.getSessionId;
    // Callback to persist session ID when created
    this.setSessionId = options.setSessionId;
    // Callback when Sherlock response received
    this.onSherlockResponse = options.onSherlockResponse;
    // Callback when processing complete
    this.onProcessingComplete = options.onProcessingComplete;
    // Callback for reasoning/thinking updates
    this.onReasoningUpdate = options.onReasoningUpdate;
    // Callback to get current attachments (images/files) at stop time
    this.getAttachments = options.getAttachments;

    // Current chat state
    this.chatContent = options.chatContent;
    this.currentSessionIndex = options.currentSessionIndex;

    // WebSocket connections
    this.audioWs = null;
    this.textWs = null;

    // State flags
    this.isRecording = false;
    this.isTranscriptionComplete = false;
    this.isWaitingForSherlockResponse = false;

    // Store the transcription text
    this.transcriptionText = '';

    // Sherlock WebSocket session
    this.sherlockSessionId = null;
    this.streamedResponse = '';
    this.streamedThinking = '';

    // Debug
    console.log("AudioRecorder initialized with options:", {
      currentSessionIndex: this.currentSessionIndex,
      hasTranscriptionCallback: !!this.onTranscriptionUpdate,
      hasAiAnswerCallback: !!this.onAiAnswerUpdate,
      hasGetCurrentCharacter: !!this.getCurrentCharacter
    });
  }

  /**
   * Check if current character uses Claude Code infrastructure (like Sherlock/Bugsy)
   * Uses isClaudeCodeCharacter flag from ChatCharacters.js (matches Kotlin implementation)
   */
  isClaudeCodeCharacter() {
    if (!this.getCurrentCharacter) {
      return false;
    }
    const character = this.getCurrentCharacter();
    if (!character) {
      return false;
    }
    return character.isClaudeCodeCharacter === true;
  }

  async start() {
    try {
      // Reset state for new recording
      this.isRecording = true;
      this.transcriptionText = '';
      this.isTranscriptionComplete = false;
      this.isWaitingForSherlockResponse = false;
      this.streamedResponse = '';
      this.streamedThinking = '';

      // For Claude Code characters, connect to Sherlock WebSocket FIRST
      // so we can receive the streaming response when it comes
      if (this.isClaudeCodeCharacter()) {
        await this.setupSherlockWebSocket();
      }

      // Start audio recording and streaming
      await this.startAudioRecording();
    } catch (error) {
      console.error("Failed to start recording:", error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  ensureSessionId() {
    let existingSessionId = this.getSessionId ? this.getSessionId() : null;
    if (!existingSessionId) {
      existingSessionId = generateUUID();
      if (this.setSessionId) {
        this.setSessionId(existingSessionId);
      }
    }
    return existingSessionId;
  }

  /**
   * Setup Sherlock WebSocket connection before audio recording
   * This ensures we're ready to receive the streaming response
   */
  async setupSherlockWebSocket() {
    const character = this.getCurrentCharacter ? this.getCurrentCharacter() : null;
    const characterName = character?.nameForAPI || 'sherlock';
    const userId = getCustomerId() ?? 1;

    console.log(`Sherlock audio: Setting up WebSocket for ${characterName}`);

    try {
      // Get or create a Sherlock session
      const existingSessionId = this.ensureSessionId();
      const { sessionId } = await getOrCreateSherlockSession(existingSessionId, characterName);
      if (sessionId && sessionId !== existingSessionId && this.setSessionId) {
        this.setSessionId(sessionId);
      }
      this.sherlockSessionId = sessionId;

      console.log(`Sherlock audio: Got session ${sessionId}`);

      // Setup WebSocket callbacks
      sherlockWebSocket.setCallbacks({
        onConnectionStateChange: (state) => {
          console.log(`Sherlock WS: Connection state changed to ${state}`);
        },
        onStreamStart: (data) => {
          console.log('Sherlock audio: Stream started');
          this.isWaitingForSherlockResponse = true;
          this.streamedResponse = '';
          this.streamedThinking = '';
          // Clear any placeholder text
          if (this.onAiAnswerUpdate) {
            this.onAiAnswerUpdate('');
          }
          if (this.onReasoningUpdate) {
            this.onReasoningUpdate('');
          }
        },
        onTextChunk: (content, sessionId) => {
          if (this.isWaitingForSherlockResponse) {
            this.streamedResponse += content;
            if (this.onAiAnswerUpdate) {
              // Pass accumulated response, not just the chunk
              this.onAiAnswerUpdate(this.streamedResponse);
            }
          }
        },
        onThinkingChunk: (content, sessionId) => {
          if (this.isWaitingForSherlockResponse && getTextShowReasoning()) {
            this.streamedThinking += content;
            if (this.onReasoningUpdate) {
              // Pass accumulated thinking, not just the chunk
              this.onReasoningUpdate(this.streamedThinking);
            }
          }
        },
        onStreamEnd: (data) => {
          console.log('Sherlock audio: Stream ended');
          this.isWaitingForSherlockResponse = false;

          // Use the full response if provided
          if (this.onSherlockResponse && data.message_id) {
            this.onSherlockResponse(this.streamedResponse, data.message_id, this.sherlockSessionId);
          }

          // Notify processing complete
          if (this.onProcessingComplete) {
            this.onProcessingComplete();
          }
        },
        onNotification: (data) => {
          console.log('Sherlock audio: Notification received', data);
          // Only process agent_to_user messages (not heartbeats or user echoes)
          if (data.direction !== 'agent_to_user' || data.is_heartbeat_ok) {
            console.log('Sherlock audio: Skipping notification (not agent response)');
            return;
          }

          // Handle complete message notification (alternative to streaming)
          this.isWaitingForSherlockResponse = false;

          // Update UI with the complete response
          if (this.onAiAnswerUpdate && data.content) {
            this.onAiAnswerUpdate(data.content);
          }

          // Update reasoning if available
          if (this.onReasoningUpdate && data.ai_reasoning && getTextShowReasoning()) {
            this.onReasoningUpdate(data.ai_reasoning);
          }

          // Notify that response is complete
          if (this.onSherlockResponse && data.message_id) {
            this.onSherlockResponse(data.content || '', data.message_id, this.sherlockSessionId);
          }

          // Notify processing complete
          if (this.onProcessingComplete) {
            this.onProcessingComplete();
          }
        },
        onError: (error) => {
          console.error('Sherlock WS error:', error);
          if (this.onError) {
            this.onError(error);
          }
        },
      });

      // Connect to WebSocket
      sherlockWebSocket.connect(userId, sessionId);

      // Wait briefly for connection to establish
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!sherlockWebSocket.isConnected()) {
        console.log('Sherlock audio: WebSocket not yet connected, proceeding anyway');
      }
    } catch (error) {
      console.error('Sherlock audio: Failed to setup WebSocket:', error);
      // Continue with recording - backend will still process, we just might not get streaming
    }
  }

  stop() {
    console.log("Stopping audio recording");
    this.isRecording = false;

    // First stop the MediaRecorder - this triggers onstop which sends RecordingFinished signal
    if (this.stopAudioRecording) {
      this.stopAudioRecording();
    }

    // DON'T close the WebSocket here - let it stay open for transcription to complete
    // The WebSocket will be closed after transcription completes in createAudioWebSocket's handlers
  }

  async startAudioRecording() {
    console.log("Starting audio recording");

    try {
      // Get audio stream from user microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Create WebSocket for audio streaming
      this.audioWs = this.createAudioWebSocket();

      // Use Web Audio API to capture raw PCM samples (linear16)
      // MediaRecorder sends compressed audio (webm/opus) which Deepgram can't decode when expecting linear16
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      const source = audioContext.createMediaStreamSource(stream);

      // Create a ScriptProcessorNode to capture raw audio samples
      // Buffer size of 4096 gives good balance between latency and efficiency
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (!this.isRecording || !this.audioWs || this.audioWs.readyState !== WebSocket.OPEN) {
          return;
        }

        // Get raw PCM samples (float32)
        const inputData = event.inputBuffer.getChannelData(0);

        // Convert float32 to int16 (linear16 format that Deepgram expects)
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp and convert float [-1, 1] to int16 [-32768, 32767]
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send raw PCM bytes
        this.audioWs.send(int16Data.buffer);
      };

      // Connect the audio graph
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Store references for cleanup
      this.audioContext = audioContext;
      this.audioProcessor = processor;
      this.audioSource = source;
      this.mediaStream = stream;

      // Create a stopper function
      this.stopAudioRecording = () => {
        console.log("stopAudioRecording called");

        // Disconnect audio nodes
        if (this.audioProcessor) {
          this.audioProcessor.disconnect();
          this.audioProcessor = null;
        }
        if (this.audioSource) {
          this.audioSource.disconnect();
          this.audioSource = null;
        }
        if (this.audioContext) {
          this.audioContext.close();
          this.audioContext = null;
        }

        // Stop all tracks
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach(track => track.stop());
          this.mediaStream = null;
        }

        // Send a final message to signal recording end if WebSocket is still open
        if (this.audioWs && this.audioWs.readyState === WebSocket.OPEN) {
          try {
            // Build RecordingFinished payload, including any attachments added during recording
            const finishPayload = { type: "RecordingFinished" };

            // Get current attachments from the UI (images and files that may have been added during recording)
            if (this.getAttachments) {
              const attachments = this.getAttachments();
              if (attachments && attachments.length > 0) {
                // Format attachments in the same prompt format the backend expects
                // This matches the format used in streamingUtils.js prepareUserPrompt()
                const finalAttachments = attachments.map(attachment => {
                  if (attachment.type === 'image') {
                    return { type: "image_url", image_url: { url: attachment.url } };
                  } else if (attachment.type === 'file') {
                    return { type: "file_url", file_url: { url: attachment.url } };
                  }
                  return null;
                }).filter(Boolean);

                if (finalAttachments.length > 0) {
                  finishPayload.final_attachments = finalAttachments;
                  console.log(`RecordingFinished includes ${finalAttachments.length} final attachments`);
                }
              }
            }

            this.audioWs.send(JSON.stringify(finishPayload));
            console.log("Sent RecordingFinished signal", finishPayload);
          } catch (error) {
            console.error("Error sending recording finished signal:", error);
          }
        }
      };
    } catch (error) {
      console.error("Error starting audio recording:", error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  createAudioWebSocket() {
    console.log("Creating audio WebSocket");

    // Get character info for the userInput payload
    const character = this.getCurrentCharacter ? this.getCurrentCharacter() : null;
    const characterName = character?.nameForAPI || 'assistant';
    const aiTextGenModel = getTextModelName();

    // Build userInput payload like Kotlin does - required for persistence
    const userInput = prepareAudioUserInput({
      chatContent: this.chatContent,
      currentSessionIndex: this.currentSessionIndex,
      characterName: characterName,
      aiTextGenModel: aiTextGenModel
    });

    console.log("Audio WebSocket userInput:", userInput);

    return triggerStreamingWSRequest({
      endpoint: "chat/ws",
      mode: "audio",
      userInput: userInput,  // Pass the userInput payload
      userSettings: prepareSettingsForWebsocketsRequest(this.getSettings, "audio"),
      onOpen: (event) => {
        console.log("Audio WebSocket connection opened");
      },
      onMessage: (data) => {
        try {
          console.log("Audio WebSocket message received:", data);

          // Handle transcription updates (object with type property)
          if (data && typeof data === 'object') {
            const msgType = data.type;
            const transcriptionText = data.transcriptionText || data.content || data.text;

            if ((msgType === "transcriptionInProgress" || msgType === "transcription") && transcriptionText) {
              // Append transcription chunks (backend sends incremental text)
              // Only replace if this is the first chunk (replacing "Recording...")
              if (!this.transcriptionText || this.transcriptionText === '') {
                this.transcriptionText = transcriptionText;
              } else {
                // Append with space if needed
                const needsSpace = !this.transcriptionText.endsWith(' ') && !transcriptionText.startsWith(' ');
                this.transcriptionText = this.transcriptionText + (needsSpace ? ' ' : '') + transcriptionText;
              }
              console.log("Transcription update:", this.transcriptionText);

              // Update UI with accumulated transcription
              if (this.onTranscriptionUpdate) {
                this.onTranscriptionUpdate(this.transcriptionText);
              }
            }
            else if (msgType === "transcriptionComplete" && transcriptionText) {
              // Final transcription - use the complete text from backend (it's already accumulated)
              this.transcriptionText = transcriptionText;
              console.log("Transcription complete:", this.transcriptionText);

              // Update UI with final transcription
              if (this.onTranscriptionUpdate) {
                this.onTranscriptionUpdate(this.transcriptionText);
              }

              // Mark transcription as complete
              this.isTranscriptionComplete = true;

              // For Claude Code characters, close WebSocket and use REST polling
              // For standard characters, keep WebSocket open - AI response comes through same WS
              if (this.isClaudeCodeCharacter()) {
                // Stop the audio recording
                if (this.stopAudioRecording) {
                  this.stopAudioRecording();
                }

                // Close the audio WebSocket
                if (this.audioWs) {
                  this.audioWs.close();
                  this.audioWs = null;
                }

                // Start text generation via REST polling
                this.startTextGeneration();
              }
              // For standard characters, WebSocket stays open for AI response
            }
          }
          // Handle AI response text chunks (strings) - standard workflow sends text through same WS
          else if (typeof data === 'string' && data.trim() !== '') {
            console.log("AI response chunk received:", data);

            // Update AI answer
            if (this.onAiAnswerUpdate) {
              this.onAiAnswerUpdate(data);
            }
          }
        } catch (error) {
          console.error("Error handling audio WebSocket message:", error);
        }
      },
      onStreamEnd: (fullResponse) => {
        console.log("Audio WebSocket stream ended");

        // Close the WebSocket if still open
        if (this.audioWs) {
          this.audioWs.close();
          this.audioWs = null;
        }

        // For Claude Code characters, DON'T call onProcessingComplete here
        // The processing completes when we receive stream_end via Sherlock WebSocket
        if (!this.isClaudeCodeCharacter()) {
          if (this.onProcessingComplete) {
            this.onProcessingComplete();
          }
        }
      },
      onCustomEvent: (event) => {
        console.log("Audio WebSocket custom event:", event);

        // Handle claudeCodeQueued event
        if (event.type === "claudeCodeQueued" || event.content?.type === "claudeCodeQueued") {
          console.log("Claude Code message queued, waiting for Sherlock WebSocket response");
          // The response will come via the Sherlock WebSocket that was set up in setupSherlockWebSocket()
          // Don't close the audio WebSocket yet - it might still be needed

          // Update the session ID if provided
          const content = event.content || event;
          if (content.session_id && !this.sherlockSessionId) {
            this.sherlockSessionId = content.session_id;
            console.log("Updated Sherlock session ID from claudeCodeQueued:", this.sherlockSessionId);
          }
        }

        // Handle reasoning/thinking events for standard audio workflow
        const eventContent = event.content || event;
        if (eventContent?.type === "reasoning" && eventContent.message === "reasoningReceived" && eventContent.reasoning) {
          console.log("Audio WS: Reasoning chunk received:", eventContent.reasoning.substring(0, 50) + "...");
          if (getTextShowReasoning()) {
            this.streamedThinking += eventContent.reasoning;
            if (this.onReasoningUpdate) {
              this.onReasoningUpdate(this.streamedThinking);
            }
          }
        }
      },
      onError: (error) => {
        console.error("Audio WebSocket error:", error);
        if (this.onError) {
          this.onError(error);
        }
      },
      onClose: (event) => {
        console.log("Audio WebSocket closed");
      }
    });
  }

  startTextGeneration() {
    console.log("Starting text generation with transcription:", this.transcriptionText);

    try {
      if (!this.transcriptionText || this.transcriptionText.trim() === '') {
        console.warn("Empty transcription, not starting text generation");
        return;
      }

      // Check if this is a Claude Code character (Sherlock, Bugsy)
      if (this.isClaudeCodeCharacter()) {
        console.log("Using Claude Code REST polling for audio transcription");
        this.startClaudeCodeTextGeneration();
        return;
      }

      // Standard WebSocket flow for other characters
      // Prepare chat history and user prompt for text generation
      const chatHistory = prepareChatHistory(
        this.chatContent,
        this.currentSessionIndex
      );

      // Create a simulated user message with the transcribed text
      const simulatedUserPrompt = [
        { type: "text", text: this.transcriptionText }
      ];

      // Get character info from current session
      // eslint-disable-next-line no-unused-vars
      const currentSession = this.chatContent[this.currentSessionIndex];

      // Create the WebSocket for text generation
      console.log("Creating text WebSocket for AI response generation");
      this.textWs = triggerStreamingWSRequest({
        endpoint: "chat/ws",
        mode: "text",
        rawPayload: {
          request_type: "text",
          user_input: {
            prompt: simulatedUserPrompt,
            chat_history: chatHistory
          },
          asset_input: [],
          user_settings: prepareSettingsForWebsocketsRequest(this.getSettings, "text"),
          customer_id: getCustomerId() ?? 1
        },
        onChunkReceived: (chunk) => {
          console.log("Received text chunk:", chunk);

          // Update UI with AI response
          if (this.onAiAnswerUpdate) {
            this.onAiAnswerUpdate(chunk);
          }
        },
        onStreamEnd: (fullResponse) => {
          console.log("Text generation complete");
          if (this.onProcessingComplete) {
            this.onProcessingComplete();
          }
        },
        onStreamingError: (error) => {
          console.error("Text generation error:", error);
          if (this.onError) {
            this.onError(error);
          }
        }
      });
    } catch (error) {
      console.error("Error starting text generation:", error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Handle text generation for Claude Code characters (Sherlock, Bugsy)
   *
   * IMPORTANT: The backend's audio_intercept.py already queued the message to SQS
   * when it received the audio transcription. We should NOT send another message here.
   *
   * Instead, we just wait for the streaming response via the Sherlock WebSocket
   * which was set up in setupSherlockWebSocket() before recording started.
   */
  async startClaudeCodeTextGeneration() {
    const character = this.getCurrentCharacter ? this.getCurrentCharacter() : null;
    const characterName = character?.name || 'Sherlock';

    console.log(`Sherlock audio: Backend already queued message, waiting for WebSocket response`);

    // Update AI placeholder with initial status
    if (this.onAiAnswerUpdate) {
      this.onAiAnswerUpdate(`${characterName} is investigating...`);
    }

    // The response will come via the Sherlock WebSocket which was set up in setupSherlockWebSocket()
    // The callbacks will handle: onStreamStart, onTextChunk, onStreamEnd

    // If WebSocket is not connected, the message was still queued to SQS by backend
    // User will see the response next time they load the session
    if (!sherlockWebSocket.isConnected()) {
      console.warn('Sherlock audio: WebSocket not connected. Response will be available on reload.');
      // Show a message to the user
      if (this.onAiAnswerUpdate) {
        this.onAiAnswerUpdate(`${characterName} received your message. Response loading...`);
      }
    }
  }
}


export default AudioRecorder;
