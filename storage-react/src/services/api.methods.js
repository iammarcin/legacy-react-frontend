/**
 * api.methods.js - High-level API method wrappers
 *
 * Provides request builders for different API actions:
 * - Database operations (messages, sessions, prompts)
 * - Helper functions for payload preparation
 * - Response normalization
 *
 * For chat streaming, see call.chat.api.js and api.websocket.js
 */

// Config
import config from '../config';

// Services
import makeApiCall from './api.service';
import { triggerStreamingWSRequest, triggerStreamingWSTextRequest } from './api.websocket';

// Utils
import { getCustomerId } from '../utils/configuration';
import { formatDate } from '../utils/misc';

// Re-export the WebSocket functions
export { triggerStreamingWSRequest, triggerStreamingWSTextRequest };

export const prepareChatHistoryForDB = (chatContent) => {
  // prepare chat history for DB in expected format (using canonical snake_case fields)
  const chatHistoryForDB = (chatContent.messages || []).map((message) => ({
    "message": message.message,
    "isUserMessage": message.isUserMessage,
    "image_locations": message.image_locations || [],
    "file_locations": message.file_locations || [],
    "ai_character_name": message.ai_character_name || "",
    "message_id": message.message_id || 0,
    "api_text_gen_model_name": message.api_text_gen_model_name,
    "created_at": message.created_at ? formatDate(message.created_at) : null,
    "is_tts": message.is_tts || false,
    "show_transcribe_button": message.show_transcribe_button || false,
    "is_gps_location_message": message.is_gps_location_message || false
  }));
  return chatHistoryForDB;
}

const CHAT_ACTION_ROUTES = {
  db_new_message: { method: 'POST', path: '/messages' },
  db_edit_message: { method: 'PATCH', path: '/messages' },
  db_update_message: { method: 'PUT', path: '/messages' },
  db_remove_messages: { method: 'DELETE', path: '/messages' },
  db_all_sessions_for_user: { method: 'POST', path: '/sessions/list' },
  db_get_user_session: { method: 'POST', path: '/sessions/detail' },
  db_search_messages: { method: 'POST', path: '/sessions/search' },
  db_update_session: { method: 'PATCH', path: '/sessions' },
  db_remove_session: { method: 'DELETE', path: '/sessions' },
  db_get_all_prompts: { method: 'GET', path: '/prompts' },
  db_add_prompt: { method: 'POST', path: '/prompts' },
  db_edit_prompt: { method: 'PUT', path: '/prompts' },
  db_remove_prompt: { method: 'DELETE', path: '/prompts' },
  db_auth_user: { method: 'POST', path: '/auth/login' },
  db_get_favorite_messages: { method: 'GET', path: '/maintenance/favorites' },
  db_get_messages_with_files_attached: { method: 'POST', path: '/maintenance/files' },
};

const cleanObject = (value) => {
  if (Array.isArray(value)) {
    return value.map(cleanObject);
  }
  if (value && typeof value === 'object') {
    const cleaned = {};
    Object.entries(value).forEach(([key, val]) => {
      const normalised = cleanObject(val);
      if (normalised !== undefined) {
        cleaned[key] = normalised;
      }
    });
    return cleaned;
  }
  return value === undefined ? undefined : value;
};

const toSnakeCase = (key) => key.replace(/([A-Z])/g, '_$1').toLowerCase();

const convertKeysToSnake = (value) => {
  if (Array.isArray(value)) {
    return value.map(convertKeysToSnake);
  }
  if (value && typeof value === 'object') {
    const converted = {};
    Object.entries(value).forEach(([key, val]) => {
      const snakeKey = /[A-Z]/.test(key) ? toSnakeCase(key) : key;
      converted[snakeKey] = convertKeysToSnake(val);
    });
    return converted;
  }
  return value;
};

const prepareMessageWriteBody = (input, userSettings, customerId) => {
  const payload = { ...(input || {}) };
  payload.customer_id = customerId;
  payload.user_settings = userSettings;
  if (payload.new_ai_character_name && !payload.ai_character_name) {
    payload.ai_character_name = payload.new_ai_character_name;
  }
  delete payload.new_ai_character_name;
  if (payload.userMessage && !payload.user_message) {
    payload.user_message = payload.userMessage;
  }
  delete payload.userMessage;
  if (payload.aiResponse && !payload.ai_response) {
    payload.ai_response = payload.aiResponse;
  }
  delete payload.aiResponse;
  delete payload.chat_history;
  delete payload.new_session_from_here_full_chat_history;
  return { body: cleanObject(payload) };
};

const prepareUpdateMessageBody = (input, customerId) => {
  const payload = {
    customer_id: customerId,
    message_id: input?.message_id,
    append_image_locations: input?.append_image_locations ?? false,
  };
  if (input?.patch) {
    payload.patch = input.patch;
  } else {
    const patch = {};
    if (input?.message !== undefined) patch.message = input.message;
    if (input?.ai_reasoning !== undefined) patch.ai_reasoning = input.ai_reasoning;
    if (input?.image_locations !== undefined) patch.image_locations = input.image_locations;
    if (input?.file_locations !== undefined) patch.file_locations = input.file_locations;
    if (Object.keys(patch).length > 0) {
      payload.patch = patch;
    }
  }
  return { body: cleanObject(payload) };
};

const prepareRemoveMessagesBody = (input, customerId) => ({
  body: cleanObject({
    customer_id: customerId,
    session_id: input?.session_id,
    message_ids: input?.message_ids ?? [],
  }),
});

const prepareListSessionsBody = (input, customerId) => {
  const payload = cleanObject({
    customer_id: customerId,
    limit: input?.limit,
    offset: input?.offset,
    include_messages: input?.include_messages ?? input?.includeMessages,
    start_date: input?.start_date ?? input?.startDate,
    end_date: input?.end_date ?? input?.endDate,
    tags: input?.tags,
  });

  return { body: payload };
};

const prepareSearchSessionsBody = (input, customerId) => {
  const payload = cleanObject({
    customer_id: customerId,
    limit: input?.limit,
    search_text: input?.search_text ?? input?.searchText,
  });

  return { body: payload };
};

const prepareSessionDetailBody = (input, customerId) => {
  const payload = { ...(input || {}) };
  delete payload.customerId;
  payload.customer_id = customerId;
  if (payload.include_messages === undefined && payload.includeMessages === undefined) {
    payload.include_messages = true;
  }
  return { body: cleanObject(payload) };
};

const prepareUpdateSessionBody = (input, customerId) => {
  const payload = { ...(input || {}) };
  payload.customer_id = customerId;
  if (payload.new_session_name && !payload.session_name) {
    payload.session_name = payload.new_session_name;
  }
  delete payload.new_session_name;
  if (payload.new_ai_character_name && !payload.ai_character_name) {
    payload.ai_character_name = payload.new_ai_character_name;
  }
  delete payload.new_ai_character_name;
  if (payload.update_last_mod_time_in_db !== undefined) {
    payload.update_last_mod_time = payload.update_last_mod_time_in_db;
    delete payload.update_last_mod_time_in_db;
  }
  delete payload.chat_history;
  return { body: cleanObject(payload) };
};

const prepareSimpleBody = (input, customerId) => ({
  body: cleanObject({ ...(input || {}), customer_id: customerId }),
});

const appendQueryParam = (params, key, value) => {
  if (Array.isArray(value)) {
    value.forEach((entry) => appendQueryParam(params, key, entry));
    return;
  }
  if (value !== undefined && value !== null) {
    params.append(key, value);
  }
};

const prepareQueryParams = (input) => {
  const params = new URLSearchParams();
  Object.entries(input || {}).forEach(([key, value]) => {
    appendQueryParam(params, key, value);
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

export const extractResponseData = (response) => {
  if (!response) {
    return undefined;
  }

  if (response.data !== undefined && response.data !== null) {
    return response.data;
  }

  if (response.message !== undefined) {
    return response.message;
  }

  return undefined;
};

const normaliseChatResult = (action, data) => {
  switch (action) {
    case 'db_new_message':
    case 'db_edit_message': {
      const messages = data?.messages ?? data;
      const legacy = { ...(messages || {}) };
      if (data?.session) {
        legacy.session = convertKeysToSnake(data.session);
      }
      return legacy;
    }
    case 'db_all_sessions_for_user':
    case 'db_search_messages':
      return convertKeysToSnake(data?.sessions ?? data ?? []);
    case 'db_get_user_session':
      return convertKeysToSnake(data?.session ?? data ?? {});
    case 'db_update_session':
      return convertKeysToSnake(data?.session ?? data ?? {});
    case 'db_get_favorite_messages':
      return convertKeysToSnake(data?.session ?? data ?? {});
    case 'db_get_messages_with_files_attached':
      return convertKeysToSnake(data?.messages ?? data ?? []);
    case 'db_get_all_prompts':
      return convertKeysToSnake(data?.prompts ?? data ?? []);
    case 'db_add_prompt':
    case 'db_edit_prompt':
    case 'db_remove_prompt':
    case 'db_auth_user':
    case 'db_remove_messages':
    case 'db_remove_session':
    case 'db_update_message':
      return convertKeysToSnake(data ?? {});
    default:
      return data;
  }
};

const buildChatRequest = (action, userInput, userSettings, customerId) => {
  switch (action) {
    case 'db_new_message':
    case 'db_edit_message':
      return prepareMessageWriteBody(userInput, userSettings, customerId);
    case 'db_update_message':
      return prepareUpdateMessageBody(userInput, customerId);
    case 'db_remove_messages':
      return prepareRemoveMessagesBody(userInput, customerId);
    case 'db_all_sessions_for_user':
      return prepareListSessionsBody(userInput, customerId);
    case 'db_search_messages':
      return prepareSearchSessionsBody(userInput, customerId);
    case 'db_get_user_session':
      return prepareSessionDetailBody(userInput, customerId);
    case 'db_update_session':
      return prepareUpdateSessionBody(userInput, customerId);
    case 'db_remove_session':
    case 'db_add_prompt':
    case 'db_edit_prompt':
    case 'db_remove_prompt':
    case 'db_auth_user':
    case 'db_get_messages_with_files_attached':
      return prepareSimpleBody(userInput, customerId);
    case 'db_get_all_prompts':
      return { query: { customer_id: customerId } };
    case 'db_get_favorite_messages': {
      const includeSessionMetadata =
        userInput?.include_session_metadata ?? userInput?.includeSessionMetadata ?? true;
      return { query: { customer_id: customerId, include_session_metadata: includeSessionMetadata } };
    }
    default:
      return { body: cleanObject({ ...(userInput || {}), customer_id: customerId }) };
  }
};

const callChatApi = async (action, userInput, getSettings) => {
  const route = CHAT_ACTION_ROUTES[action];
  if (!route) {
    throw new Error(`Unsupported chat action: ${action}`);
  }
  const storedCustomerId = getCustomerId();
  const customerId = userInput?.customer_id ?? userInput?.customerId ?? storedCustomerId ?? 1;
  const userSettings = getSettings();
  const requestConfig = buildChatRequest(action, { ...(userInput || {}) }, userSettings, customerId);

  let endpoint = `${config.apiEndpoint}/api/v1/chat${route.path}`;
  if (requestConfig.query) {
    endpoint += prepareQueryParams(requestConfig.query);
  }

  const response = await makeApiCall({
    endpoint,
    method: route.method,
    body: requestConfig.body,
  });

  if (response.success && response.data !== undefined) {
    const normalisedResult = normaliseChatResult(action, response.data);
    return {
      ...response,
      data: normalisedResult,
    };
  }
  return response;
};

export const triggerAPIRequest = async (endpoint, category, action, userInput, getSettings) => {
  if (endpoint === 'api/db' && category === 'provider.db') {
    try {
      return await callChatApi(action, userInput, getSettings);
    } catch (error) {
      console.error('Error triggering chat request:', error);
      throw error;
    }
  }

  const API_BASE_URL = `${config.apiEndpoint}/${endpoint}`;

  try {
    const storedCustomerId = getCustomerId();
    const apiBody = {
      category: category,
      action: action,
      user_input: userInput,
      user_settings: getSettings(),
      customer_id: storedCustomerId ?? 1,
    }
    const response = await makeApiCall({
      endpoint: API_BASE_URL,
      method: "POST",
      body: apiBody
    });

    return response;
  } catch (error) {
    console.error('Error triggering DB request:', error);
    throw error;
  }
};

export const fetchBloodTests = async (query = {}) => {
  const customerId = query.customer_id ?? query.customerId ?? getCustomerId();
  const finalQuery = {
    ...query,
  };
  if (customerId) {
    finalQuery.customer_id = customerId;
  }
  const endpoint = `${config.apiEndpoint}/api/v1/blood/tests${prepareQueryParams(finalQuery)}`;
  return makeApiCall({
    endpoint,
    method: 'GET',
  });
};

export const fetchGarminAnalysisOverview = async ({
  customerId = getCustomerId(),
  startDate,
  endDate,
  mode = 'correlation',
  includeOptimized = true,
  datasets,
  ...rest
} = {}) => {
  if (!customerId) {
    throw new Error('customerId is required for Garmin analysis requests');
  }

  const query = {
    customer_id: customerId,
    start_date: startDate,
    end_date: endDate,
    mode,
    include_optimized: includeOptimized,
    ...rest,
  };

  if (datasets && datasets.length > 0) {
    query.datasets = datasets;
  }

  const endpoint = `${config.apiEndpoint}/api/v1/garmin/analysis/overview${prepareQueryParams(query)}`;
  return makeApiCall({
    endpoint,
    method: 'GET',
  });
};

export const triggerStreamingAPIRequest = async (endpoint, category, action, userInput, assetInput, getSettings, { onChunkReceived, onStreamEnd, onError }) => {
  const API_BASE_URL = `${config.apiEndpoint}/${endpoint}`;

  const apiBody = {
    category: category,
    action: action,
    user_input: userInput,
    asset_input: assetInput,
    user_settings: getSettings(),
    customer_id: getCustomerId() ?? 1,
  };

  try {
    await makeApiCall({
      endpoint: API_BASE_URL,
      method: 'POST',
      body: apiBody,
      streamResponse: true,
      onChunkReceived: onChunkReceived,
      onStreamEnd: onStreamEnd
    });
  } catch (error) {
    onError(error);
    console.error('Error during streaming:', error);
  }
}

/**
 * Triggers a WebSocket-based streaming text request.
 * This is similar to triggerStreamingAPIRequest but uses WebSockets instead of fetch.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.endpoint - WebSocket endpoint (e.g., "chat/ws")
 * @param {string} options.requestType - Type of request (e.g., "text")
 * @param {Object} options.userInput - User input data
 * @param {Array} options.assetInput - Asset input data
 * @param {Function} options.getSettings - Function to get user settings
 * @param {Function} options.onChunkReceived - Callback for received chunks
 * @param {Function} options.onStreamEnd - Callback for stream end
 * @param {Function} options.onStreamingError - Callback for errors
 * @returns {WebSocket} - The WebSocket instance
 */

export const triggerFormDataAPIRequest = async (endpoint, formData) => {
  const API_BASE_URL = `${config.apiEndpoint}/${endpoint}`;

  try {
    // makeApiCall needs to be able to send FormData without trying to stringify it
    // and without manually setting Content-Type, to let the browser set it with the boundary.
    const response = await makeApiCall({
      endpoint: API_BASE_URL,
      method: "POST",
      body: formData,
      headers: {}, // Explicitly empty to let browser set Content-Type for FormData
    });

    return response;
  } catch (error) {
    console.error('Error triggering FormData API request:', error);
    throw error; // Re-throw to be caught by caller
  }
};

export const updateSessionInDB = async (chatContentForSession, sessionId, getSettings, update_last_mod_time_in_db = true) => {
  //db_update_session to DB 
  const chatHistoryForDB = prepareChatHistoryForDB(chatContentForSession);
  const finalInputForDB = {
    "session_id": sessionId,
    "update_last_mod_time_in_db": update_last_mod_time_in_db,
    "chat_history": chatHistoryForDB
  }
  await triggerAPIRequest("api/db", "provider.db", "db_update_session", finalInputForDB, getSettings);
}

export const generateImage = async (image_prompt, getSettings) => {
  try {
    const userInput = { "text": image_prompt };
    const response = await triggerAPIRequest("generate", "image", "generate", userInput, getSettings);
    if (response.success) {
      const result = extractResponseData(response);
      return result;
    } else {
      throw new Error('Failed to generate image');
    }
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}
export const generateSessionName = async (sessionId, getSettings) => {
  try {
    const endpoint = `${config.apiEndpoint}/api/v1/chat/session-name`;
    const customerId = getCustomerId() ?? 1;

    const requestBody = {
      prompt: " ",                    // Empty prompt - backend will load from session
      settings: getSettings(),
      customer_id: customerId,
      session_id: sessionId,
    };

    const response = await makeApiCall({
      endpoint,
      method: "POST",
      body: requestBody
    });

    return response;
  } catch (error) {
    console.error('Error generating session name:', error);
    throw error;
  }
};

export const uploadFileToS3 = async (endpoint, category, action, getSettings, file) => {
  const API_BASE_URL = `${config.apiEndpoint}/${endpoint}`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  formData.append('action', action);
  formData.append('user_input', JSON.stringify({}));
  formData.append('user_settings', JSON.stringify(getSettings()));
  formData.append('customer_id', getCustomerId() ?? 1);

  const response = await makeApiCall({
    endpoint: API_BASE_URL,
    method: 'POST',
    body: formData,
    headers: {}, // Ensure headers are set correctly for FormData
  });

  return response;
};

export const __testables = {
  CHAT_ACTION_ROUTES,
  cleanObject,
  convertKeysToSnake,
  prepareMessageWriteBody,
  prepareUpdateMessageBody,
  prepareRemoveMessagesBody,
  prepareListSessionsBody,
  prepareSearchSessionsBody,
  prepareSessionDetailBody,
  prepareUpdateSessionBody,
  prepareSimpleBody,
  prepareQueryParams,
  buildChatRequest,
};

