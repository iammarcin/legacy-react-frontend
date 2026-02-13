// TopMenu.js

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { StateContext } from './StateContextProvider';

import { getSvgIcon } from '../utils/svg.icons.provider';

import OptionsWindow from './OptionsWindow';
import './css/TopMenu.css';

import { getIsProdMode, setIsProdMode, setURLForAPICalls, getTextModelName, setTextModelName } from '../utils/configuration';

const TopMenu = ({ onNewChatClicked, toggleSidebar, mode = 'normal' }) => {
  const navigate = useNavigate();
  const [isPopupVisible, setPopupVisible] = useState(false);
  // this is to show value in dropdown menu
  const [textModelName, setLocalTextModelName] = useState(getTextModelName());
  // New state for image model selection
  const [imageModelName, setImageModelName] = useState('DALL-E 3');
  // this is to track if we want to use prod or non prod backend (and will be only available in non prod react)
  const [environment, setEnvironment] = useState(getIsProdMode() ? 'prod' : 'nonprod');
  // this is different then environment
  // this is to hide the dropdown menu in prod (behind nginx)
  const isProduction = process.env.NODE_ENV === 'production';

  const {
    chatContent, setChatContent, currentSessionIndexRef,
    currentSessionIndex, setCurrentSessionIndex,
    setShouldSkipSessionFetching,
    isTopMenuDropdownVisible, setTopMenuDropdownVisible,
    setShowCharacterSelection, setErrorMsg
  } = useContext(StateContext);

  const handleTextModelChange = (event) => {
    setTextModelName(event.target.value);
    setLocalTextModelName(event.target.value);
  }

  const handleImageModelChange = (event) => {
    setImageModelName(event.target.value);
    // TODO: Add configuration function for image model when implemented
  }

  const handleEnvironmentChange = (event) => {
    const selectedEnv = event.target.value;

    setEnvironment(selectedEnv);
    if (selectedEnv === "prod") {
      setIsProdMode(true);
    } else {
      setIsProdMode(false);
    }
    setURLForAPICalls()
    window.location.reload(); // Reload to apply the new environment
  };

  const handleNewChatClick = () => {
    onNewChatClicked()
  };

  // top left menu
  const handleMenuButtonClick = () => {
    setTopMenuDropdownVisible(!isTopMenuDropdownVisible);
    toggleSidebar()
  };

  // options button within top left menu
  const handleOptionsClick = () => {
    setPopupVisible(true);
    setTopMenuDropdownVisible(false);
    toggleSidebar();
  };

  const handleClosePopup = () => {
    setPopupVisible(false);
  };

  // on top we have those circle buttons to switch between chat sessions
  // this is choosing specific session / button
  const handleSessionClick = (sessionIndex) => {
    setCurrentSessionIndex(sessionIndex);
    const newSessionId = chatContent[sessionIndex].session_id;
    if (newSessionId) {
      // set the flag NOT to fetch sessions (handled in Main.js)
      setShouldSkipSessionFetching(true);
      setChatContent((prevChatContent) => {
        const updatedChatContent = [...prevChatContent];
        updatedChatContent[currentSessionIndexRef.current].session_id = newSessionId;
        return updatedChatContent;
      });
      navigate(`/session/${newSessionId}`);
      setShowCharacterSelection(false);
    } else {
      navigate(`/`);
      setShowCharacterSelection(true);
    }

  };

  // closing session - circle button 
  const handleSessionClose = (sessionIndex) => {
    setChatContent((prevChatContent) => {
      const newSessions = prevChatContent.filter((_, index) => index !== sessionIndex);

      // Ensure the current session index is updated correctly
      const newIndex = sessionIndex > 0 ? sessionIndex - 1 : 0;
      setCurrentSessionIndex(newIndex);
      // get sessionId of newIndex (if it's set) - to make sure that if we switch back - data will be properly loaded (in fact fetchChatContent will be executed)
      const newSessionId = newSessions[newIndex].session_id;
      if (newSessionId) {
        setChatContent((prevChatContent) => {
          const updatedChatContent = [...prevChatContent];
          updatedChatContent[currentSessionIndexRef.current].session_id = newSessionId;
          return updatedChatContent;
        });
        setShowCharacterSelection(false);
      } else {
        setShowCharacterSelection(true);
      }
      return newSessions;
    });
  };

  // add new session - via top circle buttons
  const handleSessionAdd = () => {
    navigate(`/`);
    const newSessionId = chatContent.length;
    const newSession = {
      id: newSessionId,
      //local_session_id: uuidv4(), // ?? implement?
      session_id: "", // this is to track session in DB (canonical snake_case)
      ai_character_name: "assistant",
      original_ai_character: "",
      ai_text_gen_model: "",
      auto_trigger_tts: false,
      messages: []
    };
    setCurrentSessionIndex(newSessionId);

    setChatContent((prevChatContent) => {
      const updatedChatContent = [...prevChatContent, newSession];
      return updatedChatContent;
    });
    setErrorMsg('');
    setShowCharacterSelection(true);
  }

  // if clicked outside of popup window - we want to hide it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isPopupVisible && !event.target.closest('.popup')) {
        setPopupVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopupVisible]);

  return (
    <div className="top-menu">
      <button className="menu-button" onClick={handleMenuButtonClick}>
        {getSvgIcon('topMenuHamburgerButton')}
      </button>
      {isTopMenuDropdownVisible && (
        <div className="dropdown-menu">
          <div className="dropdown-item" onClick={handleOptionsClick}>Options</div>
        </div>
      )}
      {mode === 'normal' && (
        <div className="session-buttons">
          {Object.keys(chatContent).map((sessionId, index) => (
            <div key={sessionId} className={`session-button-container ${currentSessionIndex === index ? 'active' : ''}`}>
              <button
                className={`session-button ${currentSessionIndex === index ? 'active' : ''}`}
                onClick={() => handleSessionClick(index)}
              >
                {chatContent[sessionId].ai_character_name ? (
                  <img
                    src={`/imgs/${chatContent[sessionId].ai_character_name}.png`}
                    alt="avatar"
                    className="session-avatar"
                  />
                ) : (
                  index + 1
                )}
              </button>
              <button className="close-button" onClick={() => handleSessionClose(index)}>×</button>
            </div>
          ))}
          {Object.keys(chatContent).length < 5 && (
            <button className="session-button add-session" onClick={handleSessionAdd}>+</button>
          )}
        </div>
      )}
      <div className={`menu-right ${mode !== 'normal' ? 'health-section-top-menu-right' : ''}`}>
        {!isProduction && (
          <div className="environment-selector">
            <select id="environment" value={environment} onChange={handleEnvironmentChange}>
              <option value="prod">Prod</option>
              <option value="nonprod">Nonprod</option>
            </select>
          </div>
        )}
        {mode === 'imagecenter' && (
          <div className="model-selector">
            <select id="imageModel" value={imageModelName} onChange={handleImageModelChange}>
              <option value="DALL-E 3">DALL-E 3</option>
              <option value="DALL-E 2">DALL-E 2</option>
              <option value="Midjourney">Midjourney</option>
              <option value="Stable Diffusion">Stable Diffusion</option>
              <option value="Flux">Flux</option>
            </select>
          </div>
        )}
        <div className="model-selector">
          <select id="model" value={textModelName} onChange={handleTextModelChange}>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
            <option value="gemini-flash">Gemini flash</option>
            <option value="GPT-5-pro">GPT-5-pro</option>
            <option value="GPT-5">GPT-5</option>
            <option value="GPT-5-mini">GPT-5-mini</option>
            <option value="GPT-5-nano">GPT-5-nano</option>
            <option value="o3">o3</option>
            <option value="GPT-4o">GPT-4o</option>
            <option value="grok">Grok</option>
            <option value="llama">Llama</option>
            <option value="gpt-oss">GPT OSS 120b</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </div>
        {mode === 'normal' && (
          <button className="new-chat-button" onClick={handleNewChatClick}>
            {getSvgIcon('topMenuNewChatButton')}
          </button>
        )}
      </div>

      {
        isPopupVisible && (
          <>
            <div className="overlay" onClick={handleClosePopup}></div>
            <div className="popup">
              <OptionsWindow />
            </div>
          </>
        )
      }
    </div>
  );
};

export default TopMenu;
