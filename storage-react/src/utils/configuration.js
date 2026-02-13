// utils/configuration.js

// Keys
const APP_MODE_PRODUCTION = "app_mode_production";
const APP_MODE_API_URL = "app_mode_api_url";
const APP_MODE_USE_WATSON = "app_mode_use_watson";
const TEXT_MODEL_NAME = "text_model_name";
const TEXT_TEMPERATURE = "text_temperature";
const TEXT_MEMORY_SIZE = "text_memory_size";
const TEXT_STREAMING = "text_streaming";
const TEXT_FILE_ATTACHED_MESSAGE_LIMIT = "text_file_attached_message_limit";
const TEXT_SHOW_REASONING = "text_show_reasoning";
const TEXT_ENABLE_REASONING = "text_enable_reasoning";
const TEXT_REASONING_EFFORT = "text_reasoning_effort";
const TEXT_MODEL_TO_BE_USED_WITH_WEBSEARCH = "text_model_to_be_used_with_websearch";
const GENERAL_USE_BLUETOOTH = "general_use_bluetooth";
const GENERAL_TEST_DATA = "general_test_data";
const GENERAL_DOWNLOAD_AUDIO_FILES_BEFORE_PLAYING = "general_download_audio_files_before_playing";
const GENERAL_SHOW_MESSAGE_INFO_BOTTOM_RIGHT = "general_show_message_info_bottom_right";
const GENERAL_AI_AGENT_ENABLED = "general_ai_agent_enabled";
const GENERAL_WEBSEARCH_ENABLED = "general_websearch_enabled";
const GENERAL_DEEP_RESEARCH_ENABLED = "general_deep_research_enabled";
const GENERAL_USE_WEBSOCKETS = "general_use_websockets";
const SPEECH_MODEL_NAME = "speech_model_name";
const SPEECH_LANGUAGE = "speech_language";
const SPEECH_TEMPERATURE = "speech_temperature";
const SPEECH_REALTIME_VOICE = "speech_realtime_voice";
const SPEECH_REALTIME_CONVERSATION_MODE = "speech_realtime_conversation_mode";
const SPEECH_RECORDING_SAMPLE_RATE = "speech_recording_sample_rate";
const TTS_STABILITY = "tts_stability";
const TTS_SIMILARITY = "tts_similarity";
const TTS_VOICE = "tts_voice";
const TTS_STREAMING = "tts_streaming";
const TTS_SPEED = "tts_speed";
const TTS_MODEL_NAME = "tts_model_name";
const TTS_AUTO_EXECUTE = "tts_auto_execute";
const IMAGE_MODEL_NAME = "image_model_name";
const IMAGE_NUMBER_IMAGES = "image_number_images";
const IMAGE_SIZE = "image_model_size";
const IMAGE_STEPS = "image_steps";
const IMAGE_QUALITY_HD = "image_quality_id";
const IMAGE_DISABLE_SAFE_PROMPT = "image_disable_safe_prompt";
const IMAGE_AUTO_GENERATE_IMAGE = "image_auto_generate_image";
const IMAGE_ARTGEN_SHOW_PROMPT = "image_artgen_show_prompt";
const IMAGE_FLUX_PROMPT_UPSAMPLING = "image_flux_prompt_upsampling";
const IMAGE_FLUX_GUIDANCE = "image_flux_guidance";
const IMAGE_FLUX_EDIT_MODE_STEPS = "image_flux_edit_mode_steps";
const IMAGE_FLUX_EDIT_MODE_GUIDANCE = "image_flux_edit_mode_guidance";
const IMAGE_FLUX_RAW_MODE = "image_flux_raw_mode";
const IMAGE_FLUX_IMAGE_PROMPT_STRENGTH = "image_flux_image_prompt_strength";
const IMAGE_FLUX_TOOLS_IMG2IMG_MODE = "image_flux_tools_img2img_mode";
const IMAGE_SD_STYLE_PRESET = "image_sd_style_preset";
const IMAGE_SD_IMAGE_PROMPT_STRENGTH = "image_sd_image_prompt_strength";
const IMAGE_SD_NEGATIVE_PROMPT = "image_sd_negative_prompt";
const IMAGE_SD_CFG_SCALE = "image_sd_cfg_scale";
const IMAGE_SD_SD35_TURBO_MODE = "image_sd_sd35_turbo_mode";
const IMAGE_REVISE_PROMPT = "image_revise_prompt";
const IMAGE_ASPECT_RATIO = "image_aspect_ratio";
const IMAGE_MODE = "image_mode";
const IMAGE_EDIT_MODE = "image_edit_mode";
const IMAGE_USE_LQ_IMAGES = "image_use_lq_images";
const AUTH_TOKEN_FOR_BACKEND = "auth_token_for_backend";
const CUSTOMER_ID = "customer_id";

// Default values
const defaultSettings = {
  [APP_MODE_PRODUCTION]: true,
  [APP_MODE_API_URL]: "https://www.goodtogreat.life/",
  [APP_MODE_USE_WATSON]: false,
  [TEXT_MODEL_NAME]: "GPT-4o-mini",
  [TEXT_TEMPERATURE]: 0.1,
  [TEXT_MEMORY_SIZE]: 2000,
  [TEXT_STREAMING]: true,
  [TEXT_FILE_ATTACHED_MESSAGE_LIMIT]: 3,
  [TEXT_SHOW_REASONING]: false,
  [TEXT_ENABLE_REASONING]: false,
  [TEXT_REASONING_EFFORT]: 0.0,
  [TEXT_MODEL_TO_BE_USED_WITH_WEBSEARCH]: "sonar",
  [GENERAL_USE_BLUETOOTH]: false,
  [GENERAL_USE_WEBSOCKETS]: true,
  [GENERAL_TEST_DATA]: false,
  [GENERAL_DOWNLOAD_AUDIO_FILES_BEFORE_PLAYING]: true,
  [GENERAL_SHOW_MESSAGE_INFO_BOTTOM_RIGHT]: false,
  [GENERAL_AI_AGENT_ENABLED]: false,
  [GENERAL_WEBSEARCH_ENABLED]: false,
  [GENERAL_DEEP_RESEARCH_ENABLED]: false,
  [SPEECH_LANGUAGE]: "en",
  [SPEECH_MODEL_NAME]: "deepgram-nova-3",
  [SPEECH_TEMPERATURE]: 0.0,
  [SPEECH_REALTIME_VOICE]: "verse",
  [SPEECH_REALTIME_CONVERSATION_MODE]: true,
  [SPEECH_RECORDING_SAMPLE_RATE]: 16000,
  [TTS_STABILITY]: 0.0,
  [TTS_SIMILARITY]: 0.0,
  [TTS_VOICE]: "alloy",
  [TTS_STREAMING]: false,
  [TTS_SPEED]: 1.0,
  [TTS_MODEL_NAME]: "tts-1",
  [TTS_AUTO_EXECUTE]: false,
  [IMAGE_MODEL_NAME]: "dall-e-3",
  [IMAGE_NUMBER_IMAGES]: 1,
  [IMAGE_SIZE]: 1024,
  [IMAGE_QUALITY_HD]: false,
  [IMAGE_DISABLE_SAFE_PROMPT]: false,
  [IMAGE_AUTO_GENERATE_IMAGE]: false,
  [IMAGE_ARTGEN_SHOW_PROMPT]: false,
  [IMAGE_FLUX_PROMPT_UPSAMPLING]: false,
  [IMAGE_FLUX_GUIDANCE]: 2.0,
  [IMAGE_FLUX_EDIT_MODE_STEPS]: 50,
  [IMAGE_FLUX_EDIT_MODE_GUIDANCE]: 5.0,
  [IMAGE_FLUX_RAW_MODE]: false,
  [IMAGE_FLUX_IMAGE_PROMPT_STRENGTH]: 0.1,
  [IMAGE_FLUX_TOOLS_IMG2IMG_MODE]: "canny",
  [IMAGE_SD_STYLE_PRESET]: "none",
  [IMAGE_SD_IMAGE_PROMPT_STRENGTH]: 0.1,
  [IMAGE_SD_NEGATIVE_PROMPT]: "",
  [IMAGE_SD_CFG_SCALE]: 7.0,
  [IMAGE_SD_SD35_TURBO_MODE]: false,
  [IMAGE_REVISE_PROMPT]: true,
  [IMAGE_ASPECT_RATIO]: 0,
  [IMAGE_STEPS]: 28,
  [IMAGE_MODE]: "default",
  [IMAGE_EDIT_MODE]: "inpaint",
  [IMAGE_USE_LQ_IMAGES]: false,
  [AUTH_TOKEN_FOR_BACKEND]: "",
  [CUSTOMER_ID]: 1,
};

// Utility function to convert types
const convertType = (key, value) => {
  const typeMap = {
    [TEXT_TEMPERATURE]: 'float',
    [TEXT_MEMORY_SIZE]: 'int',
    [TEXT_FILE_ATTACHED_MESSAGE_LIMIT]: 'int',
    [SPEECH_TEMPERATURE]: 'float',
    [SPEECH_RECORDING_SAMPLE_RATE]: 'int',
    [TTS_STABILITY]: 'float',
    [TTS_SIMILARITY]: 'float',
    [TTS_SPEED]: 'float',
    [IMAGE_NUMBER_IMAGES]: 'int',
    [IMAGE_SIZE]: 'int',
    [IMAGE_STEPS]: 'int',
    [IMAGE_QUALITY_HD]: 'boolean',
    [IMAGE_DISABLE_SAFE_PROMPT]: 'boolean',
    [IMAGE_AUTO_GENERATE_IMAGE]: 'boolean',
    [IMAGE_ARTGEN_SHOW_PROMPT]: 'boolean',
    [IMAGE_FLUX_PROMPT_UPSAMPLING]: 'boolean',
    [IMAGE_FLUX_GUIDANCE]: 'float',
    [IMAGE_FLUX_EDIT_MODE_STEPS]: 'int',
    [IMAGE_FLUX_EDIT_MODE_GUIDANCE]: 'float',
    [IMAGE_FLUX_RAW_MODE]: 'boolean',
    [IMAGE_FLUX_IMAGE_PROMPT_STRENGTH]: 'float',
    [IMAGE_FLUX_TOOLS_IMG2IMG_MODE]: 'string',
    [IMAGE_SD_STYLE_PRESET]: 'string',
    [IMAGE_SD_IMAGE_PROMPT_STRENGTH]: 'float',
    [CUSTOMER_ID]: 'int',
  };

  const type = typeMap[key];
  switch (type) {
    case 'int':
      return parseInt(value, 10);
    case 'float':
      return parseFloat(value);
    case 'boolean':
      return value === 'true';
    default:
      return value;
  }
};

const getItem = (key, defaultValue) => {
  const value = localStorage.getItem(key);
  if (value !== null) {
    return convertType(key, JSON.parse(value));
  }
  return defaultValue;
};

const setItem = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};



// Getter methods
export const getIsProdMode = () => getItem(APP_MODE_PRODUCTION, defaultSettings[APP_MODE_PRODUCTION]);
export const getAppModeApiUrl = () => getItem(APP_MODE_API_URL, defaultSettings[APP_MODE_API_URL]);
export const getAppModeUseWatson = () => getItem(APP_MODE_USE_WATSON, defaultSettings[APP_MODE_USE_WATSON]);
export const getDownloadAudioFilesBeforePlaying = () => getItem(GENERAL_DOWNLOAD_AUDIO_FILES_BEFORE_PLAYING, defaultSettings[GENERAL_DOWNLOAD_AUDIO_FILES_BEFORE_PLAYING]);
export const getUseWebsockets = () => getItem(GENERAL_USE_WEBSOCKETS, defaultSettings[GENERAL_USE_WEBSOCKETS]);
export const getTextModelName = () => getItem(TEXT_MODEL_NAME, defaultSettings[TEXT_MODEL_NAME]);
export const getTextTemperature = () => getItem(TEXT_TEMPERATURE, defaultSettings[TEXT_TEMPERATURE]);
export const getTextMemorySize = () => getItem(TEXT_MEMORY_SIZE, defaultSettings[TEXT_MEMORY_SIZE]);
export const getTextShowReasoning = () => getItem(TEXT_SHOW_REASONING, defaultSettings[TEXT_SHOW_REASONING]);
export const getTextEnableReasoning = () => getItem(TEXT_ENABLE_REASONING, defaultSettings[TEXT_ENABLE_REASONING]);
export const getTextReasoningEffort = () => getItem(TEXT_REASONING_EFFORT, defaultSettings[TEXT_REASONING_EFFORT]);
export const getTextModelToBeUsedWithWebsearch = () => getItem(TEXT_MODEL_TO_BE_USED_WITH_WEBSEARCH, defaultSettings[TEXT_MODEL_TO_BE_USED_WITH_WEBSEARCH]);
export const getTextFileAttachedMessageLimit = () => getItem(TEXT_FILE_ATTACHED_MESSAGE_LIMIT, defaultSettings[TEXT_FILE_ATTACHED_MESSAGE_LIMIT]);
export const getIsStreamingEnabled = () => getItem(TEXT_STREAMING, defaultSettings[TEXT_STREAMING]);
export const getTextStreaming = () => getItem(TEXT_STREAMING, defaultSettings[TEXT_STREAMING]);
export const getUseBluetooth = () => getItem(GENERAL_USE_BLUETOOTH, defaultSettings[GENERAL_USE_BLUETOOTH]);
export const getUseTestData = () => getItem(GENERAL_TEST_DATA, defaultSettings[GENERAL_TEST_DATA]);
export const getGeneralShowMessageInfoBottomRight = () => getItem(GENERAL_SHOW_MESSAGE_INFO_BOTTOM_RIGHT, defaultSettings[GENERAL_SHOW_MESSAGE_INFO_BOTTOM_RIGHT]);
export const getGeneralAiAgentEnabled = () => getItem(GENERAL_AI_AGENT_ENABLED, defaultSettings[GENERAL_AI_AGENT_ENABLED]);
export const getGeneralWebsearchEnabled = () => getItem(GENERAL_WEBSEARCH_ENABLED, defaultSettings[GENERAL_WEBSEARCH_ENABLED]);
export const getGeneralDeepResearchEnabled = () => getItem(GENERAL_DEEP_RESEARCH_ENABLED, defaultSettings[GENERAL_DEEP_RESEARCH_ENABLED]);
export const getSpeechLanguage = () => getItem(SPEECH_LANGUAGE, defaultSettings[SPEECH_LANGUAGE]);
export const getSpeechTemperature = () => getItem(SPEECH_TEMPERATURE, defaultSettings[SPEECH_TEMPERATURE]);
export const getSpeechRealtimeVoice = () => getItem(SPEECH_REALTIME_VOICE, defaultSettings[SPEECH_REALTIME_VOICE]);
export const getSpeechRealtimeConversationMode = () => getItem(SPEECH_REALTIME_CONVERSATION_MODE, defaultSettings[SPEECH_REALTIME_CONVERSATION_MODE]);
export const getSpeechRecordingSampleRate = () => getItem(SPEECH_RECORDING_SAMPLE_RATE, defaultSettings[SPEECH_RECORDING_SAMPLE_RATE]);
export const getSpeechModelName = () => getItem(SPEECH_MODEL_NAME, defaultSettings[SPEECH_MODEL_NAME]);
export const getTTSStability = () => getItem(TTS_STABILITY, defaultSettings[TTS_STABILITY]);
export const getTTSSimilarity = () => getItem(TTS_SIMILARITY, defaultSettings[TTS_SIMILARITY]);
export const getTTSVoice = () => getItem(TTS_VOICE, defaultSettings[TTS_VOICE]);
export const getTTSStreaming = () => getItem(TTS_STREAMING, defaultSettings[TTS_STREAMING]);
export const getTTSSpeed = () => getItem(TTS_SPEED, defaultSettings[TTS_SPEED]);
export const getTTSModelName = () => getItem(TTS_MODEL_NAME, defaultSettings[TTS_MODEL_NAME]);
export const getTTSAutoExecute = () => getItem(TTS_AUTO_EXECUTE, defaultSettings[TTS_AUTO_EXECUTE]);
export const getImageModelName = () => getItem(IMAGE_MODEL_NAME, defaultSettings[IMAGE_MODEL_NAME]);
export const getImageNumberImages = () => getItem(IMAGE_NUMBER_IMAGES, defaultSettings[IMAGE_NUMBER_IMAGES]);
export const getImageSize = () => getItem(IMAGE_SIZE, defaultSettings[IMAGE_SIZE]);
export const getImageSteps = () => getItem(IMAGE_STEPS, defaultSettings[IMAGE_STEPS]);
export const getImageQualityHD = () => getItem(IMAGE_QUALITY_HD, defaultSettings[IMAGE_QUALITY_HD]);
export const getImageDisableSafePrompt = () => getItem(IMAGE_DISABLE_SAFE_PROMPT, defaultSettings[IMAGE_DISABLE_SAFE_PROMPT]);
export const getImageAutoGenerateImage = () => getItem(IMAGE_AUTO_GENERATE_IMAGE, defaultSettings[IMAGE_AUTO_GENERATE_IMAGE]);
export const getImageArtgenShowPrompt = () => getItem(IMAGE_ARTGEN_SHOW_PROMPT, defaultSettings[IMAGE_ARTGEN_SHOW_PROMPT]);
export const getImageFluxPromptUpsampling = () => getItem(IMAGE_FLUX_PROMPT_UPSAMPLING, defaultSettings[IMAGE_FLUX_PROMPT_UPSAMPLING]);
export const getImageFluxGuidance = () => getItem(IMAGE_FLUX_GUIDANCE, defaultSettings[IMAGE_FLUX_GUIDANCE]);
export const getImageFluxEditModeSteps = () => getItem(IMAGE_FLUX_EDIT_MODE_STEPS, defaultSettings[IMAGE_FLUX_EDIT_MODE_STEPS]);
export const getImageFluxEditModeGuidance = () => getItem(IMAGE_FLUX_EDIT_MODE_GUIDANCE, defaultSettings[IMAGE_FLUX_EDIT_MODE_GUIDANCE]);
export const getImageFluxRawMode = () => getItem(IMAGE_FLUX_RAW_MODE, defaultSettings[IMAGE_FLUX_RAW_MODE]);
export const getImageFluxImagePromptStrength = () => getItem(IMAGE_FLUX_IMAGE_PROMPT_STRENGTH, defaultSettings[IMAGE_FLUX_IMAGE_PROMPT_STRENGTH]);
export const getImageFluxToolsImg2ImgMode = () => getItem(IMAGE_FLUX_TOOLS_IMG2IMG_MODE, defaultSettings[IMAGE_FLUX_TOOLS_IMG2IMG_MODE]);
export const getImageSdStylePreset = () => getItem(IMAGE_SD_STYLE_PRESET, defaultSettings[IMAGE_SD_STYLE_PRESET]);
export const getImageSdImagePromptStrength = () => getItem(IMAGE_SD_IMAGE_PROMPT_STRENGTH, defaultSettings[IMAGE_SD_IMAGE_PROMPT_STRENGTH]);
export const getImageSdNegativePrompt = () => getItem(IMAGE_SD_NEGATIVE_PROMPT, defaultSettings[IMAGE_SD_NEGATIVE_PROMPT]);
export const getImageSdCfgScale = () => getItem(IMAGE_SD_CFG_SCALE, defaultSettings[IMAGE_SD_CFG_SCALE]);
export const getImageSdSd35TurboMode = () => getItem(IMAGE_SD_SD35_TURBO_MODE, defaultSettings[IMAGE_SD_SD35_TURBO_MODE]);
export const getImageRevisePrompt = () => getItem(IMAGE_REVISE_PROMPT, defaultSettings[IMAGE_REVISE_PROMPT]);
export const getImageAspectRatio = () => getItem(IMAGE_ASPECT_RATIO, defaultSettings[IMAGE_ASPECT_RATIO]);
export const getImageMode = () => getItem(IMAGE_MODE, defaultSettings[IMAGE_MODE]);
export const getImageEditMode = () => getItem(IMAGE_EDIT_MODE, defaultSettings[IMAGE_EDIT_MODE]);
export const getImageUseLqImages = () => getItem(IMAGE_USE_LQ_IMAGES, defaultSettings[IMAGE_USE_LQ_IMAGES]);
export const getAuthTokenForBackend = () => getItem(AUTH_TOKEN_FOR_BACKEND, defaultSettings[AUTH_TOKEN_FOR_BACKEND]);
export const getCustomerId = () => getItem(CUSTOMER_ID, defaultSettings[CUSTOMER_ID]);

// Setter methods
export const setIsProdMode = (value) => setItem(APP_MODE_PRODUCTION, value);
export const setAppModeApiUrl = (value) => setItem(APP_MODE_API_URL, value);
export const setAppModeUseWatson = (value) => setItem(APP_MODE_USE_WATSON, value);
export const setDownloadAudioFilesBeforePlaying = (value) => setItem(GENERAL_DOWNLOAD_AUDIO_FILES_BEFORE_PLAYING, value);
export const setUseWebsockets = (value) => setItem(GENERAL_USE_WEBSOCKETS, value);
export const setTextModelName = (value) => setItem(TEXT_MODEL_NAME, value);
export const setTextTemperature = (value) => setItem(TEXT_TEMPERATURE, value);
export const setTextMemorySize = (value) => setItem(TEXT_MEMORY_SIZE, value);
export const setTextFileAttachedMessageLimit = (value) => setItem(TEXT_FILE_ATTACHED_MESSAGE_LIMIT, value);
export const setTextShowReasoning = (value) => setItem(TEXT_SHOW_REASONING, value);
export const setTextEnableReasoning = (value) => setItem(TEXT_ENABLE_REASONING, value);
export const setTextReasoningEffort = (value) => setItem(TEXT_REASONING_EFFORT, value);
export const setTextModelToBeUsedWithWebsearch = (value) => setItem(TEXT_MODEL_TO_BE_USED_WITH_WEBSEARCH, value);
export const setIsStreamingEnabled = (value) => setItem(TEXT_STREAMING, value);
export const setUseBluetooth = (value) => setItem(GENERAL_USE_BLUETOOTH, value);
export const setUseTestData = (value) => setItem(GENERAL_TEST_DATA, value);
export const setGeneralShowMessageInfoBottomRight = (value) => setItem(GENERAL_SHOW_MESSAGE_INFO_BOTTOM_RIGHT, value);
export const setGeneralAiAgentEnabled = (value) => setItem(GENERAL_AI_AGENT_ENABLED, value);
export const setGeneralWebsearchEnabled = (value) => setItem(GENERAL_WEBSEARCH_ENABLED, value);
export const setGeneralDeepResearchEnabled = (value) => setItem(GENERAL_DEEP_RESEARCH_ENABLED, value);
export const setSpeechLanguage = (value) => setItem(SPEECH_LANGUAGE, value.toLowerCase());
export const setSpeechTemperature = (value) => setItem(SPEECH_TEMPERATURE, value);
export const setSpeechRealtimeVoice = (value) => setItem(SPEECH_REALTIME_VOICE, value);
export const setSpeechRealtimeConversationMode = (value) => setItem(SPEECH_REALTIME_CONVERSATION_MODE, value);
export const setSpeechRecordingSampleRate = (value) => setItem(SPEECH_RECORDING_SAMPLE_RATE, value);
export const setSpeechModelName = (value) => setItem(SPEECH_MODEL_NAME, value);
export const setTTSStability = (value) => setItem(TTS_STABILITY, value);
export const setTTSSimilarity = (value) => setItem(TTS_SIMILARITY, value);
export const setTTSVoice = (value) => setItem(TTS_VOICE, value);
export const setTTSStreaming = (value) => setItem(TTS_STREAMING, value);
export const setTTSSpeed = (value) => setItem(TTS_SPEED, value);
export const setTTSModelName = (value) => setItem(TTS_MODEL_NAME, value);
export const setTTSAutoExecute = (value) => setItem(TTS_AUTO_EXECUTE, value);
export const setImageModelName = (value) => setItem(IMAGE_MODEL_NAME, value);
export const setImageNumberImages = (value) => setItem(IMAGE_NUMBER_IMAGES, value);
export const setImageSize = (value) => setItem(IMAGE_SIZE, value);
export const setImageSteps = (value) => setItem(IMAGE_STEPS, value);
export const setImageQualityHD = (value) => setItem(IMAGE_QUALITY_HD, value);
export const setImageDisableSafePrompt = (value) => setItem(IMAGE_DISABLE_SAFE_PROMPT, value);
export const setImageAutoGenerateImage = (value) => setItem(IMAGE_AUTO_GENERATE_IMAGE, value);
export const setImageArtgenShowPrompt = (value) => setItem(IMAGE_ARTGEN_SHOW_PROMPT, value);
export const setImageFluxPromptUpsampling = (value) => setItem(IMAGE_FLUX_PROMPT_UPSAMPLING, value);
export const setImageFluxGuidance = (value) => setItem(IMAGE_FLUX_GUIDANCE, value);
export const setImageFluxEditModeSteps = (value) => setItem(IMAGE_FLUX_EDIT_MODE_STEPS, value);
export const setImageFluxEditModeGuidance = (value) => setItem(IMAGE_FLUX_EDIT_MODE_GUIDANCE, value);
export const setImageFluxRawMode = (value) => setItem(IMAGE_FLUX_RAW_MODE, value);
export const setImageFluxImagePromptStrength = (value) => setItem(IMAGE_FLUX_IMAGE_PROMPT_STRENGTH, value);
export const setImageFluxToolsImg2ImgMode = (value) => setItem(IMAGE_FLUX_TOOLS_IMG2IMG_MODE, value);
export const setImageSdStylePreset = (value) => setItem(IMAGE_SD_STYLE_PRESET, value);
export const setImageSdImagePromptStrength = (value) => setItem(IMAGE_SD_IMAGE_PROMPT_STRENGTH, value);
export const setImageSdNegativePrompt = (value) => setItem(IMAGE_SD_NEGATIVE_PROMPT, value);
export const setImageSdCfgScale = (value) => setItem(IMAGE_SD_CFG_SCALE, value);
export const setImageSdSd35TurboMode = (value) => setItem(IMAGE_SD_SD35_TURBO_MODE, value);
export const setImageRevisePrompt = (value) => setItem(IMAGE_REVISE_PROMPT, value);
export const setImageAspectRatio = (value) => setItem(IMAGE_ASPECT_RATIO, value);
export const setImageMode = (value) => setItem(IMAGE_MODE, value);
export const setImageEditMode = (value) => setItem(IMAGE_EDIT_MODE, value);
export const setImageUseLqImages = (value) => setItem(IMAGE_USE_LQ_IMAGES, value);
export const setAuthTokenForBackend = (value) => setItem(AUTH_TOKEN_FOR_BACKEND, value);
export const setCustomerId = (value) => setItem(CUSTOMER_ID, value);

// Depending if it's production mode and also depending on which internal API server is in use
export const setURLForAPICalls = () => {
  const url = getIsProdMode()
    ? "https://www.goodtogreat.life"
    //: getAppModeUseWatson()
    // : "http://192.168.1.123:8000" // watson ES
    //: "http://192.168.23.64:8000"; // watson PT
    //: "http://192.168.1.150:8000";
    //: "http://localhost:8023";
    : "http://localhost:8000";
  //: "http://192.168.23.88:8023";
  //: "http://192.168.97.164:8023";
  setAppModeApiUrl(url);
};
