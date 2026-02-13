// options/Speech.js

import React, { useState } from 'react';
import {
 getSpeechLanguage, setSpeechLanguage,
 getSpeechTemperature, setSpeechTemperature
} from '../../utils/configuration';

const Speech = () => {
 const [language, setLocalLanguage] = useState(getSpeechLanguage());
 const [temperature, setLocalTemperature] = useState(getSpeechTemperature());

 const handleLanguageChange = (e) => {
  const value = e.target.value;
  setLocalLanguage(value);
  setSpeechLanguage(value);
 };

 const handleTemperatureChange = (e) => {
  const value = e.target.value;
  setLocalTemperature(value);
  setSpeechTemperature(value);
 };

 return (
  <div className="speech-options">
   <div className="option-item">
    <label>Language</label>
    <input type="text" value={language} onChange={handleLanguageChange} />
   </div>
   <div className="option-item">
    <label>Temperature</label>
    <input type="range" min="0" max="1" step="0.05" value={temperature} onChange={handleTemperatureChange} />
    <span>{temperature}</span>
   </div>
  </div>
 );
};

export default Speech;
