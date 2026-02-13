import {
  getTextTemperature,
  getTextModelName,
  getTextMemorySize,
  getIsStreamingEnabled,
  getTextFileAttachedMessageLimit,
  getTextEnableReasoning,
  getTextReasoningEffort,
  getTextModelToBeUsedWithWebsearch,
  getGeneralWebsearchEnabled,
  getGeneralDeepResearchEnabled,
  getTTSStability,
  getTTSSimilarity,
  getTTSVoice,
  getTTSStreaming,
  getTTSSpeed,
  getTTSModelName,
  getTTSAutoExecute,
  getSpeechLanguage,
  getSpeechTemperature,
  getSpeechModelName,
  getSpeechRealtimeVoice,
  getSpeechRealtimeConversationMode,
  getSpeechRecordingSampleRate,
  getImageModelName,
  getImageNumberImages,
  getImageSize,
  getImageQualityHD,
  getImageFluxPromptUpsampling,
  getImageFluxGuidance,
  getImageFluxEditModeSteps,
  getImageFluxEditModeGuidance,
  getImageFluxRawMode,
  getImageFluxImagePromptStrength,
  getImageSteps,
  getImageFluxToolsImg2ImgMode,
  getImageSdStylePreset,
  getImageSdImagePromptStrength,
  getImageSdNegativePrompt,
  getImageSdCfgScale,
  getImageSdSd35TurboMode,
  getImageRevisePrompt,
  getImageAspectRatio,
  getImageMode,
  getImageEditMode,
  getUseTestData,
  getGeneralAiAgentEnabled,
  getUseWebsockets,
  getCustomerId,
  getAuthTokenForBackend,
} from '../configuration';
import {
  createTestConfiguration,
  clearTestConfiguration,
  getDefaultTestConfiguration,
  seedAuthenticatedUser,
  DEFAULT_TEST_CONFIGURATION,
} from '../../test/utils';

describe('configuration helpers', () => {
  afterEach(() => {
    clearTestConfiguration();
  });

  it('returns seeded values from the test configuration fixture', () => {
    const seeded = createTestConfiguration();

    expect(getTextTemperature()).toBeCloseTo(seeded.text.temperature);
    expect(getTextModelName()).toBe(seeded.text.model);
    expect(getTextMemorySize()).toBe(seeded.text.memorySize);
    expect(getIsStreamingEnabled()).toBe(seeded.text.streaming);
    expect(getTextFileAttachedMessageLimit()).toBe(seeded.text.fileAttachedMessageLimit);
    expect(getTextEnableReasoning()).toBe(seeded.text.enableReasoning);
    expect(getTextReasoningEffort()).toBeCloseTo(seeded.text.reasoningEffort);
    expect(getTextModelToBeUsedWithWebsearch()).toBe(seeded.text.websearchModel);
    expect(getGeneralWebsearchEnabled()).toBe(seeded.text.websearchEnabled);
    expect(getGeneralDeepResearchEnabled()).toBe(seeded.text.deepResearchEnabled);

    expect(getTTSStability()).toBeCloseTo(seeded.tts.stability);
    expect(getTTSSimilarity()).toBeCloseTo(seeded.tts.similarityBoost);
    expect(getTTSVoice()).toBe(seeded.tts.voice);
    expect(getTTSStreaming()).toBe(seeded.tts.streaming);
    expect(getTTSSpeed()).toBeCloseTo(seeded.tts.speed);
    expect(getTTSModelName()).toBe(seeded.tts.model);
    expect(getTTSAutoExecute()).toBe(seeded.tts.autoExecute);

    expect(getSpeechLanguage()).toBe(seeded.speech.language.toLowerCase());
    expect(getSpeechTemperature()).toBeCloseTo(seeded.speech.temperature);
    expect(getSpeechModelName()).toBe(seeded.speech.model);
    expect(getSpeechRealtimeVoice()).toBe(seeded.speech.realtimeVoice);
    expect(getSpeechRealtimeConversationMode()).toBe(seeded.speech.realtimeConversationMode);
    expect(getSpeechRecordingSampleRate()).toBe(seeded.speech.recordingSampleRate);

    expect(getImageModelName()).toBe(seeded.image.model);
    expect(getImageNumberImages()).toBe(seeded.image.numberOfImages);
    expect(getImageSize()).toBe(seeded.image.sizeOfImage);
    expect(getImageQualityHD()).toBe(seeded.image.qualityHd);
    expect(getImageFluxPromptUpsampling()).toBe(seeded.image.fluxPromptUpsampling);
    expect(getImageFluxGuidance()).toBeCloseTo(seeded.image.fluxGuidance);
    expect(getImageFluxEditModeSteps()).toBe(seeded.image.fluxEditModeSteps);
    expect(getImageFluxEditModeGuidance()).toBeCloseTo(seeded.image.fluxEditModeGuidance);
    expect(getImageFluxRawMode()).toBe(seeded.image.fluxRawMode);
    expect(getImageFluxImagePromptStrength()).toBeCloseTo(seeded.image.fluxImagePromptStrength);
    expect(getImageSteps()).toBe(seeded.image.steps);
    expect(getImageFluxToolsImg2ImgMode()).toBe(seeded.image.fluxToolsImg2ImgMode);
    expect(getImageSdStylePreset()).toBe(seeded.image.sdStylePreset);
    expect(getImageSdImagePromptStrength()).toBeCloseTo(seeded.image.sdImagePromptStrength);
    expect(getImageSdNegativePrompt()).toBe(seeded.image.sdNegativePrompt);
    expect(getImageSdCfgScale()).toBeCloseTo(seeded.image.sdCfgScale);
    expect(getImageSdSd35TurboMode()).toBe(seeded.image.sdSd35TurboMode);
    expect(getImageRevisePrompt()).toBe(seeded.image.revisedPrompt);
    expect(getImageAspectRatio()).toBe(seeded.image.imageAspectRatio);
    expect(getImageMode()).toBe(seeded.image.imageMode);
    expect(getImageEditMode()).toBe(seeded.image.imageEditMode);

    expect(getUseTestData()).toBe(seeded.general.returnTestData);
    expect(getGeneralAiAgentEnabled()).toBe(seeded.general.aiAgentEnabled);

    expect(getUseWebsockets()).toBe(seeded.meta.useWebsockets);
    expect(getCustomerId()).toBe(seeded.meta.customerId);
    expect(getAuthTokenForBackend()).toBe(seeded.auth.token);
  });

  it('falls back to production defaults when no localStorage overrides are present', () => {
    clearTestConfiguration();

    expect(getTextTemperature()).toBeCloseTo(0.1);
    expect(getImageQualityHD()).toBe(false);
    expect(getUseWebsockets()).toBe(true);
  });

  it('coerces primitive values stored as strings', () => {
    clearTestConfiguration();
    localStorage.setItem('image_quality_id', JSON.stringify('true'));
    localStorage.setItem('image_number_images', JSON.stringify('4'));

    expect(getImageQualityHD()).toBe(true);
    expect(getImageNumberImages()).toBe(4);
  });

  it('allows overriding the authentication payload', () => {
    const { expiration } = seedAuthenticatedUser({ token: 'override-token' });

    expect(getAuthTokenForBackend()).toBe('override-token');
    expect(JSON.parse(localStorage.getItem('authToken'))).toEqual({ token: 'override-token', expiration });
  });

  it('exposes the default fixture for snapshotting and sanity checks', () => {
    clearTestConfiguration();
    const defaults = getDefaultTestConfiguration();

    expect(defaults.text.model).toBe(DEFAULT_TEST_CONFIGURATION.text.model);
    expect(typeof defaults.auth.expiration).toBe('string');
  });
});
