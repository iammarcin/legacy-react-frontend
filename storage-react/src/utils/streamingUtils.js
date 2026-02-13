/**
 * streamingUtils.js
 *
 * This module provides utility functions for preparing data for streaming requests,
 * similar to the functions in the Kotlin StreamingUtils.kt file.
 */

// Components
import { characters } from '../components/ChatCharacters';

// Utils
import { getCustomerId } from './configuration';
import { generateUUID } from './misc';

/**
 * Prepares chat history for a streaming WebSocket request by formatting messages
 * properly for the backend.
 * 
 * @param {Array} chatContent - The full chat content array from the state context
 * @param {Number} currentSessionIndex - Index of the current active session
 * @param {Number|null} chatItemBeingEditedPosition - Position of the message being edited, if any
 * @returns {Array} - Formatted chat history array
 */
export const prepareChatHistory = (
  chatContent,
  currentSessionIndex,
  chatItemBeingEditedPosition = null,
) => {
  // Get messages from the current session
  const messages = chatContent[currentSessionIndex].messages;

  // If empty or it's a bug report, return empty array
  if (messages.length === 0) {
    return [];
  }

  // Extract index from editMessagePosition object if needed
  const editIndex = chatItemBeingEditedPosition?.index ?? chatItemBeingEditedPosition;

  // Determine how many messages to drop from the end
  let dropHowMany = 1;
  if (editIndex !== null && editIndex !== undefined) {
    // If it's an edited message, we drop 2 messages if it's not the last message
    dropHowMany = editIndex === messages.length - 1 ? 1 : 2;
  }

  // Prepare the chat history (excluding the latest messages)
  const chatHistory = messages
    .slice(0, messages.length - dropHowMany)
    .filter(msg => msg.message && msg.message.trim() !== "")
    .map(msg => {
      if (msg.isUserMessage) {
        // Format user messages with text and any attached media
        const content = [
          { type: "text", text: msg.message }
        ];

        // Add images if any (using canonical snake_case field)
        if (msg.image_locations && msg.image_locations.length > 0) {
          msg.image_locations.forEach(imageUrl => {
            content.push({
              type: "image_url",
              image_url: { url: imageUrl }
            });
          });
        }

        // Add PDFs and audio files if any (using canonical snake_case field)
        const files = msg.file_locations || [];
        if (files.length > 0) {
          files.forEach(fileUri => {
            if (typeof fileUri === 'string') {
              if (fileUri.endsWith('.pdf')) {
                content.push({
                  type: "file_url",
                  file_url: { url: fileUri }
                });
              } else if (['.mp3', '.wav', '.m4a', '.ogg', '.webm'].some(ext => fileUri.endsWith(ext))) {
                content.push({
                  type: "audio_url",
                  audio_url: { url: fileUri }
                });
              }
            }
          });
        }

        return {
          role: "user",
          content: content
        };
      } else {
        // Format AI responses
        return {
          role: "assistant",
          content: msg.message
        };
      }
    });

  return chatHistory;
};

/**
 * Prepares the user prompt data for a streaming WebSocket request.
 * 
 * @param {Array} chatContent - The full chat content array from the state context
 * @param {Number} currentSessionIndex - Index of the current active session
 * @param {Number|null} chatItemBeingEditedPosition - Position of the message being edited, if any
 * @returns {Object} - Contains the userPrompt array and userActiveChatItem object
 */
export const prepareUserPrompt = (
  chatContent,
  currentSessionIndex,
  chatItemBeingEditedPosition = null
) => {
  const messages = chatContent[currentSessionIndex].messages;

  if (messages.length === 0) {
    return {
      userPrompt: [],
      userActiveChatItem: {
        message: "",
        isUserMessage: true,
        ai_character_name: ""
      }
    };
  }

  // Extract index from editMessagePosition object if needed
  const editIndex = chatItemBeingEditedPosition?.index ?? chatItemBeingEditedPosition;

  // Get either the last message or the one being edited
  const userActiveChatItem = editIndex !== null && editIndex !== undefined
    ? messages[editIndex]
    : messages[messages.length - 1];

  // Prepare the user prompt with text and any attachments
  const userPrompt = [
    { type: "text", text: userActiveChatItem.message }
  ];

  // Add images if any (using canonical snake_case field)
  if (userActiveChatItem.image_locations && userActiveChatItem.image_locations.length > 0) {
    userActiveChatItem.image_locations.forEach(imageUrl => {
      userPrompt.push({
        type: "image_url",
        image_url: { url: imageUrl }
      });
    });
  }

  // Add PDFs and audio files if any (using canonical snake_case field)
  const files = userActiveChatItem.file_locations || [];
  if (files.length > 0) {
    files.forEach(fileUri => {
      if (typeof fileUri === 'string') {
        if (fileUri.endsWith('.pdf')) {
          userPrompt.push({
            type: "file_url",
            file_url: { url: fileUri }
          });
        } else if (['.mp3', '.wav', '.m4a', '.ogg', '.webm'].some(ext => fileUri.endsWith(ext))) {
          userPrompt.push({
            type: "audio_url",
            audio_url: { url: fileUri }
          });
        }
      }
    });
  }

  return {
    userPrompt,
    userActiveChatItem
  };
};

/**
 * Prepares the settings dictionary for a WebSocket request, including any character-specific settings.
 * 
 * @param {Function} getSettings - Function to get the current user settings
 * @param {String} requestType - Type of request (audio, text, tts)
 * @returns {Object} - Prepared settings dictionary
 */
export const prepareSettingsForWebsocketsRequest = (getSettings, requestType = "audio") => {
  // Get the settings dictionary from the user settings
  const settings = getSettings();

  // Make a deep copy of the settings
  const settingsDict = JSON.parse(JSON.stringify(settings));

  // Extract individual settings categories
  const ttsSettings = settingsDict.tts || {};
  const textSettings = settingsDict.text || {};
  const speechSettings = settingsDict.speech || {};
  const generalSettings = settingsDict.general || {};

  // Update all settings
  settingsDict.tts = ttsSettings;
  settingsDict.text = textSettings;
  settingsDict.speech = speechSettings;
  settingsDict.general = generalSettings;

  return settingsDict;
};

/**
 * Prepares the complete user input payload for a WebSocket request,
 * matching the Kotlin implementation in StreamingUtils.kt.
 * 
 * @param {Array} userPrompt - The user's message and any attachments
 * @param {Array} chatHistory - Formatted chat history
 * @param {String} sessionId - ID of the current session
 * @param {Object} userActiveChatItem - User message that is currently active
 * @param {Object} aiResponseChatItem - AI response placeholder
 * @param {Object|null} chatItemBeingEditedPosition - Position of message being edited, if any
 * @param {String|null} audioFileName - Name of audio file, if applicable
 * @param {String} characterName - The AI character name
 * @param {Boolean} autoTriggerTts - Whether to auto-trigger TTS
 * @param {String} aiTextGenModel - The AI text generation model
 * @returns {Object} - Complete payload for the WebSocket request
 */
export const prepareUserInputForWebsocketsRequest = (
  userPrompt,
  chatHistory,
  sessionId,
  userActiveChatItem,
  aiResponseChatItem,
  chatItemBeingEditedPosition = null,
  audioFileName = null,
  characterName = "assistant",
  autoTriggerTts = false,
  aiTextGenModel = "gpt-4o-mini"
) => {
  // Ensure we have valid chat history
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory.filter(item => item !== null && item !== undefined) : [];

  // Check if the character has uiOption="image"
  const character = characters.find(char => char.nameForAPI === characterName);
  const hasImageUiOption = character && character.uiOption === "image";

  console.log("character:", character);
  console.log("hasImageUiOption:", hasImageUiOption);
  console.log("userPrompt:", userPrompt);

  // If character has uiOption="image", add image_mode to userPrompt
  if (hasImageUiOption && Array.isArray(userPrompt)) {
    // Add image_mode prompt item if it doesn't already exist
    const hasImageMode = userPrompt.some(item => item.type === "image_mode");
    if (!hasImageMode) {
      userPrompt.push({
        type: "image_mode",
        image_mode: "default"
      });
      console.log(`Added image_mode for character ${characterName} with prompt:`, userPrompt);
    }
  }

  console.log("userPrompt after:", userPrompt);

  // Ensure userMessage has all required fields (canonical snake_case format)
  const userMessage = {
    additional_info_after_post: "",
    additional_info_before_post: "",
    ai_character_name: userActiveChatItem.ai_character_name || "",
    created_at: userActiveChatItem.created_at || new Date().toISOString(),
    favorite: false,
    file_locations: userActiveChatItem.file_locations || [],
    image_locations: userActiveChatItem.image_locations || [],
    is_gps_location_message: userActiveChatItem.is_gps_location_message || false,
    is_tts: userActiveChatItem.is_tts || false,
    is_user_message: true,
    local_id: userActiveChatItem.local_id || generateUUID(),
    message: userActiveChatItem.message || "",
    offline_data_id: 0,
    show_transcribe_button: userActiveChatItem.show_transcribe_button || false
  };

  // Add message_id if editing (from userActiveChatItem)
  if (chatItemBeingEditedPosition !== null && userActiveChatItem.message_id) {
    userMessage.message_id = userActiveChatItem.message_id;
  }

  // Ensure aiResponse has all required fields (canonical snake_case format)
  const aiResponse = {
    additional_info_after_post: "",
    additional_info_before_post: "",
    ai_character_name: characterName,
    api_text_gen_model_name: aiTextGenModel,
    created_at: aiResponseChatItem.created_at || new Date().toISOString(),
    favorite: false,
    file_locations: aiResponseChatItem.file_locations || [],
    image_locations: aiResponseChatItem.image_locations || [],
    is_gps_location_message: false,
    is_tts: false,
    is_user_message: false,
    local_id: aiResponseChatItem.local_id || generateUUID(),
    message: aiResponseChatItem.message || "",
    offline_data_id: 0,
    show_transcribe_button: false
  };

  // Add message_id if editing and exists
  if (chatItemBeingEditedPosition !== null && aiResponseChatItem.message_id) {
    aiResponse.message_id = aiResponseChatItem.message_id;
  }

  // Build the user input map (canonical snake_case format)
  const userInputMap = {
    prompt: userPrompt || [],
    chat_history: validChatHistory,
    session_id: sessionId || "",
    user_message: userMessage,
    ai_response: aiResponse,
    auto_trigger_tts: autoTriggerTts,
    ai_text_gen_model: aiTextGenModel,
    new_ai_character_name: characterName,
    customer_id: getCustomerId() ?? 1,
    is_edited_message: chatItemBeingEditedPosition !== null,
    audio_file_name: audioFileName || ""
  };

  return userInputMap;
};

/**
 * Prepares a response chat item (empty AI message placeholder) for streaming updates.
 * 
 * @param {Array} chatContent - Full chat content array
 * @param {Number} currentSessionIndex - Current session index
 * @param {Number|null} chatItemBeingEditedPosition - Position of message being edited, if any
 * @param {String} characterNameForApi - Name of the AI character
 * @returns {Object} - Contains the message position and the chat item
 */
export const prepareResponseChatItem = (
  chatContent,
  currentSessionIndex,
  chatItemBeingEditedPosition = null,
  characterNameForApi = "assistant"
) => {
  // Format current date
  const messageDate = new Date().toISOString();

  // Extract index from editMessagePosition object if needed
  const editIndex = chatItemBeingEditedPosition?.index ?? chatItemBeingEditedPosition;

  let currentResponseItemPosition;
  let finalChatItem;

  if (editIndex === null || editIndex === undefined) {
    // This is a new message
    finalChatItem = {
      message: "",
      isUserMessage: false,
      ai_character_name: characterNameForApi,
      api_text_gen_model_name: "gpt-4o-mini", // Could be retrieved from config
      created_at: messageDate,
      localId: generateUUID(),
      additionalInfoAfterPost: "",
      additionalInfoBeforePost: "",
      favorite: false,
      file_locations: [],
      image_locations: [],
      isGPSLocationMessage: false,
      isTTS: false,
      offlineDataId: 0,
      showTranscribeButton: false
    };

    // In a real implementation, this would add the message to the session
    // For now, we'll just determine its position
    currentResponseItemPosition = chatContent[currentSessionIndex].messages.length;
  } else {
    // This is an edited message, replace the existing response
    currentResponseItemPosition = editIndex + 1;
    const messages = chatContent[currentSessionIndex].messages;

    if (currentResponseItemPosition > messages.length - 1) {
      // If it's a new message after editing, create a new item
      finalChatItem = {
        message: "",
        isUserMessage: false,
        ai_character_name: characterNameForApi,
        api_text_gen_model_name: "gpt-4o-mini", // Could be retrieved from config
        created_at: messageDate,
        localId: generateUUID(),
        additionalInfoBeforePost: "",
        additionalInfoAfterPost: "",
        favorite: false,
        file_locations: [],
        image_locations: [],
        isGPSLocationMessage: false,
        isTTS: false,
        offlineDataId: 0,
        showTranscribeButton: false
      };
      // In a real implementation, this would add the message to the session
    } else {
      // Update the existing response
      finalChatItem = {
        ...messages[currentResponseItemPosition],
        message: "",
        ai_character_name: characterNameForApi,
        api_text_gen_model_name: "gpt-4o-mini", // Could be retrieved from config
        created_at: messageDate,
        localId: messages[currentResponseItemPosition].message_id || generateUUID(),
        file_locations: [],
        additionalInfoBeforePost: "",
        additionalInfoAfterPost: "",
        favorite: false,
        image_locations: [],
        isGPSLocationMessage: false,
        isTTS: false,
        offlineDataId: 0,
        showTranscribeButton: false
      };
      // In a real implementation, this would update the message in the session
    }
  }

  return {
    position: currentResponseItemPosition,
    chatItem: finalChatItem
  };
};

/**
 * Prepares userInput payload for audio mode WebSocket requests.
 * This matches the structure that Kotlin sends for audio recording.
 *
 * @param {Object} params - Parameters for building the userInput
 * @param {Array} params.chatContent - Full chat content array
 * @param {Number} params.currentSessionIndex - Current session index
 * @param {String} params.characterName - AI character name
 * @param {String} params.aiTextGenModel - Model name for text generation
 * @returns {Object} - Complete userInput payload for audio mode
 */
export const prepareAudioUserInput = ({
  chatContent,
  currentSessionIndex,
  characterName = "assistant",
  aiTextGenModel = "gpt-4o-mini"
}) => {
  const currentSession = chatContent[currentSessionIndex];
  const sessionId = currentSession?.session_id || "";
  const messageDate = new Date().toISOString().replace('T', ' ').substring(0, 16);

  // Prepare chat history (excluding current message being recorded)
  const chatHistory = prepareChatHistory(chatContent, currentSessionIndex, null);

  // Create user message placeholder (empty - will be filled with transcription)
  const userMessage = {
    additional_info_after_post: "",
    additional_info_before_post: "",
    ai_character_name: "",
    created_at: messageDate,
    favorite: false,
    file_locations: [],
    image_locations: [],
    is_gps_location_message: false,
    is_tts: false,
    is_user_message: true,
    local_id: generateUUID(),
    message: "",  // Empty - will be filled with transcription
    offline_data_id: 0,
    show_transcribe_button: true
  };

  // Create AI response placeholder (canonical snake_case format)
  const aiResponse = {
    additional_info_after_post: "",
    additional_info_before_post: "",
    ai_character_name: characterName,
    api_text_gen_model_name: aiTextGenModel,
    created_at: messageDate,
    favorite: false,
    file_locations: [],
    image_locations: [],
    is_gps_location_message: false,
    is_tts: false,
    is_user_message: false,
    local_id: generateUUID(),
    message: "",
    offline_data_id: 0,
    show_transcribe_button: true
  };

  return {
    prompt: [{ type: "text", text: "" }],  // Empty - will be filled with transcription
    chat_history: chatHistory,
    session_id: sessionId,
    user_message: userMessage,
    ai_response: aiResponse,
    auto_trigger_tts: false,
    ai_text_gen_model: aiTextGenModel,
    new_ai_character_name: characterName,
    customer_id: getCustomerId() ?? 1,
    is_edited_message: false,
    audio_file_name: ""
  };
};