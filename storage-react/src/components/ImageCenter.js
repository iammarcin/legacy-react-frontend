// components/vibes/Demo1.jsx
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { StateContext } from './StateContextProvider';
import useChatAPI from './../hooks/useChatAPI';
import ChatMessage from './ChatMessage';
import TopMenu from './TopMenu';  // Import TopMenu component
import BottomToolsMenu from './BottomToolsMenu';
import './css/ImageCenter.css';
import { getSvgIcon } from '../utils/svg.icons.provider';
import { setGeneralAiAgentEnabled, setUseWebsockets } from './../utils/configuration';

const ImageCenter = () => {
  const userInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenuIndex, setContextMenuIndex] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false); // Add state for sidebar
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likedImages, setLikedImages] = useState(new Set());
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [imageInfo, setImageInfo] = useState(null);

  const {
    userInput, setUserInput,
    chatContent, setChatContent, currentSessionIndexRef,
    setAttachedImages,
    setAttachedFiles,
    editingMessage, setEditingMessage,
    setFocusInput, endOfMessagesRef,
    errorMsg, setErrorMsg, isLastMessage,
    mScrollToBottom
  } = useContext(StateContext);

  // Custom hook for API calls
  const { callChatAPI } = useChatAPI();

  // Extract images from chat messages
  const extractImagesFromMessages = useCallback(() => {
    if (!chatContent[currentSessionIndexRef.current]?.messages) return [];

    const images = [];
    chatContent[currentSessionIndexRef.current].messages.forEach((message, messageIndex) => {
      if (message.content) {
        // Look for image URLs in message content
        const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg))/gi;
        const matches = message.content.match(urlRegex);
        if (matches) {
          matches.forEach((url, urlIndex) => {
            images.push({
              url,
              messageIndex,
              urlIndex,
              prompt: message.role === 'user' ? message.content : 'Generated image',
              timestamp: new Date().toLocaleString()
            });
          });
        }
      }
    });
    return images;
  }, [chatContent, currentSessionIndexRef]);

  const images = extractImagesFromMessages();

  // Set the AI character for this demo when component mounts
  useEffect(() => {
    setChatContent((prevChatContent) => {
      const updatedChatContent = [...prevChatContent];
      updatedChatContent[currentSessionIndexRef.current].ai_character_name = 'assistant';
      return updatedChatContent;
    });
  }, [setChatContent, currentSessionIndexRef]);

  // Handle new chat click for TopMenu
  const handleNewChatClick = () => {
    setUserInput("");
    setAttachedImages([]);
    setAttachedFiles([]);
    setCurrentImageIndex(0);
    setLikedImages(new Set());
    setShowInfoMenu(false);
    setChatContent((prevChatContent) => {
      const updatedChatContent = [...prevChatContent];
      updatedChatContent[currentSessionIndexRef.current].messages = [];
      return updatedChatContent;
    });
  };

  // Handle input change
  /*const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };*/

  // Handle send button click
  const handleSendClick = useCallback(() => {
    if (!userInput.trim()) {
      setErrorMsg("Please provide your input");
      return;
    }
    // always use agentic mode for vibes demos
    setGeneralAiAgentEnabled(true);

    // always use websockets for vibes demos
    setUseWebsockets(true);
    setIsLoading(true);
    setErrorMsg('');

    // Create a snapshot of the current chat content
    const chatContentSnapshot = [...chatContent];

    // Call the API
    if (editingMessage !== null) {
      callChatAPI({
        chatContentSnapshot,
        editMessagePosition: editingMessage,
        isHealthMode: true // important - without it page will refresh to main app
      });
    } else {
      callChatAPI({
        chatContentSnapshot,
        isHealthMode: true // important - without it page will refresh to main app
      });
    }

    // Reset states
    setUserInput("");
    setAttachedImages([]);
    setAttachedFiles([]);
    setFocusInput(true);
    setEditingMessage(null);
    setIsLoading(false);
  }, [userInput, chatContent, editingMessage, callChatAPI, setUserInput, setAttachedImages, setAttachedFiles, setFocusInput, setEditingMessage, setErrorMsg]);

  // Handle key press (Enter to send)
  /*const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };*/

  const handleImageLike = () => {
    if (images.length === 0) return;
    const currentImage = images[currentImageIndex];
    const imageKey = `${currentImage.messageIndex}-${currentImage.urlIndex}`;

    setLikedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageKey)) {
        newSet.delete(imageKey);
      } else {
        newSet.add(imageKey);
      }
      return newSet;
    });
  };

  const handleInfoClick = () => {
    if (images.length === 0) return;
    setImageInfo(images[currentImageIndex]);
    setShowInfoMenu(!showInfoMenu);
  };

  const handleDownload = () => {
    if (images.length === 0) return;
    const currentImage = images[currentImageIndex];
    const link = document.createElement('a');
    link.href = currentImage.url;
    link.download = `image-${currentImageIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowInfoMenu(false);
  };

  const handleGoToFirst = () => {
    setCurrentImageIndex(0);
    setShowInfoMenu(false);
  };

  const handleGoToLast = () => {
    setCurrentImageIndex(images.length - 1);
    setShowInfoMenu(false);
  };

  const handleThumbnailClick = (index) => {
    setCurrentImageIndex(index);
    setShowInfoMenu(false);
  };

  // Auto-resize input height
  useEffect(() => {
    const input = userInputRef.current;
    if (input) {
      input.style.height = 'auto';
      const newHeight = Math.min(input.scrollHeight, window.innerHeight * 0.1);
      input.style.height = `${newHeight}px`;
    }
  }, [userInput]);

  // Reset current image index if it's out of bounds
  useEffect(() => {
    if (images.length > 0 && currentImageIndex >= images.length) {
      setCurrentImageIndex(images.length - 1);
    }
  }, [images.length, currentImageIndex]);

  const currentImage = images.length > 0 ? images[currentImageIndex] : null;
  const isCurrentImageLiked = currentImage ? likedImages.has(`${currentImage.messageIndex}-${currentImage.urlIndex}`) : false;

  return (
    <div className="image-center-layout">
      <TopMenu
        onNewChatClicked={handleNewChatClick}
        toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
        mode="imagecenter"
      />

      <div className="image-center-main-content">
        {/* Image thumbnails sidebar */}
        {images.length > 0 && (
          <div className="image-center-thumbnails">
            <div className="thumbnails-container">
              {images.map((image, index) => (
                <div
                  key={`${image.messageIndex}-${image.urlIndex}`}
                  className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => handleThumbnailClick(index)}
                >
                  <img src={image.url} alt={`Thumbnail ${index + 1}`} />
                  {likedImages.has(`${image.messageIndex}-${image.urlIndex}`) && (
                    <div className="thumbnail-liked">{getSvgIcon('like')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main image display area */}
        <div className="image-center-display">
          {currentImage ? (
            <div className="image-container">
              <img
                src={currentImage.url}
                alt="Generated one"
                className="main-image"
              />

              {/* Hovering action icons */}
              <div className="image-actions">
                <button
                  className={`action-button like-button ${isCurrentImageLiked ? 'liked' : ''}`}
                  onClick={handleImageLike}
                  title="Like/Unlike"
                >
                  {getSvgIcon('like')}
                </button>
                <button
                  className="action-button info-button"
                  onClick={handleInfoClick}
                  title="Image options"
                >
                  {getSvgIcon('info')}
                </button>
              </div>

              {/* Info menu */}
              {showInfoMenu && (
                <div className="info-menu">
                  <div className="info-menu-item" onClick={() => setShowInfoMenu(false)}>
                    <strong>Image Info</strong>
                  </div>
                  <div className="info-menu-item">
                    Prompt: {imageInfo?.prompt}
                  </div>
                  <div className="info-menu-item">
                    Created: {imageInfo?.timestamp}
                  </div>
                  <div className="info-menu-divider"></div>
                  <div className="info-menu-item clickable" onClick={handleDownload}>
                    📥 Download
                  </div>
                  <div className="info-menu-item clickable" onClick={handleGoToFirst}>
                    ⏮️ Go to First
                  </div>
                  <div className="info-menu-item clickable" onClick={handleGoToLast}>
                    ⏭️ Go to Last
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="image-center-empty-state">
              <div className="empty-state-content">
                <h2>🖼️ Image Center</h2>
                <p>Enter a prompt below to generate images</p>
                {isLoading && <div className="loading-indicator">Generating your image...</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tools Menu */}
      <BottomToolsMenu
        handleSendClick={handleSendClick}
        mode="imagecenter"
        mScrollToBottom={mScrollToBottom}
      />

      {/* Hidden chat messages for backend communication */}
      <div style={{ display: 'none' }}>
        {chatContent[currentSessionIndexRef.current] && chatContent[currentSessionIndexRef.current].messages ? (
          <div>
            {chatContent[currentSessionIndexRef.current].messages.map((message, index) => (
              <ChatMessage
                key={index}
                index={index}
                message={message}
                isLastMessage={isLastMessage(index, message)}
                contextMenuIndex={contextMenuIndex}
                setContextMenuIndex={setContextMenuIndex}
              />
            ))}
            <div ref={endOfMessagesRef} />
          </div>
        ) : null}
      </div>

      {errorMsg && <div className="image-center-error-msg">{errorMsg}</div>}
    </div>
  );
};

export default ImageCenter;
