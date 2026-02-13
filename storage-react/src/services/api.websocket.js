/**
 * api.websocket.js - WebSocket connection management
 *
 * Provides WebSocket-based streaming for chat and audio:
 * - triggerStreamingWSRequest - Generic WebSocket streaming
 * - triggerStreamingWSTextRequest - Text chat streaming wrapper
 * - getWebSocketUrl - URL builder with auth token
 *
 * Payload structure prepared by streamingUtils.js
 * Business logic in call.chat.api.js
 */

// Config
import config from '../config';
import { ResilientWebSocket, ConnectionState } from './resilient.websocket';

// Known WebSocket event types - single source of truth
const KNOWN_EVENTS = new Set([
  'websocket_ready', 'connected', 'closing', 'ping', 'working',
  'stream_start', 'text_chunk', 'thinking_chunk', 'text_completed', 'text_not_requested',
  'tts_started', 'audio_chunk', 'tts_generation_completed',
  'tts_completed', 'tts_not_requested', 'tts_file_uploaded', 'tts_error',
  'stream_error', 'error',
  'tool_start', 'tool_result',
  'db_operation_executed', 'message_sent', 'send_error',
  'transcription', 'transcription_in_progress', 'transcription_complete',
  'translation', 'recording_stopped',
  'sync_complete', 'sync_error', 'notification',
  'custom_event',
  'turn.user_speaking', 'turn.ai_thinking', 'turn.ai_responding',
  'turn.completed', 'turn.persisted', 'session.closed', 'control',
  'claude_code_queued', 'cancelled'
]);

// Utils
import { getAuthTokenForBackend, getCustomerId, setURLForAPICalls } from '../utils/configuration';

// Export ConnectionState for use in components
export { ConnectionState };

/*
  getWebSocketUrl:
  Constructs a WebSocket URL from a given endpoint by replacing the HTTP protocol with WS,
  and appending the authorization token as a query parameter if available.
*/
export const getWebSocketUrl = (endpoint) => {
  let wsUrl = endpoint.replace(/^http/, 'ws');
  console.log("wsUrl: ", wsUrl);
  const authToken = getAuthTokenForBackend();
  if (authToken) {
    wsUrl += (wsUrl.indexOf('?') === -1 ? '?' : '&') + 'token=' + authToken;
  }
  return wsUrl;
};

// Create a wrapper for triggerStreamingWSRequest specifically for text-based requests
export const triggerStreamingWSTextRequest = (options) => {
  const {
    endpoint,
    requestType,
    userInput,
    assetInput,
    getSettings,
    // eslint-disable-next-line no-unused-vars
    chatContent,
    // eslint-disable-next-line no-unused-vars
    currentSessionIndex,
    // eslint-disable-next-line no-unused-vars
    aiMessageIndex,
    // eslint-disable-next-line no-unused-vars
    editMessagePosition,
    attachedImages = [],
    attachedFiles = [],
    onChunkReceived,
    onStreamEnd,
    onStreamingError,
    onCustomEvent,
    onDBOperationExecuted,
    onReady,
    onBackendStatus,
    onBackendError
  } = options;

  // Get the user settings
  const userSettings = getSettings ? getSettings() : {};

  return triggerStreamingWSRequest({
    endpoint,
    mode: "text",
    requestType,
    userInput,
    assetInput,
    userSettings,
    attachedImages,
    attachedFiles,
    onChunkReceived,
    onStreamEnd,
    onStreamingError,
    onCustomEvent,
    onDBOperationExecuted,
    onReady,
    onBackendStatus,
    onBackendError
  });
};

/*
  triggerStreamingWSRequest:
  Creates a unified WebSocket connection for streaming API requests.
  It supports both text-based and audio-based streaming by parametrizing the mode.
  If a rawPayload is provided (for example pre-built via helper functions like
  prepareUserInputForWebsocketsRequest), then that payload will be sent as-is.

  For text mode (default):
    - Prepares the final user input (combining text and any attached media).
    - Sends a payload including requestType, userInput, assetInput, userSettings, and customerId.
    - Uses onChunkReceived, onStreamEnd, and onStreamingError callbacks.
  
  For audio mode:
    - Sets ws.binaryType to "arraybuffer" so that binary audio data is handled correctly.
    - Sends an initial payload with requestType "audio", assetInput, userSettings, and customerId.
    - Uses onOpen, onMessage, onError, and onClose callbacks.
  
  Options parameter should include:
    • endpoint: WebSocket endpoint (string)
    • mode: "text" (default) or "audio"

  Text mode options:
    • requestType, userInput, attachedImages, attachedFiles, userSettings,
      onChunkReceived, onStreamEnd, onStreamingError

  Audio mode options:
    • userSettings, customerId (default 1), onOpen, onMessage, onError, onClose
*/
export const triggerStreamingWSRequest = (options) => {
  const {
    endpoint,
    mode = "text",
    userSettings,
    customerId,
    rawPayload,
    onReady,
    onBackendStatus,
    onBackendError
  } = options;

  setURLForAPICalls();
  // Construct full endpoint URL
  const fullEndpoint = `${config.apiEndpoint}/${endpoint}`;
  const wsUrl = getWebSocketUrl(fullEndpoint);
  //console.log(`Creating WebSocket connection to ${wsUrl} in ${mode} mode`);

  let handshakeComplete = mode !== "text";
  let pendingInitialPayload = null;
  let streamEnded = false;

  // Dual-flag completion pattern - both text and TTS must complete
  let textCompleted = false;
  let ttsCompleted = false;

  // Store initial payload to resend on reconnection
  let initialPayload = null;

  const flushInitialPayload = (wsInstance) => {
    if (handshakeComplete && pendingInitialPayload) {
      wsInstance.send(pendingInitialPayload);
      pendingInitialPayload = null;
    }
  };

  const handleStreamEnd = (payload) => {
    if (streamEnded) {
      return;
    }
    streamEnded = true;
    if (options.onStreamEnd) {
      options.onStreamEnd(payload);
    }
  };

  // Check if both text and TTS are complete (dual-flag pattern)
  const checkCompletion = (payload) => {
    if (textCompleted && ttsCompleted) {
      handleStreamEnd(payload);
    }
  };

  // Use ResilientWebSocket for auto-reconnection and stream resumption
  const rws = new ResilientWebSocket(wsUrl, {
    onOpen: (event) => {
      // Handle WebSocket open event
      handleOpen(event, rws);
    },
    onMessage: (data, event) => {
      // Handle incoming messages
      handleMessage(data, event, rws);
    },
    onError: (event) => {
      // Handle errors
      handleError(event);
    },
    onClose: (event) => {
      // Handle close
      handleClose(event);
    },
    onReconnecting: (attemptNumber) => {
      console.log(`WebSocket reconnecting (attempt ${attemptNumber})...`);
      // Notify user via optional callback
      if (options.onReconnecting) {
        options.onReconnecting(attemptNumber);
      }
    },
    onReconnected: () => {
      console.log('WebSocket reconnected, resuming stream...');
      // Resend initial payload if stream was interrupted
      if (initialPayload && !streamEnded) {
        console.log('Resending initial payload after reconnection');
        handshakeComplete = false;
        pendingInitialPayload = initialPayload;
        flushInitialPayload(rws);
      }
      // Notify user via optional callback
      if (options.onReconnected) {
        options.onReconnected();
      }
    },
  });

  if (mode === "audio") {
    // Ensure that binary data is handled correctly for audio
    rws.binaryType = "arraybuffer";
    console.log("Set WebSocket binaryType to arraybuffer for audio mode");
  }

  // Define event handlers as functions (to be called by ResilientWebSocket)
  const handleOpen = (event, wsInstance) => {
    let payload;
    if (rawPayload) {
      // If rawPayload is provided, use it directly
      // We're assuming the caller has already structured it correctly
      payload = rawPayload;

      // Make sure we log full details of the raw payload for debugging
      console.log(`Using structured payload for ${mode} mode:`, payload);
    } else if (mode === "audio") {
      // Audio streaming payload - use provided userInput for persistence
      // Backend needs user_input with session_id, user_message, ai_response for DB storage
      payload = {
        request_type: mode,
        user_input: options.userInput || {},  // Use passed userInput for persistence
        asset_input: [],
        user_settings: userSettings,
        customer_id: customerId || getCustomerId() || 1
      };
    } else {
      // For now, use the userInput provided directly from the caller
      // In Milestone 2, the caller will use streamingUtils.js to prepare this properly
      const finalUserInput = options.userInput ?? {};

      const resolvedCustomerId = customerId || getCustomerId() || 1;
      const resolvedSettings = userSettings || {};

      // Build the userInput object that mirrors Kotlin's structure
      const userInputPayload = {
        ...finalUserInput,
        customer_id: resolvedCustomerId
      };

      // Build the top-level payload with only necessary fields (no duplicates)
      payload = {
        request_type: options.requestType || "text",
        user_input: userInputPayload,
        asset_input: options.assetInput || [],
        user_settings: resolvedSettings,
        customer_id: resolvedCustomerId
      };

      console.log("Final text WebSocket payload:", payload);
    }

    console.log(`${mode} WS connection opened. Sending payload:`, payload);

    // Store for reconnection
    initialPayload = JSON.stringify(payload);

    if (mode === "audio") {
      wsInstance.send(initialPayload);
    } else {
      pendingInitialPayload = initialPayload;
      flushInitialPayload(wsInstance);
    }

    if (mode === "audio" && options.onOpen) {
      options.onOpen(event);
    }
  };

  const handleMessage = (data, event, wsInstance) => {
    let parsedData;
    try {
      // ResilientWebSocket already parsed JSON for us
      const rawData = typeof data === 'object' ? data : (typeof data === 'string' ? JSON.parse(data) : data);
      //console.log("Received WebSocket data:", rawData);

      // Handle different message types
      if (rawData && typeof rawData === 'object') {
        // No fallback for messageType - only use type field
        const messageType = typeof rawData.type === 'string' ? rawData.type : undefined;

        // Log unknown events - never silently drop
        if (messageType && !KNOWN_EVENTS.has(messageType)) {
          console.error(
            `UNKNOWN_WS_EVENT: type='${messageType}' payload=`,
            JSON.stringify(rawData).slice(0, 500)
          );
          return;
        }

        let handled = false;

        if (messageType === "websocket_ready") {
          console.log("WebSocket backend reported ready state", rawData);
          if (!handshakeComplete) {
            handshakeComplete = true;
            flushInitialPayload(wsInstance);
          }
          handled = true;
          if (typeof onReady === "function") {
            onReady(rawData);
          }
          return;
        }

        if (messageType === "working") {
          console.log("Backend acknowledged request is working", rawData);
          handled = true;
          if (typeof onBackendStatus === "function") {
            onBackendStatus(rawData);
          }
        } else if (messageType === "error" || messageType === "stream_error") {
          console.error("Backend reported streaming error", rawData);
          handled = true;
          if (typeof options.onStreamingError === "function") {
            options.onStreamingError(rawData);
          }
          if (typeof onBackendError === "function") {
            onBackendError(rawData);
          }
          return;
        }

        if (messageType === "text_chunk" && rawData.content !== undefined) {
          // Text type messages - only pass the content string for text UI updates
          parsedData = rawData.content;
          handled = true;
        } else if (messageType === "db_operation_executed" && rawData.content) {
          // Handle database operation executed message from backend
          console.log("Database operation executed:", rawData.content);

          // Parse the content if it's a JSON string
          const dbResult = typeof rawData.content === 'string'
            ? JSON.parse(rawData.content)
            : rawData.content;

          handled = true;
          if (options.onDBOperationExecuted) {
            options.onDBOperationExecuted(dbResult);
          }
          return; // Skip regular message handling
        } else if (
          messageType === "transcription_in_progress" ||
          messageType === "transcription_complete" ||
          messageType === "transcription"
        ) {
          // Transcription messages for audio processing - pass the entire object
          // Backend may send "transcription" type for interim updates
          parsedData = rawData;
          handled = true;
        } else if (messageType === "tts_not_requested") {
          // TTS was not enabled - set TTS completion flag (dual-flag pattern)
          console.log("TTS not requested for this message");
          ttsCompleted = true;
          checkCompletion(rawData);
          handled = true;
          return;
        } else if (messageType === "tts_completed") {
          // TTS generation complete - set TTS completion flag (dual-flag pattern)
          console.log("TTS generation complete");
          ttsCompleted = true;
          checkCompletion(rawData);
          handled = true;
          return;
        } else if (messageType === "tts_file_uploaded" && rawData.content) {
          // Handle TTS file upload - content.audio_url contains the audio URL
          const audioUrl = rawData.content.audio_url || rawData.content;
          console.log("TTS file uploaded:", audioUrl);
          handled = true;
          if (mode === "audio" && options.onTTSFileUploaded) {
            options.onTTSFileUploaded(audioUrl);
          }
          return; // Skip sending to text handlers
        } else if (messageType === "tts_error") {
          // TTS error - set TTS completion flag to prevent hanging (dual-flag pattern)
          console.log("TTS error:", rawData.content);
          ttsCompleted = true;
          checkCompletion(rawData);
          handled = true;
          return;
        } else if (messageType === "text_completed") {
          // Text generation complete - set text completion flag (dual-flag pattern)
          console.log("Text generation complete");
          textCompleted = true;
          checkCompletion(rawData);
          handled = true;
          return;
        } else if (messageType === "claude_code_queued") {
          // Claude Code character audio message was queued to SQS
          // Response will come via proactive-agent WebSocket, NOT this WebSocket
          console.log("Claude Code message queued:", rawData.content);
          handled = true;
          // Pass to custom event handler so audio recorder knows to wait for Sherlock WS
          if (options.onCustomEvent) {
            options.onCustomEvent({
              type: "claude_code_queued",
              content: rawData.content
            });
          }
          // DO NOT call handleStreamEnd - we're waiting for proactive-agent WebSocket
          return;
        } else if (messageType === "thinking_chunk") {
          // Direct thinking/reasoning message
          // Convert to custom_event format for consistent handling
          console.log("Direct thinking message received, length:", rawData.content?.length || 0);
          handled = true;
          if (options.onCustomEvent) {
            options.onCustomEvent({
              type: "custom_event",
              content: {
                type: "reasoning",
                message: "reasoningReceived",
                reasoning: rawData.content
              }
            });
          }
          return;
        } else if (messageType === "custom_event") {
          handled = true;
          if (options.onCustomEvent) {
            options.onCustomEvent(rawData);
          }
          return;
        } else if (rawData.chunk !== undefined) {
          // Legacy chunk format - log as unknown event (no silent fallbacks)
          console.error(
            `UNKNOWN_WS_FORMAT: rawData.chunk payload=`,
            JSON.stringify(rawData).slice(0, 500)
          );
          return;
        }

        if (!handled) {
          console.log("Ignoring non-handled message type:", messageType || "unknown");
          return; // Skip sending to handlers
        }
      } else {
        // Not an object, use as is (e.g. binary data for audio mode)
        parsedData = rawData;
      }
    } catch (error) {
      // If it's not valid JSON, use the raw data
      console.log("Error parsing WebSocket data:", error);
      parsedData = event.data;
    }

    // Only call handlers if we have data to pass
    if (parsedData !== undefined) {
      if (mode === "audio") {
        if (options.onMessage) {
          options.onMessage(parsedData);
        }
      } else {
        if (options.onChunkReceived) {
          options.onChunkReceived(parsedData);
        }
      }
    }
  };

  const handleError = (event) => {
    console.error(`WebSocket error in ${mode} mode:`, event);
    if (mode === "audio") {
      if (options.onError) options.onError(event);
    } else {
      if (options.onStreamingError) options.onStreamingError(event);
    }
  };

  const handleClose = (event) => {
    console.log(`WebSocket closed in ${mode} mode:`, event);
    if (mode === "audio") {
      if (options.onClose) options.onClose(event);
    } else {
      // Only call handleStreamEnd if connection closed permanently (not reconnecting)
      if (rws.getConnectionState() !== ConnectionState.RECONNECTING) {
        handleStreamEnd(event);
      }
    }
  };

  return rws;
};

/**
 * Creates a generic WebSocket connection with provided event handlers.
 *
 * NOTE: This is a low-level utility. For chat streaming, use
 * triggerStreamingWSRequest or triggerStreamingWSTextRequest instead.
 *
 * Use this only for custom WebSocket connections outside the chat flow.
 *
 * @param {string} url - WebSocket URL to connect to
 * @param {Object} handlers - Event handlers
 * @param {Function} handlers.onOpen - Called when connection opens
 * @param {Function} handlers.onMessage - Called when message is received
 * @param {Function} handlers.onError - Called when error occurs
 * @param {Function} handlers.onClose - Called when connection closes
 * @returns {WebSocket} - The WebSocket instance
 */
export const createWebSocketConnection = (url, { onOpen, onMessage, onError, onClose } = {}) => {
  const ws = new WebSocket(url);

  ws.onopen = (event) => {
    if (onOpen) {
      onOpen(event);
    }
  };

  ws.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      data = event.data;
    }
    if (onMessage) {
      onMessage(data);
    }
  };

  ws.onerror = (event) => {
    if (onError) {
      onError(event);
    }
  };

  ws.onclose = (event) => {
    if (onClose) {
      onClose(event);
    }
  };

  return ws;
}; 
