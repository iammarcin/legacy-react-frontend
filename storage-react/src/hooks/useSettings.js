// hooks/useSettings.js
import { useCallback } from 'react';
import { useCurrentSession } from './useCurrentSession';
import { characters } from '../components/ChatCharacters';

import {
  getTextTemperature, getTextModelName, getTextMemorySize, getIsStreamingEnabled, getTextFileAttachedMessageLimit, getTextEnableReasoning, getTextReasoningEffort, getTextModelToBeUsedWithWebsearch,
  getTTSStability, getTTSSimilarity, getTTSVoice, getTTSStreaming, getTTSSpeed, getTTSModelName, getTTSAutoExecute,
  getSpeechLanguage, getSpeechTemperature, getSpeechModelName, getSpeechRealtimeVoice, getSpeechRealtimeConversationMode, getSpeechRecordingSampleRate,
  getImageModelName, getImageNumberImages, getImageSize, getImageQualityHD, getImageDisableSafePrompt,
  getImageSteps,
  getImageFluxPromptUpsampling, getImageFluxGuidance, getImageFluxEditModeSteps, getImageFluxEditModeGuidance, getImageFluxRawMode, getImageFluxImagePromptStrength, getImageFluxToolsImg2ImgMode, getImageSdStylePreset, getImageSdImagePromptStrength, getImageSdNegativePrompt, getImageSdCfgScale, getImageSdSd35TurboMode, getImageRevisePrompt, getImageAspectRatio, getImageMode, getImageEditMode, // eslint-disable-line no-unused-vars
  getUseTestData, getGeneralWebsearchEnabled, getGeneralAiAgentEnabled, getGeneralDeepResearchEnabled,
} from '../utils/configuration';


export const useSettings = () => {
  const currentCharacter = useCurrentSession().ai_character_name;

  return useCallback(() => {
    // Look up character to get isClaudeCodeCharacter flag
    const characterDef = characters.find(c => c.nameForAPI === currentCharacter);
    const isClaudeCodeCharacter = characterDef?.isClaudeCodeCharacter === true;

    return {
      text: {
        temperature: getTextTemperature(),
        model: getTextModelName(),
        memory_limit: getTextMemorySize(),
        ai_character: currentCharacter,
        streaming: getIsStreamingEnabled(),
        file_attached_message_limit: getTextFileAttachedMessageLimit(),
        enable_reasoning: getTextEnableReasoning(),
        reasoning_effort: getTextReasoningEffort(),
        websearch_model: getTextModelToBeUsedWithWebsearch(),
        websearch_enabled: getGeneralWebsearchEnabled(),
        deep_research_enabled: getGeneralDeepResearchEnabled(),
      },
      tts: {
        stability: getTTSStability(),
        similarity_boost: getTTSSimilarity(),
        voice: getTTSVoice(),
        streaming: getTTSStreaming(),
        speed: getTTSSpeed(),
        model: getTTSModelName(),
        tts_auto_execute: getTTSAutoExecute(),
      },
      speech: {
        language: getSpeechLanguage(),
        temperature: getSpeechTemperature(),
        model: getSpeechModelName(),
        realtime_voice: getSpeechRealtimeVoice(),
        realtime_conversation_mode: getSpeechRealtimeConversationMode(),
        recording_sample_rate: getSpeechRecordingSampleRate(),
      },
      image: {
        model: getImageModelName(),
        number_of_images: getImageNumberImages(),
        size_of_image: getImageSize(),
        quality_hd: getImageQualityHD(),
        disable_safe_prompt_adjust: getImageDisableSafePrompt(),
        flux_prompt_upsampling: getImageFluxPromptUpsampling(),
        flux_guidance: getImageFluxGuidance(),
        flux_edit_mode_steps: getImageFluxEditModeSteps(),
        flux_edit_mode_guidance: getImageFluxEditModeGuidance(),
        flux_raw_mode: getImageFluxRawMode(),
        flux_image_prompt_strength: getImageFluxImagePromptStrength(),
        steps: getImageSteps(),
        flux_tools_img2img_mode: getImageFluxToolsImg2ImgMode(),
        sd_style_preset: getImageSdStylePreset(),
        sd_image_prompt_strength: getImageSdImagePromptStrength(),
        sd_negative_prompt: getImageSdNegativePrompt(),
        sd_cfg_scale: getImageSdCfgScale(),
        sd_sd35_turbo_mode: getImageSdSd35TurboMode(),
        revised_prompt: getImageRevisePrompt(), // our internal call to LLM
        image_aspect_ratio: getImageAspectRatio(), // 0: square, 1: landscape, 2: portrait
        image_mode: getImageMode(), // special mode (ImageModeInitializers handles it - mainly to differ edit_image/img2img/default modes)
        image_edit_mode: getImageEditMode(), // special mode (ImageModeInitializers handles it - mainly to differ edit modes)
      },
      general: {
        returnTestData: getUseTestData(),
        ai_agent_enabled: getGeneralAiAgentEnabled(),
        is_claude_code_character: isClaudeCodeCharacter,
        auto_response: characterDef?.autoResponse ?? true,
      }
    }
  }, [currentCharacter]);
};
