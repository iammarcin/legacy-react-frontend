// ChatMessage.js
import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';

import { StateContext } from './StateContextProvider';

import { useCurrentSessionId } from '../hooks/useCurrentSession';

import ChatImageModal from './ChatImageModal';
import ChartMessageBlock from './ChartMessage';

import DOMPurify from 'dompurify';
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-bash';
// has to be after prism - so we overwrite some css
import './css/ChatMessage.css';

import { convertFileAndImageLocationsToAttached } from '../utils/misc';
import { getSvgIcon } from '../utils/svg.icons.provider';
import { parseInlineCharts, hasInlineChartMarkers } from '../utils/inlineChartParser';

import { characters } from './ChatCharacters';

import { useSettings } from '../hooks/useSettings';
import { triggerAPIRequest, updateSessionInDB, generateImage } from '../services/api.methods';
import { getGeneralShowMessageInfoBottomRight, getTextShowReasoning } from '../utils/configuration';
import { formatDate } from '../utils/misc';

// TODO MOVE TO CONFIG LATER
const ERROR_MESSAGE_FOR_TEXT_GEN = "Error in Text Generator. Try again!";

// memoized version!
const ChatMessage = React.memo(({ index, message, isLastMessage, contextMenuIndex, setContextMenuIndex, isFloating = false, allSessionImages = [] }) => {
  const [contextMenu, setContextMenu] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // State for markdown images modal (separate from attached images)
  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState(false);
  const [currentMarkdownImageIndex, setCurrentMarkdownImageIndex] = useState(0);
  const [markdownImageUrls, setMarkdownImageUrls] = useState([]);
  const messageRef = useRef(null);
  const messageText = message.message ?? '';

  // Use canonical snake_case field names (no fallbacks)
  const apiTextGenAIModelName = message.api_text_gen_model_name;
  const apiImageGenSettings = message.api_image_gen_settings;
  const isGPSLocationMessage = message.is_gps_location_message;
  const aiReasoning = message.ai_reasoning;
  const toolActivity = message.tool_activity;
  const imageDescription = message.image_description;
  // set section for images and filter out placeholders
  const [validImageLocations, setValidImageLocations] = useState(
    message.image_locations ? message.image_locations.filter(src => src !== "image_placeholder_url") : []
  );

  // this is to make sure that if file name is empty - it will not crash app
  const filterValidFiles = (files) => {
    if (!Array.isArray(files)) return [];
    return files.filter(src =>
      typeof src === 'string' && (src.endsWith('.pdf') || src.endsWith('.txt'))
    );
  };

  // this is to show audio player for attached audio files
  // we check extensions - but also if it doesn't start with /storage/emulated - because it's local file in android (recording)
  const isValidAudioFile = (src) => {
    const validExtensions = ['.ogg', '.mp3', '.wav', '.mp4', '.m4a', '.webm', '.opus'];
    return validExtensions.some(ext => src.endsWith(ext)) && !src.startsWith('/storage/emulated') && !src.startsWith('file');
  };

  // to understand if it's audio file stored in android phone
  const isAndroidStoredAudioFile = (src) => {
    const validExtensions = ['.ogg', '.mp3', '.wav', '.mp4', '.m4a', '.webm', '.opus'];
    return validExtensions.some(ext => src.endsWith(ext)) && (src.startsWith('/storage/emulated') || src.startsWith('file'));
  };

  // Use in useState
  const [validFileLocations, setValidFileLocations] = useState(() =>
    filterValidFiles(message.file_locations)
  );

  const {
    chatContent, setChatContent, currentSessionIndex,
    setAttachedImages, setAttachedFiles, setEditingMessage,
    setShowCharacterSelection, setIsPermanentCharacterChangeCheckboxVisible,
    setUserInput, setFocusInput, setIsNewSessionFromHere,
    setReadyForRegenerate, setErrorMsg,
    manageProgressText
  } = useContext(StateContext);

  const sessionAICharacterName = chatContent[currentSessionIndex]?.ai_character_name || 'assistant';
  const aiCharacterName = message.ai_character_name || sessionAICharacterName;
  const avatarSrc = message.isUserMessage
    ? '/imgs/UserAvatar.jpg'
    : `/imgs/${aiCharacterName}.png`;

  const getSettings = useSettings();
  const currentSessionId = useCurrentSessionId();

  // first we process message as markdown and sanitize it - via dompurify
  const [sanitizedMarkdown, setSanitizedMarkdown] = useState('');
  useEffect(() => {
    const rawMarkdown = marked(messageText);
    const sanitized = DOMPurify.sanitize(rawMarkdown);
    setSanitizedMarkdown(sanitized);
  }, [messageText]);

  // to avoid problems with processing markdown for user message - we treat it differently
  // we will just wrap it in pre tag (so it's not processed as markdown)
  // it will not be pretty but it will work (and it caused quite a bit of problems)
  // for AI response we use sanitized markdown
  const messageContent = message.isUserMessage
    ? formatUserMessage(messageText)
    : sanitizedMarkdown;

  // audio files stored in android phone
  const androidStoredAudioFiles = message.file_locations
    ? message.file_locations.filter(isAndroidStoredAudioFile)
    : [];


  function formatUserMessage(message) {
    return <pre className="user-message-pre">{message}</pre>;
  }

  // get current character and determine value of autoResponse 
  const currentAICharacter = characters.find(char => char.nameForAPI === chatContent[currentSessionIndex].ai_character_name);
  const autoResponseIsFalse = currentAICharacter && !currentAICharacter.autoResponse;

  useEffect(() => {
    if (messageRef.current && !message.isUserMessage) {
      const preBlocks = messageRef.current.querySelectorAll('pre');
      preBlocks.forEach((preBlock, index) => {
        // Check if the pre block is already wrapped
        if (!preBlock.parentNode.classList.contains('code-block-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'code-block-wrapper';
          preBlock.parentNode.insertBefore(wrapper, preBlock);
          wrapper.appendChild(preBlock);

          const copyButton = document.createElement('button');
          copyButton.textContent = 'Copy';
          copyButton.className = 'copy-button';
          copyButton.dataset.index = index;
          wrapper.appendChild(copyButton);

          const codeBlock = preBlock.querySelector('code');
          if (codeBlock) {
            Prism.highlightElement(codeBlock);
          }
        }
      });

      // Wrap inline markdown images with download button and make clickable
      const images = messageRef.current.querySelectorAll('.message-content > img, .message-content p > img');
      const extractedUrls = [];

      images.forEach((img, mdIndex) => {
        // Collect URLs for modal navigation
        extractedUrls.push(img.src);

        // Check if already wrapped
        if (!img.parentNode.classList.contains('inline-image-wrapper')) {
          const wrapper = document.createElement('span');
          wrapper.className = 'inline-image-wrapper';
          img.parentNode.insertBefore(wrapper, img);
          wrapper.appendChild(img);

          // Add data attribute for click handling
          img.dataset.markdownIndex = mdIndex;
          img.style.cursor = 'pointer';

          const downloadBtn = document.createElement('button');
          downloadBtn.className = 'inline-image-download-btn';
          downloadBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e8eaed"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>';
          downloadBtn.title = 'Download image';
          downloadBtn.onclick = async (e) => {
            e.stopPropagation();
            const imgSrc = img.src;
            try {
              const response = await fetch(imgSrc, { cache: 'no-store' });
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = imgSrc.split('/').pop() || 'image.png';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(blobUrl);
            } catch (err) {
              // CORS blocked - open in new tab so user can save from there
              window.open(imgSrc, '_blank');
            }
          };
          wrapper.appendChild(downloadBtn);
        }
      });

      // Update state with extracted markdown image URLs
      if (extractedUrls.length > 0) {
        setMarkdownImageUrls(extractedUrls);
      }
    }
  }, [sanitizedMarkdown, message.isUserMessage]);

  // Update validImageLocations when message.image_locations changes
  useEffect(() => {
    setValidImageLocations(
      message.image_locations ? message.image_locations.filter(src => src !== "image_placeholder_url") : []
    );
  }, [message.image_locations]);
  useEffect(() => {
    setValidFileLocations(filterValidFiles(message.file_locations));
  }, [message.file_locations]);

  // and listener for click outside (if context menu appears and we click somewhere else we want to hide it)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenu && !event.target.closest('.context-menu')) {
        setContextMenu(null);
        setContextMenuIndex(null);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu, setContextMenuIndex]);

  // Check if message is empty and imageLocations and fileNames are also empty
  // BUT allow empty AI messages if they're the last message (shows loading indicator)
  const isEmptyMessage = (messageText === "" || messageText === ERROR_MESSAGE_FOR_TEXT_GEN) &&
    validImageLocations.length === 0 &&
    (!message.file_locations || message.file_locations.length === 0);

  if (isEmptyMessage) {
    // Show loading indicator for last AI message (placeholder for streaming response)
    if (!message.isUserMessage && isLastMessage) {
      // Continue rendering - will show loading indicator below
    } else {
      return null;
    }
  }

  // if message is empty, but files are present - it means that it is attached audio file or recording that was transcribed... so we don't need it
  /*if (message.message === "" && message.file_locations && message.file_locations.length > 0) {
    return null;
  }*/

  // show context menu when right clicked
  const handleRightClick = (event) => {
    // Only show context menu if clicking on text content, not empty space
    const target = event.target;
    const hasTextContent = target.textContent && target.textContent.trim().length > 0;

    if (hasTextContent) {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu(null);

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenuIndex(index);
    }
  };

  // this is used for both code block copy and whole message copy (on right click via context menu)
  // differentiator is codeBlock parameter - behaviour is bit different between two options
  const handleCopy = (e, options = {}) => {
    const { codeBlock = false } = options;
    var contentToCopy = messageText;
    const copyButton = e.target.closest('.copy-button');
    if (codeBlock) {
      contentToCopy = "";
      if (copyButton) {
        const codeElement = copyButton.previousElementSibling.querySelector('code');
        if (codeElement) {
          contentToCopy = codeElement.textContent;
        }
      }
      if (contentToCopy === "") {
        console.error('Failed to copy message');
        return;
      }
    } else {
      // Remove code block delimiters (prefixes , postfixes) when copying the whole message
      contentToCopy = contentToCopy.replace(/```[\w-]*\n([\s\S]*?)\n```/g, '$1');
    }

    if (process.env.NODE_ENV === 'production') {
      navigator.clipboard.writeText(contentToCopy)
        .catch((error) => {
          console.error('Failed to copy message', error);
        });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = contentToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    if (codeBlock) {
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    } else {
      setContextMenu(null);
    }
  };

  const handleEdit = () => {
    // save message index (so we know which message was edited) and message_id from DB - so we can update it later in DB as well
    setEditingMessage({ index, message_id: message.message_id });

    // Convert image locations to attached images format
    const attachedImages = convertFileAndImageLocationsToAttached(message.image_locations);
    const attachedFiles = convertFileAndImageLocationsToAttached(message.file_locations);
    setUserInput(messageText);
    setAttachedImages(attachedImages);
    setAttachedFiles(attachedFiles);
    setFocusInput(true);
    setContextMenu(null);
  };

  const handleRegenerate = () => {
    if (index > 0) {
      const previousMessage = chatContent[currentSessionIndex].messages[index - 1];

      // Check if the previous message is a user message
      if (previousMessage.isUserMessage) {
        setUserInput(previousMessage.message ?? '');
        // Convert image locations to attached images format
        const attachedImages = convertFileAndImageLocationsToAttached(previousMessage.image_locations);
        const attachedFiles = convertFileAndImageLocationsToAttached(previousMessage.file_locations);
        setAttachedImages(attachedImages);
        setAttachedFiles(attachedFiles);
        // Set the editing message position
        setEditingMessage({ index: index - 1, message_id: previousMessage.message_id });

        setReadyForRegenerate(true);
      }
    }
    setContextMenu(null);
  };

  const handleNewSessionFromHere = () => {
    // Extract messages up to and including the specified index
    const selectedChatItems = chatContent[currentSessionIndex].messages.slice(0, index + 1).map(item => ({ ...item, message_id: null }));

    const updatedChatContent = [...chatContent];
    // preserve same character
    //updatedChatContent[currentSessionIndex].ai_character_name = chatContent[currentSessionIndex].ai_character_name;
    updatedChatContent[currentSessionIndex].session_id = "";  // New session will get a new ID from the backend
    updatedChatContent[currentSessionIndex].messages = selectedChatItems;
    setChatContent(updatedChatContent);
    setShowCharacterSelection(true);
    setIsPermanentCharacterChangeCheckboxVisible(true);
    setIsNewSessionFromHere(true);
    setContextMenu(null);
  };

  const handleRemove = () => {
    // Remove the chat item
    const updatedChatContent = [...chatContent];
    const sessionMessages = updatedChatContent[currentSessionIndex].messages;
    const messageIdsToRemoveFromDB = [];

    if (sessionMessages[index].message_id) {
      messageIdsToRemoveFromDB.push(sessionMessages[index].message_id);
    }
    sessionMessages.splice(index, 1);
    setChatContent(updatedChatContent);
    setContextMenu(null);

    // if next message is AI message - we should remove it too
    if (index < sessionMessages.length && !sessionMessages[index].isUserMessage) {
      if (sessionMessages[index].message_id) {
        messageIdsToRemoveFromDB.push(sessionMessages[index].message_id);
      }
      sessionMessages.splice(index, 1);
      setChatContent(updatedChatContent);
    }

    // Check if session is empty
    const dbMethodToExecute = sessionMessages.length === 0 ? "db_remove_session" : "db_remove_messages";

    const finalInputForDB = {
      session_id: currentSessionId,
      ...(dbMethodToExecute === "db_remove_messages" && { message_ids: messageIdsToRemoveFromDB })
    };

    triggerAPIRequest("api/db", "provider.db", dbMethodToExecute, finalInputForDB, getSettings);

  };

  // show context menu (on right click) - different per user and ai message
  const renderContextMenu = () => {
    if (!contextMenu || contextMenuIndex !== index) return null;

    return (
      <div
        className="context-menu"
        style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed' }}
      >
        {(message.isUserMessage && (isLastMessage || autoResponseIsFalse)) && (
          <div className="context-menu-item" onClick={handleEdit}>Edit</div>
        )}
        {message.isUserMessage && (
          <div className="context-menu-item" onClick={handleRemove}>Remove</div>
        )}
        {!message.isUserMessage && (
          <>
            {isLastMessage && (
              <div className="context-menu-item" onClick={handleRegenerate}>Regenerate</div>
            )}
          </>
        )}
        <div className="context-menu-item" onClick={handleNewSessionFromHere}>New Session from here</div>
        <div className="context-menu-item" onClick={handleCopy}>Copy</div>
      </div>
    );
  };

  // on attached to message files (pdf or txt) - we can click - then we download them
  const handleFileClick = (index) => {
    const fileLocation = validFileLocations[index];
    const link = document.createElement('a');
    link.href = fileLocation;
    link.download = fileLocation.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Use allSessionImages if available, otherwise fallback to validImageLocations
  const imagesToDisplay = allSessionImages.length > 0 ? allSessionImages : validImageLocations;
  const chartPayloads = Array.isArray(message.chart_data) ? message.chart_data : [];

  // Parse inline chart blocks for messages with [CHART:id] markers
  const inlineBlocks = useMemo(() => {
    if (!message.isUserMessage && chartPayloads.length > 0 && hasInlineChartMarkers(messageText)) {
      return parseInlineCharts(messageText, chartPayloads);
    }
    return null;
  }, [messageText, chartPayloads, message.isUserMessage]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % imagesToDisplay.length);
  };
  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + imagesToDisplay.length) % imagesToDisplay.length);
  };

  // Markdown images modal handlers (separate gallery from attached images)
  const handleCloseMarkdownModal = () => {
    setIsMarkdownModalOpen(false);
  };
  const handleNextMarkdownImage = () => {
    setCurrentMarkdownImageIndex((prevIndex) => (prevIndex + 1) % markdownImageUrls.length);
  };
  const handlePrevMarkdownImage = () => {
    setCurrentMarkdownImageIndex((prevIndex) => (prevIndex - 1 + markdownImageUrls.length) % markdownImageUrls.length);
  };
  // Click handler for markdown images (using event delegation)
  const handleMarkdownImageClick = (e) => {
    const target = e.target;
    if (target.tagName === 'IMG' && target.dataset.markdownIndex !== undefined) {
      e.stopPropagation();
      const mdIndex = parseInt(target.dataset.markdownIndex, 10);
      setCurrentMarkdownImageIndex(mdIndex);
      setIsMarkdownModalOpen(true);
    }
  };

  const handleImgGenClick = async () => {
    try {
      manageProgressText("show", "Image");
      const imageLocation = await generateImage(messageText, getSettings);
      if (imageLocation) {
        setValidImageLocations(prevLocations => [...prevLocations, imageLocation]);
        // update chat content
        setChatContent((prevChatContent) => {
          // Make sure we update the correct session
          const updatedContent = [...prevChatContent];
          const sessionMessages = updatedContent[currentSessionIndex].messages;
          const currentMessage = sessionMessages[index];

          if (!currentMessage.image_locations.includes(imageLocation)) {
            currentMessage.image_locations.push(imageLocation);
          }
          // save to DB - i had to do it here - because if it was out of setChatContent - it sent outdated data
          updateSessionInDB(updatedContent[currentSessionIndex], currentSessionId, getSettings);
          return updatedContent;
        });
      } else {
        throw new Error("Problem generating image");
      }
    } catch (error) {
      setErrorMsg(error);
      console.error(error);
    } finally {
      manageProgressText("hide", "Image");
    }
  }

  const handleLocationClick = () => {
    if (messageText.startsWith("GPS location:")) {
      const coordinates = messageText.replace("GPS location:", "").trim();
      const googleMapsUrl = `https://www.google.com/maps?q=${coordinates}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  // IMAGE MODAL
  const handleImageClick = (localIndex) => {
    // Calculate the global index of the clicked image
    const globalIndex = imagesToDisplay.findIndex(src => src === validImageLocations[localIndex]);
    setCurrentImageIndex(globalIndex);
    setIsModalOpen(true);
  };

  return (
    <div className={`chat-message ${message.isUserMessage ? 'user' : 'ai'} ${message.isError ? 'error' : ''} ${isFloating ? 'floating-chat-message' : ''}`}
      ref={messageRef}
    >
      {renderContextMenu()}
      <div className="avatar">
        <img src={avatarSrc} alt="avatar" />
      </div>
      <div className="message-content">
        {message.isUserMessage ? (
          <>
            {/* Image description block - shown above user message */}
            {imageDescription && (
              <div className="image-description-block">
                <div className="image-description-label">Image Analysis</div>
                <div className="image-description-content">{imageDescription}</div>
              </div>
            )}
            <div onContextMenu={handleRightClick}>{messageContent}</div>
          </>
        ) : (
          <>
            {/* Tool activity display - shown above main message during tool execution */}
            {toolActivity && (
              <div className="tool-activity-block">
                <div className="tool-activity-content">{toolActivity}</div>
              </div>
            )}
            {/* Reasoning/Thinking display - shown above main message */}
            {aiReasoning && getTextShowReasoning() && (
              <div className="ai-reasoning-block">
                <div className="ai-reasoning-label">Thinking</div>
                <div className="ai-reasoning-content">{aiReasoning}</div>
              </div>
            )}
            {/* Loading indicator for empty AI message (streaming placeholder) */}
            {isEmptyMessage && isLastMessage ? (
              <div className="ai-loading-indicator">
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
              </div>
            ) : inlineBlocks ? (
              /* Inline chart rendering - interleave text and charts */
              <div className="message-content-inline" ref={messageRef} onContextMenu={handleRightClick}>
                {inlineBlocks.map((block, blockIdx) =>
                  block.type === 'text' ? (
                    <div
                      key={`text-${blockIdx}`}
                      className="inline-text-block"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(block.content)) }}
                      onClick={(e) => {
                        handleCopy(e, { codeBlock: true });
                        handleMarkdownImageClick(e);
                      }}
                    />
                  ) : (
                    <div key={`chart-${block.chartId}`} className="inline-chart-block">
                      <ChartMessageBlock chartPayload={block.payload} />
                    </div>
                  )
                )}
              </div>
            ) : (
              /* Standard rendering - no inline markers */
              <div
                className="message-content"
                dangerouslySetInnerHTML={{ __html: messageContent }}
                ref={messageRef}
                onContextMenu={handleRightClick}
                onClick={(e) => {
                  handleCopy(e, { codeBlock: true });
                  handleMarkdownImageClick(e);
                }}
              />
            )}
          </>
        )}
        {/* Append text if there are Android-stored audio files */}
        {androidStoredAudioFiles.length > 0 && (
          <div className="android-audio-text">
            audio file in android storage (..{androidStoredAudioFiles[0].split('_').slice(-2).join('_')})
          </div>
        )}
        {message.ai_character_name === 'iris' && !message.isUserMessage ? (
          <button className="img-chat-message-button" onClick={handleImgGenClick}>
            {getSvgIcon('buttonGenerateImage')}
          </button>
        ) : null}
        {isGPSLocationMessage ? (
          <button className="img-chat-message-button" onClick={handleLocationClick}>
            {getSvgIcon('buttonGPS')}
          </button>
        ) : null}
        {validImageLocations.length > 0 && (
          <div className="image-container">
            {validImageLocations.map((src, localIndex) => (
              <img key={localIndex} src={src} alt="Chat" onClick={() => handleImageClick(localIndex)} />
            ))}
          </div>
        )}
        {validFileLocations.length > 0 && (
          <div key={index} className="file-placeholder-preview">
            {validFileLocations.map((src, index) => (
              <div key={index} className="file-placeholder" onClick={() => handleFileClick(index)}>
                <span className="pdfName">
                  PDF:<br />
                  {src.split("/")[7].substring(0, 15)}
                  {src.split("/")[7].length > 15 && '...'}
                </span>
              </div>
            ))}
          </div>
        )}
        {message.file_locations && message.file_locations.filter(isValidAudioFile).map((src, index) => (
          <audio key={index} controls>
            <source src={src} type="audio/ogg" />
            Your browser does not support the audio element.
          </audio>
        ))}
        {/* Only show bottom chart list when NOT using inline rendering */}
        {!inlineBlocks && chartPayloads.length > 0 && (
          <div className="chart-message-list">
            {chartPayloads.map((chart, chartIndex) => (
              <ChartMessageBlock
                key={chart.chart_id || `${message.message_id || index}-chart-${chartIndex}`}
                chartPayload={chart}
              />
            ))}
          </div>
        )}
        {getGeneralShowMessageInfoBottomRight() && (apiTextGenAIModelName || message.created_at) && (
          <div className="date-ai-model-name">
            {apiTextGenAIModelName && <span className="generated-info">{apiTextGenAIModelName}</span>}
            {apiImageGenSettings && (
              <span className="generated-info">
                {(() => {
                  try {
                    const settings = typeof apiImageGenSettings === 'string'
                      ? JSON.parse(apiImageGenSettings)
                      : apiImageGenSettings;
                    return settings?.model || '';
                  } catch { return ''; }
                })()}
              </span>
            )}
            {message.created_at && <span className="generated-info">{formatDate(message.created_at)}</span>}
          </div>
        )}
      </div>
      {
        isModalOpen && (
          <ChatImageModal
            images={imagesToDisplay}
            currentIndex={currentImageIndex}
            onClose={handleCloseModal}
            onNext={handleNextImage}
            onPrev={handlePrevImage}
            isImage={true}
          />
        )
      }
      {/* Modal for markdown images (separate from attached images) */}
      {isMarkdownModalOpen && markdownImageUrls.length > 0 && (
        <ChatImageModal
          images={markdownImageUrls}
          currentIndex={currentMarkdownImageIndex}
          onClose={handleCloseMarkdownModal}
          onNext={handleNextMarkdownImage}
          onPrev={handlePrevMarkdownImage}
          isImage={true}
        />
      )}
    </div >
  );
});

export default ChatMessage;
