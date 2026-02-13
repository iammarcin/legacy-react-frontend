// OptionsWindow.js

import React, { useState } from 'react';
import './css/OptionsWindow.css';
import General from './options/General';
import Text from './options/Text';
import Image from './options/Image';
import TTS from './options/TTS';
import Speech from './options/Speech';

const OptionsWindow = () => {
  const [activeOption, setActiveOption] = useState('GENERAL');

  const options = ['GENERAL', 'TEXT', 'IMAGE', 'TTS', 'SPEECH'];

  const renderContent = () => {
    switch (activeOption) {
      case 'GENERAL':
        return <General />;
      case 'TEXT':
        return <Text />;
      case 'IMAGE':
        return <Image />;
      case 'TTS':
        return <TTS />;
      case 'SPEECH':
        return <Speech />;
      default:
        return <General />;
    }
  };

  return (
    <div className="options-window">
      <div className="options-menu">
        {options.map(option => (
          <button
            key={option}
            className={`options-button ${activeOption === option ? 'active' : ''}`}
            onClick={() => setActiveOption(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="options-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default OptionsWindow;
