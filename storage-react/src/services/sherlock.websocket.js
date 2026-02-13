/**
 * sherlock.websocket.js - WebSocket client for Sherlock proactive-agent
 *
 * Manages persistent WebSocket connection to the UNIFIED /chat/ws?mode=proactive
 * endpoint for receiving real-time streaming responses and notifications from
 * Claude Code characters (Sherlock, Bugsy).
 *
 * This is the React equivalent of Kotlin's SherlockWebSocket.kt
 *
 * UNIFIED ENDPOINT:
 * - Uses /chat/ws?mode=proactive instead of /api/v1/proactive-agent/ws/notifications
 * - Same functionality, simpler architecture
 */

import config from '../config';
import { getAuthTokenForBackend, getCustomerId } from '../utils/configuration';

// Known WebSocket event types - single source of truth
const KNOWN_EVENTS = new Set([
  'websocket_ready', 'connected', 'closing', 'ping', 'working',
  'stream_start', 'text_chunk', 'thinking_chunk', 'text_completed', 'text_not_requested',
  'tts_started', 'audio_chunk', 'tts_generation_completed',
  'tts_completed', 'tts_not_requested', 'tts_file_uploaded', 'tts_error',
  'stream_error', 'stream_end', 'error',
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

// Connection states
export const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
};

// Reconnection configuration
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 60000;
const RECONNECT_BACKOFF_MULTIPLIER = 2.0;
const MAX_CONSECUTIVE_FAILURES = 5;
const PING_TIMEOUT_MS = 35000; // Should receive ping within 35s (server sends every 30s)

class SherlockWebSocketService {
  constructor() {
    this.ws = null;
    this.connectionState = ConnectionState.DISCONNECTED;
    this.userId = null;
    this.sessionId = null;
    this.clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    this.serverId = null;
    this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    this.consecutiveFailures = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.lastSeenAt = null;

    // Track message IDs we've sent (for deduplication)
    // When we send a message, we add the message_id here.
    // When a notification arrives, if the ID is in this set, we skip it.
    this.sentMessageIds = new Set();

    // Pending send state (for WebSocket-based sending)
    this._pendingSend = null;
    this.pendingMessages = [];  // Queue for offline resilience

    // Callbacks
    this.onConnectionStateChange = null;
    this.onStreamStart = null;
    this.onTextChunk = null;
    this.onThinkingChunk = null;
    this.onStreamEnd = null;
    this.onNotification = null;
    this.onUserMessage = null;  // New: for user messages from other clients
    this.onToolStart = null;    // Tool execution started
    this.onToolResult = null;   // Tool execution completed
    this.onCustomEvent = null;  // Custom events (deep research completion, etc.)
    this.onError = null;
    this.onStreamError = null;  // Stream error from poller (rate_limit, context_too_long, etc.)
  }

  /**
   * Mark a message ID as sent by this client (for deduplication)
   */
  markMessageAsSent(messageId) {
    if (messageId) {
      this.sentMessageIds.add(messageId);
      console.log('Sherlock WS: Marked message as sent:', messageId);
    }
  }

  /**
   * Check if a message was sent by this client (for deduplication)
   * Returns true and removes from set if it was sent by us
   */
  wasMessageSentByMe(messageId) {
    if (this.sentMessageIds.has(messageId)) {
      this.sentMessageIds.delete(messageId);
      console.log('Sherlock WS: Message was sent by us, skipping:', messageId);
      return true;
    }
    return false;
  }

  /**
   * Clear sent message IDs (e.g., on session change)
   */
  clearSentMessageIds() {
    this.sentMessageIds.clear();
  }

  /**
   * Build WebSocket URL for proactive mode (Claude Code characters)
   *
   * Uses UNIFIED endpoint: /chat/ws?mode=proactive
   */
  buildWebSocketUrl(userId, sessionId) {
    const baseUrl = config.apiEndpoint.endsWith('/')
      ? config.apiEndpoint.slice(0, -1)
      : config.apiEndpoint;

    // Convert http(s) to ws(s)
    const wsBase = baseUrl.replace(/^http/, 'ws');

    // Build URL with mode=proactive parameter (unified endpoint)
    // Include client_id to prevent connection replacement loops (see handbook Section 17)
    let url = `${wsBase}/chat/ws?mode=proactive&user_id=${userId}&session_id=${sessionId}&client_id=${this.clientId}`;

    // Add auth token if available
    const token = getAuthTokenForBackend();
    if (token) {
      url += `&token=${encodeURIComponent(token)}`;
    }

    return url;
  }

  /**
   * Set event callbacks
   */
  setCallbacks({
    onConnectionStateChange,
    onStreamStart,
    onTextChunk,
    onThinkingChunk,
    onStreamEnd,
    onNotification,
    onUserMessage,
    onToolStart,
    onToolResult,
    onCustomEvent,
    onError,
    onStreamError,
  }) {
    this.onConnectionStateChange = onConnectionStateChange;
    this.onStreamStart = onStreamStart;
    this.onTextChunk = onTextChunk;
    this.onThinkingChunk = onThinkingChunk;
    this.onStreamEnd = onStreamEnd;
    this.onNotification = onNotification;
    this.onUserMessage = onUserMessage;
    this.onToolStart = onToolStart;
    this.onToolResult = onToolResult;
    this.onCustomEvent = onCustomEvent;
    this.onError = onError;
    this.onStreamError = onStreamError;
  }

  /**
   * Update connection state and notify listeners
   */
  setConnectionState(state) {
    if (this.connectionState !== state) {
      console.log(`Sherlock WS: State changed from ${this.connectionState} to ${state}`);
      this.connectionState = state;
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    }
  }

  /**
   * Connect to Sherlock WebSocket
   */
  connect(userId, sessionId) {
    if (!userId || !sessionId) {
      console.error('Sherlock WS: userId and sessionId are required');
      return;
    }

    // Don't reconnect if already connected with same params
    if (this.ws &&
        this.connectionState === ConnectionState.CONNECTED &&
        this.userId === userId &&
        this.sessionId === sessionId) {
      console.log('Sherlock WS: Already connected');
      return;
    }

    this.userId = userId;
    this.sessionId = sessionId;

    // Close existing connection
    this.closeConnection();

    this.setConnectionState(ConnectionState.CONNECTING);
    const url = this.buildWebSocketUrl(userId, sessionId);
    console.log(
      'Sherlock WS: Connecting',
      { client_id: this.clientId, user_id: userId, session_id: sessionId },
      url.replace(/token=[^&]+/, 'token=***')
    );

    try {
      this.ws = new WebSocket(url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Sherlock WS: Connection error:', error);
      this.handleConnectionFailure();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('Sherlock WS: Connection opened', { client_id: this.clientId });
      this.consecutiveFailures = 0;
      this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      // State will be set to CONNECTED when we receive 'connected' message
    };

    this.ws.onclose = (event) => {
      console.log('Sherlock WS: Connection closed', {
        client_id: this.clientId,
        server_id: this.serverId,
        code: event.code,
        reason: event.reason
      });
      this.clearPingTimer();
      this.handleConnectionFailure();
    };

    this.ws.onerror = (error) => {
      console.error('Sherlock WS: Error:', error);
      if (this.onError) {
        this.onError('WebSocket connection error');
      }
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      const messageType = data.type;

      // Reset ping timer on any message
      this.resetPingTimer();

      switch (messageType) {
        case 'connected':
          this.serverId = data.server_id || null;
          console.log('Sherlock WS: Connected successfully', {
            client_id: this.clientId,
            server_id: this.serverId,
            session_id: data.session_id,
            user_id: data.user_id
          });
          this.setConnectionState(ConnectionState.CONNECTED);
          // Sync missed messages if we have a last_seen_at timestamp
          if (this.lastSeenAt) {
            this.syncMissedMessages();
          }
          // Flush any pending messages queued while offline
          this.flushPendingMessages();
          break;

        case 'ping':
          // Respond with pong
          this.sendPong();
          break;

        case 'stream_start':
          console.log('Sherlock WS: Stream started');
          if (this.onStreamStart) {
            this.onStreamStart(data.data || {});
          }
          break;

        case 'text_chunk':
          if (this.onTextChunk && data.data?.content) {
            this.onTextChunk(data.data.content, data.data.session_id);
          }
          break;

        case 'thinking_chunk':
          if (this.onThinkingChunk && data.data?.content) {
            this.onThinkingChunk(data.data.content, data.data.session_id);
          }
          break;

        case 'stream_end':
          console.log('Sherlock WS: Stream ended', data);
          this.lastSeenAt = new Date().toISOString();
          if (this.onStreamEnd) {
            this.onStreamEnd(data.data || {});
          }
          break;

        case 'stream_error':
          {
            const errorData = data.data || {};
            const code = errorData.code || 'unknown';
            const errorMessage = errorData.message || 'An error occurred during streaming';
            console.error('Sherlock WS: Stream error', { code, message: errorMessage });
            if (this.onStreamError) {
              this.onStreamError({ code, message: errorMessage, sessionId: errorData.session_id });
            }
          }
          break;

        case 'tool_start':
          console.log('Sherlock WS: Tool execution started', data.data);
          if (this.onToolStart && data.data) {
            this.onToolStart({
              toolName: data.data.tool_name,
              toolInput: data.data.tool_input,
              displayText: data.data.display_text,
              sessionId: data.data.session_id,
              aiCharacterName: data.data.ai_character_name,
            });
          }
          break;

        case 'tool_result':
          console.log('Sherlock WS: Tool execution completed', data.data);
          if (this.onToolResult && data.data) {
            this.onToolResult({
              toolName: data.data.tool_name,
              toolInput: data.data.tool_input,
              toolResult: data.data.tool_result,
              displayText: data.data.display_text,
              sessionId: data.data.session_id,
              aiCharacterName: data.data.ai_character_name,
            });
          }
          break;

        case 'notification':
          {
            const msgData = data.data || {};
            const messageId = msgData.message_id;
            const direction = msgData.direction;
            const msgSessionId = msgData.session_id;

            // Debug logging for session validation
            console.log('Sherlock WS: Notification session check', {
              msgSessionId,
              thisSessionId: this.sessionId,
              match: msgSessionId === this.sessionId,
              direction,
              hasPendingSend: !!this._pendingSend
            });

            // Deduplication: skip if we sent this message
            if (messageId && this.wasMessageSentByMe(messageId)) {
              console.log('Sherlock WS: Skipping own message (dedup by ID)');
              break;
            }

            // Deduplication: if we're waiting for ACK and receive user_to_agent notification,
            // skip it - it's likely our own message echoed back before ACK arrived.
            // The notification arrives BEFORE message_sent ACK due to backend broadcast timing.
            if (direction === 'user_to_agent' && this._pendingSend !== null) {
              console.log('Sherlock WS: Skipping user_to_agent notification (pending send in progress)');
              this.lastSeenAt = msgData.created_at || new Date().toISOString();
              break;
            }

            // Session validation: only skip user_to_agent messages from other sessions
            // AI responses (agent_to_user) should always be processed if we're waiting for one
            if (msgSessionId && this.sessionId && msgSessionId !== this.sessionId) {
              if (direction === 'user_to_agent') {
                console.log('Sherlock WS: User message from different session, skipping');
                this.lastSeenAt = msgData.created_at || new Date().toISOString();
                break;
              } else {
                // Log warning but still process AI responses
                console.warn('Sherlock WS: Session mismatch for AI response, processing anyway', {
                  expected: this.sessionId,
                  received: msgSessionId
                });
              }
            }

            console.log('Sherlock WS: Notification received, direction:', direction);
            this.lastSeenAt = msgData.created_at || new Date().toISOString();

            // Handle based on direction
            if (direction === 'user_to_agent') {
              // User message from another client
              if (this.onUserMessage) {
                this.onUserMessage(msgData);
              }
            } else {
              // AI response (agent_to_user or default)
              if (this.onNotification) {
                this.onNotification(msgData);
              }
            }
          }
          break;

        case 'sync_complete':
          console.log('Sherlock WS: Sync complete', data.count, 'messages');
          // Messages were delivered via onNotification already
          break;

        case 'error':
          console.error('Sherlock WS: Server error:', data);
          if (this.onError) {
            this.onError(data.message || data.error || 'Server error');
          }
          break;

        case 'message_sent':
          console.log('Sherlock WS: Message sent ACK received', data);
          if (this._pendingSend) {
            const { resolve } = this._pendingSend;
            this._pendingSend = null;
            // Mark for deduplication (existing logic)
            this.markMessageAsSent(data.message_id);
            resolve({
              message_id: data.message_id,
              session_id: data.session_id,
              queued: data.queued || false,
            });
          }
          break;

        case 'send_error':
          console.error('Sherlock WS: Send error:', data);
          if (this._pendingSend) {
            const { reject } = this._pendingSend;
            this._pendingSend = null;
            reject(new Error(data.error || 'Send failed'));
          }
          break;

        case 'custom_event':
          // Handle custom events (deep research completion, etc.)
          {
            const eventType = data.event_type;
            const content = data.content || {};
            const eventSessionId = data.session_id;

            console.log('Sherlock WS: Custom event received', {
              eventType,
              contentType: content.type,
              sessionId: eventSessionId
            });

            // Deep research events
            if (eventType === 'deepResearch') {
              if (content.type === 'deepResearchCompleted') {
                console.log('Sherlock WS: Deep research completed', {
                  jobId: content.job_id,
                  query: content.query,
                  citationsCount: content.citations_count,
                  durationSeconds: content.duration_seconds,
                  filePath: content.file_path
                });
              } else if (content.type === 'deepResearchError') {
                console.error('Sherlock WS: Deep research failed', {
                  jobId: content.job_id,
                  query: content.query,
                  error: content.error
                });
              }
            }

            // Forward to callback for UI handling
            console.log('Sherlock WS: onCustomEvent callback defined?', !!this.onCustomEvent);
            if (this.onCustomEvent) {
              console.log('Sherlock WS: Calling onCustomEvent callback');
              this.onCustomEvent({
                event_type: eventType,
                content,
                sessionId: eventSessionId
              });
              console.log('Sherlock WS: onCustomEvent callback returned');
            } else {
              console.warn('Sherlock WS: No onCustomEvent callback registered!');
            }
          }
          break;

        default:
          // Log unknown events - never silently drop
          if (!KNOWN_EVENTS.has(messageType)) {
            console.error(
              `UNKNOWN_WS_EVENT: type='${messageType}' payload=`,
              JSON.stringify(data).slice(0, 500)
            );
          } else {
            console.log('Sherlock WS: Unhandled known message type:', messageType, data);
          }
      }
    } catch (error) {
      console.error('Sherlock WS: Error parsing message:', error);
    }
  }

  /**
   * Send pong response to server ping
   */
  sendPong() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'pong' }));
    }
  }

  /**
   * Request missed messages since last_seen_at
   */
  syncMissedMessages() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.lastSeenAt) {
      console.log('Sherlock WS: Requesting sync since', this.lastSeenAt);
      this.ws.send(JSON.stringify({
        type: 'sync',
        last_seen_at: this.lastSeenAt
      }));
    }
  }

  /**
   * Reset ping timeout timer
   */
  resetPingTimer() {
    this.clearPingTimer();
    this.pingTimer = setTimeout(() => {
      console.warn('Sherlock WS: Ping timeout - no message received');
      // Connection might be stale, try to reconnect
      if (this.connectionState === ConnectionState.CONNECTED) {
        this.handleConnectionFailure();
      }
    }, PING_TIMEOUT_MS);
  }

  /**
   * Clear ping timer
   */
  clearPingTimer() {
    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Handle connection failure and schedule reconnect
   */
  handleConnectionFailure() {
    this.clearPingTimer();
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn('Sherlock WS: Max failures reached, stopping reconnection');
      this.setConnectionState(ConnectionState.DISCONNECTED);
      return;
    }

    this.setConnectionState(ConnectionState.RECONNECTING);

    // Schedule reconnection with exponential backoff
    const delay = Math.min(this.reconnectDelay, MAX_RECONNECT_DELAY_MS);
    console.log(`Sherlock WS: Reconnecting in ${delay}ms (attempt ${this.consecutiveFailures})`);

    this.reconnectTimer = setTimeout(() => {
      if (this.userId && this.sessionId) {
        this.connect(this.userId, this.sessionId);
      }
    }, delay);

    this.reconnectDelay = Math.min(
      this.reconnectDelay * RECONNECT_BACKOFF_MULTIPLIER,
      MAX_RECONNECT_DELAY_MS
    );
  }

  /**
   * Close WebSocket connection
   */
  closeConnection() {
    this.clearPingTimer();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnection on intentional close
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;

      if (this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    console.log('Sherlock WS: Disconnecting');
    this.closeConnection();
    this.consecutiveFailures = 0;
    this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connectionState === ConnectionState.CONNECTED &&
           this.ws &&
           this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Force reconnection
   */
  reconnect() {
    this.consecutiveFailures = 0;
    this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    if (this.userId && this.sessionId) {
      this.connect(this.userId, this.sessionId);
    }
  }

  /**
   * Send a message to Sherlock/Bugsy via WebSocket.
   * Messages are queued if offline and sent on reconnect.
   *
   * @param {string} content - Message content
   * @param {string} source - "text" or "audio_transcription"
   * @param {string} aiCharacterName - Character name (sherlock, bugsy)
   * @param {Object|null} attachments - Optional attachments object
   * @param {string[]} attachments.image_locations - Array of image S3 URLs
   * @param {string[]} attachments.file_locations - Array of file S3 URLs
   * @returns {Promise<{message_id: string, session_id: string, queued: boolean}>}
   */
  sendMessage(content, source = 'text', aiCharacterName = 'sherlock', attachments = null) {
    return new Promise((resolve, reject) => {
      if (!content || !content.trim()) {
        reject(new Error('Content required'));
        return;
      }

      if (!this.isConnected()) {
        // Queue for later if offline
        this.pendingMessages.push({ content, source, aiCharacterName, attachments, resolve, reject });
        console.log('Sherlock WS: Queued message for later (offline)', this.pendingMessages.length);
        return;
      }

      // Store resolver for when ACK arrives
      this._pendingSend = { resolve, reject, content };

      try {
        const payload = {
          type: 'send_message',
          content: content.trim(),
          source,
          ai_character_name: aiCharacterName,
        };

        if (
          attachments
          && ((attachments.image_locations && attachments.image_locations.length > 0)
            || (attachments.file_locations && attachments.file_locations.length > 0))
        ) {
          payload.attachments = {
            image_locations: attachments.image_locations || [],
            file_locations: attachments.file_locations || [],
          };
        }

        this.ws.send(JSON.stringify(payload));
        console.log(
          'Sherlock WS: Sent message via WebSocket',
          attachments
            ? `with ${(attachments.image_locations?.length || 0) + (attachments.file_locations?.length || 0)} attachments`
            : ''
        );
      } catch (error) {
        this._pendingSend = null;
        reject(error);
      }
    });
  }

  /**
   * Flush pending messages queue (called on reconnect)
   */
  flushPendingMessages() {
    if (this.pendingMessages.length === 0) return;

    console.log(`Sherlock WS: Flushing ${this.pendingMessages.length} pending messages`);
    const messages = [...this.pendingMessages];
    this.pendingMessages = [];

    for (const pending of messages) {
      this.sendMessage(
        pending.content,
        pending.source,
        pending.aiCharacterName,
        pending.attachments
      )
        .then(pending.resolve)
        .catch(pending.reject);
    }
  }

  /**
   * Clear pending messages (e.g., on session change)
   */
  clearPendingMessages() {
    // Reject any pending promises
    for (const pending of this.pendingMessages) {
      pending.reject(new Error('Session changed, message cancelled'));
    }
    this.pendingMessages = [];
    if (this._pendingSend) {
      this._pendingSend.reject(new Error('Session changed, message cancelled'));
      this._pendingSend = null;
    }
  }
}

/**
 * Transform raw tool event into user-friendly message.
 * Use this to display tool execution progress to users.
 *
 * @param {string} toolName - The tool name (e.g., "Bash", "Read", "WebSearch")
 * @param {object} toolInput - The tool input parameters
 * @param {object|null} toolResult - The tool result (null for tool_start events)
 * @returns {string} User-friendly message
 */
export function formatToolEvent(toolName, toolInput, toolResult = null) {
  const isComplete = toolResult !== null;

  // Extract useful info from tool input
  switch (toolName) {
    case 'Bash': {
      const command = toolInput?.command || '';
      const description = toolInput?.description || '';

      // Check for specific scripts
      if (command.includes('generate_image.sh')) {
        const modelMatch = command.match(/--model\s+(\S+)/);
        const model = modelMatch ? modelMatch[1] : 'unknown';
        return isComplete
          ? `Image generated using ${model}`
          : `Generating image with ${model}...`;
      }

      if (command.includes('check_weather.sh')) {
        return isComplete ? 'Weather data retrieved' : 'Checking weather...';
      }

      if (command.includes('check_garmin.sh')) {
        return isComplete ? 'Garmin data retrieved' : 'Fetching Garmin data...';
      }

      if (command.includes('check_calendar.sh')) {
        return isComplete ? 'Calendar checked' : 'Checking calendar...';
      }

      if (command.includes('check_gmail.sh')) {
        return isComplete ? 'Email checked' : 'Checking email...';
      }

      // Use description if available, otherwise truncate command
      if (description) {
        return isComplete ? `Completed: ${description}` : `${description}...`;
      }

      const shortCommand = command.length > 50 ? command.substring(0, 47) + '...' : command;
      return isComplete ? `Executed: ${shortCommand}` : `Running: ${shortCommand}...`;
    }

    case 'Read':
      return isComplete
        ? `Read ${toolInput?.file_path?.split('/').pop() || 'file'}`
        : `Reading ${toolInput?.file_path?.split('/').pop() || 'file'}...`;

    case 'Write':
      return isComplete
        ? `Wrote ${toolInput?.file_path?.split('/').pop() || 'file'}`
        : `Writing ${toolInput?.file_path?.split('/').pop() || 'file'}...`;

    case 'Edit':
      return isComplete
        ? `Edited ${toolInput?.file_path?.split('/').pop() || 'file'}`
        : `Editing ${toolInput?.file_path?.split('/').pop() || 'file'}...`;

    case 'WebSearch':
      return isComplete
        ? `Searched: ${toolInput?.query || 'web'}`
        : `Searching: ${toolInput?.query || 'web'}...`;

    case 'WebFetch':
      return isComplete
        ? 'Fetched web content'
        : `Fetching from ${toolInput?.url ? new URL(toolInput.url).hostname : 'web'}...`;

    case 'Glob':
      return isComplete
        ? `Found files matching ${toolInput?.pattern || 'pattern'}`
        : `Searching for ${toolInput?.pattern || 'files'}...`;

    case 'Grep':
      return isComplete
        ? `Searched for "${toolInput?.pattern || 'pattern'}"`
        : `Searching for "${toolInput?.pattern || 'pattern'}"...`;

    case 'Task':
      return isComplete
        ? `Completed: ${toolInput?.description || 'subtask'}`
        : `Working on: ${toolInput?.description || 'subtask'}...`;

    default:
      return isComplete
        ? `Completed ${toolName}`
        : `Executing ${toolName}...`;
  }
}

// Singleton instance
const sherlockWebSocket = new SherlockWebSocketService();

// Export both the class and singleton
export { SherlockWebSocketService };
export default sherlockWebSocket;
