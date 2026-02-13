// options/TTS.js

import React, { useState } from 'react';
import {
 getTTSModelName, setTTSModelName,
 getTTSStreaming, setTTSStreaming,
 getTTSAutoExecute, setTTSAutoExecute,
 getTTSVoice, setTTSVoice,
 getTTSSpeed, setTTSSpeed
} from '../../utils/configuration';

const TTS = () => {
 const [ttsModel, setLocalTTSModel] = useState(getTTSModelName());
 const [ttsStreaming, setLocalTTSStreaming] = useState(getTTSStreaming());
 const [ttsAutoExecute, setLocalTTSAutoExecute] = useState(getTTSAutoExecute());
 const [ttsVoice, setLocalTTSVoice] = useState(getTTSVoice());
 const [ttsSpeed, setLocalTTSSpeed] = useState(getTTSSpeed());

 const handleModelChange = (e) => {
  const value = e.target.value;
  setLocalTTSModel(value);
  setTTSModelName(value);
 };

 const handleStreamingChange = (e) => {
  const checked = e.target.checked;
  setLocalTTSStreaming(checked);
  setTTSStreaming(checked);
 };

 const handleAutoTriggerTTSChange = (e) => {
  const checked = e.target.checked;
  setLocalTTSAutoExecute(checked);
  setTTSAutoExecute(checked);
 };

 const handleVoiceChange = (e) => {
  const value = e.target.value;
  setLocalTTSVoice(value);
  setTTSVoice(value);
 };

 const handleSpeedChange = (e) => {
  const value = e.target.value;
  setLocalTTSSpeed(value);
  setTTSSpeed(value);
 };

 return (
  <div className="tts-options">
   <div className="option-item">
    <label>Model</label>
    <input type="text" value={ttsModel} onChange={handleModelChange} />
   </div>
   <div className="optionsAdditionalText">Possible values: tts-1, tts-1-hd</div>
   <div className="option-item">
    <label>Streaming</label>
    <input type="checkbox" checked={ttsStreaming} onChange={handleStreamingChange} />
   </div>
   <div className="option-item">
    <label>Auto trigger TTS upon AI response</label>
    <input type="checkbox" checked={ttsAutoExecute} onChange={handleAutoTriggerTTSChange} />
   </div>
   <h3>OpenAI</h3>
   <div className="option-item">
    <label>Voice</label>
    <input type="text" value={ttsVoice} onChange={handleVoiceChange} />
   </div>
   <div className="optionsAdditionalText">Possible values: alloy, echo, fable, onyx, nova, and shimmer</div>
   <div className="option-item">
    <label>Speed</label>
    <input type="range" min="0.5" max="4" step="0.05" value={ttsSpeed} onChange={handleSpeedChange} />
    <span>{ttsSpeed}</span>
   </div>
  </div>
 );
};

export default TTS;
