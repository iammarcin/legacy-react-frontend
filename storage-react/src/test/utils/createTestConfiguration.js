import {
  setTextTemperature,
  setTextModelName,
  setTextMemorySize,
  setIsStreamingEnabled,
  setTextFileAttachedMessageLimit,
  setTextEnableReasoning,
  setTextReasoningEffort,
  setTextModelToBeUsedWithWebsearch,
  setGeneralWebsearchEnabled,
  setGeneralDeepResearchEnabled,
  setTTSStability,
  setTTSSimilarity,
  setTTSVoice,
  setTTSStreaming,
  setTTSSpeed,
  setTTSModelName,
  setTTSAutoExecute,
  setSpeechLanguage,
  setSpeechTemperature,
  setSpeechModelName,
  setSpeechRealtimeVoice,
  setSpeechRealtimeConversationMode,
  setSpeechRecordingSampleRate,
  setImageModelName,
  setImageNumberImages,
  setImageSize,
  setImageQualityHD,
  setImageDisableSafePrompt,
  setImageFluxPromptUpsampling,
  setImageFluxGuidance,
  setImageFluxEditModeSteps,
  setImageFluxEditModeGuidance,
  setImageFluxRawMode,
  setImageFluxImagePromptStrength,
  setImageSteps,
  setImageFluxToolsImg2ImgMode,
  setImageSdStylePreset,
  setImageSdImagePromptStrength,
  setImageSdNegativePrompt,
  setImageSdCfgScale,
  setImageSdSd35TurboMode,
  setImageRevisePrompt,
  setImageAspectRatio,
  setImageMode,
  setImageEditMode,
  setUseTestData,
  setGeneralAiAgentEnabled,
  setUseWebsockets,
  setCustomerId,
  setAuthTokenForBackend,
} from '../../utils/configuration';

export const DEFAULT_TEST_CONFIGURATION = {
  meta: {
    useWebsockets: true,
    customerId: 1,
  },
  text: {
    temperature: 0.1,
    model: 'GPT-4o-mini',
    memorySize: 2000,
    streaming: true,
    fileAttachedMessageLimit: 3,
    enableReasoning: false,
    reasoningEffort: 0.0,
    websearchModel: 'sonar',
    websearchEnabled: false,
    deepResearchEnabled: false,
  },
  tts: {
    stability: 0.0,
    similarityBoost: 0.0,
    voice: 'alloy',
    streaming: false,
    speed: 1.0,
    model: 'tts-1',
    autoExecute: false,
  },
  speech: {
    language: 'en',
    temperature: 0.0,
    model: 'deepgram-nova-3',
    realtimeVoice: 'verse',
    realtimeConversationMode: true,
    recordingSampleRate: 16000,
  },
  image: {
    model: 'dall-e-3',
    numberOfImages: 1,
    sizeOfImage: 1024,
    qualityHd: false,
    disableSafePromptAdjust: false,
    fluxPromptUpsampling: false,
    fluxGuidance: 2.0,
    fluxEditModeSteps: 50,
    fluxEditModeGuidance: 5.0,
    fluxRawMode: false,
    fluxImagePromptStrength: 0.1,
    steps: 28,
    fluxToolsImg2ImgMode: 'canny',
    sdStylePreset: 'none',
    sdImagePromptStrength: 0.1,
    sdNegativePrompt: '',
    sdCfgScale: 7.0,
    sdSd35TurboMode: false,
    revisedPrompt: true,
    imageAspectRatio: 0,
    imageMode: 'default',
    imageEditMode: 'inpaint',
  },
  general: {
    returnTestData: false,
    aiAgentEnabled: false,
  },
  auth: {
    token: 'test-token',
    expiration: () => new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  },
};

const deepMerge = (base, overrides) => {
  if (!overrides) {
    return base;
  }
  const result = Array.isArray(base) ? [...base] : { ...base };
  Object.entries(overrides).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof base[key] === 'object' && base[key] !== null && !Array.isArray(base[key])) {
      result[key] = deepMerge(base[key], value);
    } else {
      result[key] = value;
    }
  });
  return result;
};

export const clearTestConfiguration = () => {
  localStorage.clear();
  sessionStorage.clear();
};

const seedTextConfiguration = (config) => {
  setTextTemperature(config.temperature);
  setTextModelName(config.model);
  setTextMemorySize(config.memorySize);
  setIsStreamingEnabled(config.streaming);
  setTextFileAttachedMessageLimit(config.fileAttachedMessageLimit);
  setTextEnableReasoning(config.enableReasoning);
  setTextReasoningEffort(config.reasoningEffort);
  setTextModelToBeUsedWithWebsearch(config.websearchModel);
  setGeneralWebsearchEnabled(config.websearchEnabled);
  setGeneralDeepResearchEnabled(config.deepResearchEnabled);
};

const seedTTSConfiguration = (config) => {
  setTTSStability(config.stability);
  setTTSSimilarity(config.similarityBoost);
  setTTSVoice(config.voice);
  setTTSStreaming(config.streaming);
  setTTSSpeed(config.speed);
  setTTSModelName(config.model);
  setTTSAutoExecute(config.autoExecute);
};

const seedSpeechConfiguration = (config) => {
  setSpeechLanguage(config.language);
  setSpeechTemperature(config.temperature);
  setSpeechModelName(config.model);
  setSpeechRealtimeVoice(config.realtimeVoice);
  setSpeechRealtimeConversationMode(config.realtimeConversationMode);
  setSpeechRecordingSampleRate(config.recordingSampleRate);
};

const seedImageConfiguration = (config) => {
  setImageModelName(config.model);
  setImageNumberImages(config.numberOfImages);
  setImageSize(config.sizeOfImage);
  setImageQualityHD(config.qualityHd);
  setImageDisableSafePrompt(config.disableSafePromptAdjust);
  setImageFluxPromptUpsampling(config.fluxPromptUpsampling);
  setImageFluxGuidance(config.fluxGuidance);
  setImageFluxEditModeSteps(config.fluxEditModeSteps);
  setImageFluxEditModeGuidance(config.fluxEditModeGuidance);
  setImageFluxRawMode(config.fluxRawMode);
  setImageFluxImagePromptStrength(config.fluxImagePromptStrength);
  setImageSteps(config.steps);
  setImageFluxToolsImg2ImgMode(config.fluxToolsImg2ImgMode);
  setImageSdStylePreset(config.sdStylePreset);
  setImageSdImagePromptStrength(config.sdImagePromptStrength);
  setImageSdNegativePrompt(config.sdNegativePrompt);
  setImageSdCfgScale(config.sdCfgScale);
  setImageSdSd35TurboMode(config.sdSd35TurboMode);
  setImageRevisePrompt(config.revisedPrompt);
  setImageAspectRatio(config.imageAspectRatio);
  setImageMode(config.imageMode);
  setImageEditMode(config.imageEditMode);
};

const seedGeneralConfiguration = (config) => {
  setUseTestData(config.returnTestData);
  setGeneralAiAgentEnabled(config.aiAgentEnabled);
};

const seedMetaConfiguration = (config) => {
  setUseWebsockets(config.useWebsockets);
  setCustomerId(config.customerId);
};

const seedAuthConfiguration = (config) => {
  const expiration = typeof config.expiration === 'function' ? config.expiration() : config.expiration;
  const tokenData = { token: config.token, expiration };
  localStorage.setItem('authToken', JSON.stringify(tokenData));
  setAuthTokenForBackend(config.token);
  return tokenData;
};

export const createTestConfiguration = (overrides = {}) => {
  clearTestConfiguration();
  const merged = deepMerge(DEFAULT_TEST_CONFIGURATION, overrides);
  seedMetaConfiguration(merged.meta);
  seedTextConfiguration(merged.text);
  seedTTSConfiguration(merged.tts);
  seedSpeechConfiguration(merged.speech);
  seedImageConfiguration(merged.image);
  seedGeneralConfiguration(merged.general);
  const auth = seedAuthConfiguration(merged.auth);
  return { ...merged, auth };
};

export const seedAuthenticatedUser = (options = {}) => {
  const config = createTestConfiguration({ auth: options });
  return config.auth;
};

export const getDefaultTestConfiguration = () => ({
  ...DEFAULT_TEST_CONFIGURATION,
  auth: {
    ...DEFAULT_TEST_CONFIGURATION.auth,
    expiration: DEFAULT_TEST_CONFIGURATION.auth.expiration(),
  },
});
