/**
 * resilient.websocket.js - Resilient WebSocket wrapper with auto-reconnection
 *
 * Provides automatic reconnection, message buffering, and stream resumption
 * for chat WebSocket connections. Handles backend hot-reloads gracefully.
 *
 * Key features:
 * - Auto-reconnection with exponential backoff
 * - Message queue during disconnect
 * - Stream resumption with chunk recovery
 * - Connection state tracking
 */

// Connection states
export const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
};

// Reconnection configuration
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 10000; // Shorter for dev hot-reload
const RECONNECT_BACKOFF_MULTIPLIER = 1.5;
const MAX_CONSECUTIVE_FAILURES = 10; // More forgiving during dev

/**
 * ResilientWebSocket - Auto-reconnecting WebSocket wrapper
 *
 * Usage:
 *   const rws = new ResilientWebSocket(url, {
 *     onOpen: (event) => console.log('Connected'),
 *     onMessage: (data) => console.log('Message:', data),
 *     onClose: (event) => console.log('Closed'),
 *     onError: (error) => console.error('Error:', error),
 *     onReconnecting: () => console.log('Reconnecting...'),
 *     onReconnected: () => console.log('Reconnected!'),
 *   });
 *
 *   rws.send({ type: 'ping' });
 *   rws.close(); // Permanently close
 */
export class ResilientWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;

    // WebSocket instance
    this.ws = null;

    // Connection state
    this.connectionState = ConnectionState.DISCONNECTED;
    this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    this.consecutiveFailures = 0;
    this.reconnectTimer = null;
    this.intentionalClose = false;

    // Stream resumption
    this.sessionId = null;
    this.lastChunkId = null;
    this.streamActive = false;

    // Message queue (for sending during disconnect)
    this.messageQueue = [];

    // Callbacks
    this.onOpen = options.onOpen || null;
    this.onMessage = options.onMessage || null;
    this.onClose = options.onClose || null;
    this.onError = options.onError || null;
    this.onConnectionStateChange = options.onConnectionStateChange || null;
    this.onReconnecting = options.onReconnecting || null;
    this.onReconnected = options.onReconnected || null;

    // Start connection
    this.connect();
  }

  /**
   * Update connection state and notify listeners
   */
  setConnectionState(state) {
    if (this.connectionState !== state) {
      console.log(`[ResilientWS] State: ${this.connectionState} → ${state}`);
      this.connectionState = state;
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    }
  }

  /**
   * Establish WebSocket connection
   */
  connect() {
    if (this.intentionalClose) {
      console.log('[ResilientWS] Not reconnecting (intentional close)');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[ResilientWS] Already connected');
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);
    console.log('[ResilientWS] Connecting to', this.url.replace(/token=[^&]+/, 'token=***'));

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[ResilientWS] Connection error:', error);
      this.handleConnectionFailure();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      console.log('[ResilientWS] Connection opened');
      this.consecutiveFailures = 0;
      this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;

      const isReconnect = this.connectionState === ConnectionState.RECONNECTING;
      this.setConnectionState(ConnectionState.CONNECTED);

      // Call onOpen callback
      if (this.onOpen) {
        this.onOpen(event);
      }

      // If reconnecting and stream was active, request resumption
      if (isReconnect && this.streamActive && this.sessionId) {
        console.log('[ResilientWS] Requesting stream resumption', {
          sessionId: this.sessionId,
          lastChunkId: this.lastChunkId,
        });
        this.sendImmediately({
          type: 'stream_resume',
          session_id: this.sessionId,
          last_chunk_id: this.lastChunkId,
        });

        // Notify about reconnection
        if (this.onReconnected) {
          this.onReconnected();
        }
      }

      // Flush message queue
      this.flushMessageQueue();
    };

    this.ws.onmessage = (event) => {
      if (this.onMessage) {
        try {
          const data = JSON.parse(event.data);

          // Track session_id and chunk_id for resumption
          if (data.session_id) {
            this.sessionId = data.session_id;
          }

          if (data.type === 'text_chunk') {
            this.streamActive = true;
            if (data.chunk_id !== undefined) {
              this.lastChunkId = data.chunk_id;
            }
          }

          if (data.type === 'text_completed' || data.type === 'stream_end') {
            this.streamActive = false;
            this.lastChunkId = null;
          }

          if (data.type === 'stream_resumed') {
            console.log('[ResilientWS] Stream resumed with', data.chunks?.length || 0, 'buffered chunks');
            // Backend will send buffered chunks in this message
            // They'll be handled by onMessage callback
          }

          this.onMessage(data, event);
        } catch (error) {
          console.error('[ResilientWS] Error parsing message:', error);
          this.onMessage(event.data, event);
        }
      }
    };

    this.ws.onerror = (event) => {
      console.error('[ResilientWS] Error:', event);
      if (this.onError) {
        this.onError(event);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[ResilientWS] Connection closed', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        intentional: this.intentionalClose,
      });

      if (this.onClose) {
        this.onClose(event);
      }

      // Don't reconnect if intentionally closed
      if (!this.intentionalClose) {
        this.handleConnectionFailure();
      } else {
        this.setConnectionState(ConnectionState.DISCONNECTED);
      }
    };
  }

  /**
   * Handle connection failure and schedule reconnect
   */
  handleConnectionFailure() {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn('[ResilientWS] Max failures reached, stopping reconnection');
      this.setConnectionState(ConnectionState.DISCONNECTED);
      return;
    }

    this.setConnectionState(ConnectionState.RECONNECTING);

    // Notify about reconnection attempt
    if (this.onReconnecting) {
      this.onReconnecting(this.consecutiveFailures);
    }

    // Schedule reconnection with exponential backoff
    const delay = Math.min(this.reconnectDelay, MAX_RECONNECT_DELAY_MS);
    console.log(`[ResilientWS] Reconnecting in ${delay}ms (attempt ${this.consecutiveFailures})`);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);

    this.reconnectDelay = Math.min(
      this.reconnectDelay * RECONNECT_BACKOFF_MULTIPLIER,
      MAX_RECONNECT_DELAY_MS
    );
  }

  /**
   * Send message immediately (bypass queue)
   * Used for internal protocol messages like stream_resume
   */
  sendImmediately(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      return true;
    }
    return false;
  }

  /**
   * Send message (queues if disconnected)
   */
  send(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      return true;
    } else {
      // Queue for later
      console.log('[ResilientWS] Queuing message (disconnected)');
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Flush queued messages
   */
  flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`[ResilientWS] Flushing ${this.messageQueue.length} queued messages`);
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      this.send(message);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return (
      this.connectionState === ConnectionState.CONNECTED &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    );
  }

  /**
   * Force reconnection
   */
  reconnect() {
    console.log('[ResilientWS] Manual reconnect requested');
    this.consecutiveFailures = 0;
    this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    this.intentionalClose = false;

    if (this.ws) {
      // Close existing connection
      this.ws.onclose = null; // Prevent double reconnect
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.connect();
  }

  /**
   * Permanently close connection (no reconnect)
   */
  close(code = 1000, reason = '') {
    console.log('[ResilientWS] Closing permanently');
    this.intentionalClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }

    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Access underlying WebSocket (for binaryType, etc.)
   */
  get readyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  set binaryType(type) {
    if (this.ws) {
      this.ws.binaryType = type;
    }
  }
}
