/**
 * sherlock.api.js - Sherlock (Proactive Agent) REST API
 *
 * REST endpoints:
 * - GET /session - Get/create session
 * - GET /messages/{session_id}/poll - Poll for responses (fallback)
 */

import config from '../config';
import { getAuthTokenForBackend, getCustomerId } from '../utils/configuration';

/**
 * Build the proactive agent API URL
 * @param {string} baseUrl - The base URL
 * @param {string} endpoint - The endpoint path (e.g., "session")
 * @returns {string} Full URL
 */
const buildProactiveAgentUrl = (baseUrl, endpoint) => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/api/v1/proactive-agent/${endpoint}`;
};

// Polling configuration
const POLLING_INTERVAL_MS = 3000;  // 3 seconds between polls
const MAX_POLLING_ATTEMPTS = 60;   // 3 minutes max (60 * 3s)

// Track active polling
let pollingController = null;
let isPolling = false;

/**
 * Get authorization headers for API calls
 */
const getAuthHeaders = () => {
  const token = getAuthTokenForBackend();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

/**
 * Poll for new messages from Sherlock
 *
 * @param {Object} params
 * @param {string} params.sessionId - Session ID to poll
 * @param {string} params.since - ISO timestamp to get messages after
 * @returns {Promise<Array>} New messages
 */
const pollForMessages = async ({ sessionId, since }) => {
  const userId = getCustomerId() ?? 1;
  let url = `${buildProactiveAgentUrl(config.apiEndpoint, `messages/${sessionId}/poll`)}?user_id=${userId}`;
  if (since) {
    url += `&since=${encodeURIComponent(since)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  // Backend returns ApiResponse with data field containing messages array
  const result = data.data || data;
  return result.data || result || [];
};

/**
 * Start polling for Sherlock responses
 *
 * @param {Object} params
 * @param {string} params.sessionId - Session ID to poll
 * @param {Function} params.onMessageReceived - Callback when message arrives (content, messageId)
 * @param {Function} params.onStatusUpdate - Callback for status updates (status string)
 * @param {Function} params.onError - Callback for errors (error string)
 * @param {Function} params.onComplete - Callback when polling completes
 */
export const startSherlockPolling = ({
  sessionId,
  onMessageReceived,
  onStatusUpdate,
  onError,
  onComplete
}) => {
  // Stop any existing polling
  stopSherlockPolling();

  isPolling = true;
  pollingController = new AbortController();

  const startTime = new Date().toISOString();
  let attempts = 0;
  let lastPollTimestamp = startTime;

  console.log('Sherlock: Starting polling for session', sessionId);

  const poll = async () => {
    if (!isPolling) return;

    attempts++;

    try {
      const messages = await pollForMessages({
        sessionId,
        since: lastPollTimestamp
      });

      if (messages.length > 0) {
        // Got response! Get the latest message
        const latestMessage = messages[messages.length - 1];
        const content = latestMessage.content || '';
        const messageId = latestMessage.message_id || '';
        const createdAt = latestMessage.created_at || '';

        if (createdAt) {
          lastPollTimestamp = createdAt;
        }

        if (content) {
          console.log('Sherlock: Response received');
          onMessageReceived(content, messageId);
          stopSherlockPolling();
          if (onComplete) onComplete();
          return;
        }
      }

      // Update status occasionally
      if (attempts % 3 === 0 && onStatusUpdate) {
        let status;
        if (attempts <= 5) {
          status = 'Sherlock is investigating...';
        } else if (attempts <= 15) {
          status = 'Analyzing the evidence...';
        } else if (attempts <= 30) {
          status = 'Following a lead...';
        } else {
          status = 'Deep in thought...';
        }
        onStatusUpdate(status);
      }

      // Check max attempts
      if (attempts >= MAX_POLLING_ATTEMPTS) {
        console.log('Sherlock: Max polling attempts reached');
        onError('Sherlock is still investigating. The response will appear when ready.');
        stopSherlockPolling();
        if (onComplete) onComplete();
        return;
      }

      // Schedule next poll
      if (isPolling) {
        setTimeout(poll, POLLING_INTERVAL_MS);
      }
    } catch (error) {
      console.error('Sherlock: Polling error:', error);

      // Only report errors occasionally to avoid spam
      if (attempts % 5 === 0 && onError) {
        onError(`Connection issue: ${error.message}`);
      }

      // Continue polling unless we've hit max attempts
      if (attempts < MAX_POLLING_ATTEMPTS && isPolling) {
        setTimeout(poll, POLLING_INTERVAL_MS);
      } else {
        stopSherlockPolling();
        if (onComplete) onComplete();
      }
    }
  };

  // Start first poll after a brief delay
  setTimeout(poll, POLLING_INTERVAL_MS);
};

/**
 * Stop any active Sherlock polling
 */
export const stopSherlockPolling = () => {
  console.log('Sherlock: Stopping polling');
  isPolling = false;
  if (pollingController) {
    pollingController.abort();
    pollingController = null;
  }
};

/**
 * Check if Sherlock polling is currently active
 */
export const isSherlockPolling = () => isPolling;

/**
 * Get or create a Claude Code character session
 *
 * @param {string} existingSessionId - Optional existing session ID
 * @param {string} aiCharacterName - Character name ("sherlock" or "bugsy", default: "sherlock")
 * @returns {Promise<{sessionId: string, claudeSessionId: string|null}>}
 */
export const getOrCreateSherlockSession = async (existingSessionId = null, aiCharacterName = 'sherlock') => {
  const userId = getCustomerId() ?? 1;
  let url = `${buildProactiveAgentUrl(config.apiEndpoint, 'session')}?user_id=${userId}&ai_character_name=${encodeURIComponent(aiCharacterName)}`;
  if (existingSessionId) {
    url += `&session_id=${encodeURIComponent(existingSessionId)}`;
  }

  console.log('Sherlock: Getting/creating session');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = data.data || data;

    return {
      sessionId: result.session_id || '',
      claudeSessionId: result.claude_session_id || null
    };
  } catch (error) {
    console.error('Sherlock: Error getting session:', error);
    throw error;
  }
};

export default {
  startSherlockPolling,
  stopSherlockPolling,
  isSherlockPolling,
  getOrCreateSherlockSession
};
