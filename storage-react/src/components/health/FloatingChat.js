// FloatingChat.js

import React, { useState, useEffect, useContext, useCallback } from 'react';

import { StateContext } from '../StateContextProvider';
import useChatAPI from '../../hooks/useChatAPI';

import { getTextModelName } from '../../utils/configuration';
import { getSvgIcon } from '../../utils/svg.icons.provider';

import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import './css/FloatingChat.css';

import BottomToolsMenu from '../BottomToolsMenu';
import ChatMessage from '../ChatMessage';

const FloatingChat = ({ character = 'sleep_expert' }) => {
  const {
    userInput, setUserInput, chatContent, setChatContent,
    setAssetInput, currentSessionIndexRef,
    attachedImages, setAttachedImages, endOfMessagesRef,
    setAttachedFiles, editingMessage,
    readyForRegenerate, setReadyForRegenerate,
    errorMsg, setErrorMsg, isMobile, isLastMessage,
    includeHealthData, includeCorrelationData, setShowHealthOptions,
    healthData, correlationData, pValuesData, correlationThreshold, pValueThreshold,
    mScrollToBottom
  } = useContext(StateContext);

  // need to use useState - because before calling chat api - if we want to add more context with data (from Health) - then we need to wait until data is updated (ahh async react - love you )
  const [triggerAPI, setTriggerAPI] = useState(false);

  // custom hook
  const { callChatAPI } = useChatAPI();

  // if i right click on any message (to show context window) - we need to reset previous context window 
  // if i clicked 2 time on 2 diff messages - two diff context menu were shown
  const [contextMenuIndex, setContextMenuIndex] = useState(null);
  const currentSessionIndex = 0;
  const [isMinimized, setIsMinimized] = useState(true);
  const [previousSize, setPreviousSize] = useState({
    width: isMobile ? 335 : 500, height: isMobile ? 300 : 300
  });

  // State to track if the character has been set initially 
  // i want to set character only once - when i open the chat
  const [isCharacterSet, setIsCharacterSet] = useState(false);

  // useEffect to set the initial AI character only once when the component mounts
  useEffect(() => {
    if (!isCharacterSet) {
      setChatContent((prevChatContent) => {
        const updatedChatContent = [...prevChatContent];
        updatedChatContent[currentSessionIndexRef.current].ai_character_name = character;
        return updatedChatContent;
      });
      setIsCharacterSet(true); // Mark that the character has been set
    }
  }, [isCharacterSet, currentSessionIndexRef, setChatContent, character]);

  const handleSendClick = useCallback(() => {
    setErrorMsg('');
    const modelName = getTextModelName();

    if (userInput.trim() === '') {
      setErrorMsg("Please provide your input");
      return;
    }

    setShowHealthOptions(false);

    if (attachedImages.length > 0 && modelName !== 'GPT-4o' && modelName !== 'GPT-4o-mini' && modelName !== 'GPT-4' && modelName !== 'Claude-3.5') {
      setErrorMsg("Currently chosen model does not support images. Remove image or change the model");
      return;
    }

    // attach context (data)
    let assetInputArray = [];
    // Attach data based on includeHealthData and includeCorrelationData flags
    if (includeHealthData) {
      assetInputArray.push({ type: 'health', data: healthData });
    }
    if (includeCorrelationData) {
      // Filter correlation data based on thresholds set by user (or by defualt values)
      // goal is to provide to AI only relevant data
      const filteredCorrelationData = Object.entries(correlationData)
        .filter(([key, value]) => {
          const pValue = pValuesData[key];
          return value !== null && Math.abs(value) > correlationThreshold && pValue !== null && pValue <= pValueThreshold;
        })
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});

      if (Object.keys(filteredCorrelationData).length > 0) {
        assetInputArray.push({ type: 'correlation', data: filteredCorrelationData });
      }
    }

    setAssetInput(assetInputArray);

    // Set the trigger to call API
    setTriggerAPI(true);
  }, [userInput, attachedImages, healthData, correlationData, pValuesData, correlationThreshold, pValueThreshold, includeHealthData, includeCorrelationData, setAssetInput, setTriggerAPI, setShowHealthOptions, setErrorMsg]);

  const handleApiCall = useCallback(() => {

    const chatContentSnapshot = [...chatContent];
    console.log("Main chatContentSnapshot: ", chatContentSnapshot);

    if (editingMessage !== null) {
      callChatAPI({
        chatContentSnapshot,
        editMessagePosition: editingMessage,
        isHealthMode: true
      });
    } else {
      callChatAPI({
        chatContentSnapshot,
        isHealthMode: true
      });
    }

    setUserInput("");
    setAssetInput([]);
    setAttachedImages([]);
    setAttachedFiles([]);
  }, [callChatAPI, chatContent, editingMessage, setUserInput, setAssetInput, setAttachedImages, setAttachedFiles]);

  useEffect(() => {
    if (triggerAPI) {
      handleApiCall();
      setTriggerAPI(false);
    }
  }, [triggerAPI, handleApiCall, setTriggerAPI]);

  // we monitor if handleRegenerate was used
  useEffect(() => {
    if (readyForRegenerate) {
      handleSendClick();
      setReadyForRegenerate(false);
    }
  }, [readyForRegenerate, handleSendClick, setReadyForRegenerate]);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleResizeStop = (event, { size }) => {
    setPreviousSize(size);
  };

  return (
    <div className="floating-chat-container">
      {isMinimized ? (
        <button onClick={toggleMinimize} className="floating-chat-minimizedButton">
          {getSvgIcon('floatingChatMaximize')}
        </button>
      ) : (
        <ResizableBox
          width={previousSize.width}
          height={previousSize.height}
          minConstraints={[200, 200]}
          maxConstraints={[window.innerWidth, window.innerHeight]}
          className="floating-chat-resizableBox"
          resizeHandles={['se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w']}
          onResizeStop={handleResizeStop}
        >
          <div className="floating-chat-box">
            <button onClick={toggleMinimize} className="floating-chat-minimizeButton">
              {getSvgIcon('floatingChatMinimize')}
            </button>
            <div className="floating-chat-messages">
              {chatContent[currentSessionIndex] && chatContent[currentSessionIndex].messages ? (
                chatContent[currentSessionIndex].messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    index={index}
                    message={message}
                    isLastMessage={isLastMessage(index, message)}
                    isUserMessage={message.isUserMessage}
                    contextMenuIndex={contextMenuIndex}
                    setContextMenuIndex={setContextMenuIndex}
                    isFloating={true}
                  />
                ))
              ) : null}
              <div ref={endOfMessagesRef} />
            </div>
            {errorMsg && <div className="bot-error-msg">{errorMsg}</div>}
            <BottomToolsMenu
              handleSendClick={handleSendClick}
              mode="health"
              mScrollToBottom={mScrollToBottom}
            />
          </div>
        </ResizableBox>
      )}
    </div>
  );
};


export default FloatingChat;
