// BottomToolsMenu.js
import React, { useState, useRef, useEffect, useContext } from 'react';

import { StateContext } from './StateContextProvider';

import './css/BottomToolsMenu.css';
import { useSettings } from '../hooks/useSettings';
import { uploadFileToS3, extractResponseData } from '../services/api.methods';
import ChatCharacters, { filterCharacters, characters } from './ChatCharacters';

import { getSvgIcon } from '../utils/svg.icons.provider';
import { resizeImage } from '../utils/image.utils';
import AudioRecorder from '../utils/audio.recording';

import {
  setTextEnableReasoning,
  setGeneralAiAgentEnabled,
  setGeneralWebsearchEnabled,
  setGeneralDeepResearchEnabled,
} from '../utils/configuration';

const STORAGE_UPLOAD_ENDPOINT = "api/v1/storage/upload";

const BottomToolsMenu = ({ handleSendClick, mode = 'normal', mScrollToBottom }) => {
  const userInputRef = useRef(null);
  // to control UI while images are being uploaded
  const [uploading, setUploading] = useState(false);
  const [showLocalCharacterSelect, setShowLocalCharacterSelect] = useState(false);
  // used when choosing character after @ is used - this is list of displayed characters based on filters
  const [displayedCharacters, setDisplayedCharacters] = useState(characters);
  // when filtering characters - one will be selected by default - this was done because when hitting enter (when character select view was visible) it was submitting message and not choosing character
  const [selectedCharacterName, setSelectedCharacterName] = useState("Assistant");
  // New state for tool buttons
  const [thinkEnabled, setThinkEnabled] = useState(false);
  const [browseEnabled, setBrowseEnabled] = useState(false);
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
  const [aiAgentEnabled, setAiAgentEnabled] = useState(false);
  const [revisedEnabled, setRevisedEnabled] = useState(false);
  // New state to track recording status
  const [isRecording, setIsRecording] = useState(false);

  // Refs to help updating the AI placeholder messages for audio responses
  const transcriptionMessageIndexRef = useRef(null);
  const aiAnswerMessageIndexRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const isStartingRecordingRef = useRef(false); // Prevent double execution
  // Refs to track current attachments (needed for closure in AudioRecorder callback)
  const attachedImagesRef = useRef([]);
  const attachedFilesRef = useRef([]);

  const {
    userInput, setUserInput,
    chatContent, setChatContent, currentSessionIndexRef,
    attachedImages, setAttachedImages,
    attachedFiles, setAttachedFiles,
    editingMessage, isPermanentCharacterChangeSet,
    setIsPermanentCharacterChangeCheckboxVisible, setIsPermanentCharacterChangeSet,
    focusInput, setFocusInput, isMobile,
    isLoading, setErrorMsg, setBottomToolsHeight,
    showHealthOptions, setShowHealthOptions,
    includeHealthData, setIncludeHealthData,
    includeCorrelationData, setIncludeCorrelationData, correlationData,
    setShouldSkipSessionFetching
  } = useContext(StateContext);

  const getSettings = useSettings();

  const getUploadedFileUrl = (response) => {
    const payload = extractResponseData(response);
    if (typeof payload === 'string') {
      return payload;
    }
    if (payload && typeof payload === 'object') {
      return payload.url || payload.result || payload.message || '';
    }
    return '';
  };

  // Initialize settings to false on component mount
  useEffect(() => {
    console.log("Initializing settings to false on component mount");
    setTextEnableReasoning(false);
    setGeneralAiAgentEnabled(false);
    setGeneralWebsearchEnabled(false);
    setGeneralDeepResearchEnabled(false);
  }, []);

  // Keep attachment refs in sync with state (for AudioRecorder closure)
  useEffect(() => {
    attachedImagesRef.current = attachedImages;
  }, [attachedImages]);

  useEffect(() => {
    attachedFilesRef.current = attachedFiles;
  }, [attachedFiles]);

  const handleSendButtonClick = () => {
    checkIfCharacterMentioned();

    setShowLocalCharacterSelect(false);
    handleSendClick();
  }

  // Toggle recording when the microphone button is clicked
  const handleMicClick = async () => {
    if (!isRecording) {
      // Prevent double execution using ref (state update is async)
      if (isStartingRecordingRef.current) {
        console.log("Recording already starting, ignoring duplicate click");
        return;
      }
      isStartingRecordingRef.current = true;

      // Set recording state IMMEDIATELY to prevent double-clicks
      setIsRecording(true);

      // Get current session index
      const sessionIndex = currentSessionIndexRef.current;

      // Reset the message indices
      transcriptionMessageIndexRef.current = null;
      aiAnswerMessageIndexRef.current = null;

      // Create a placeholder for the transcription message
      setChatContent(prevChatContent => {
        const updated = [...prevChatContent];
        // Store the index for later updates
        transcriptionMessageIndexRef.current = updated[sessionIndex].messages.length;

        // Add the placeholder message
        updated[sessionIndex].messages.push({
          message: "Recording...",
          isUserMessage: true,
          created_at: new Date().toISOString(),
          image_locations: [],
          file_locations: [],
          ai_character_name: updated[sessionIndex].ai_character_name,
        });

        return updated;
      });

      // Create and start the audio recorder
      audioRecorderRef.current = new AudioRecorder({
        getSettings: () => {
          // Make sure we're getting the latest settings
          const settings = getSettings();
          console.log("Audio recorder settings:", settings);
          return settings;
        },
        // Get current character for Claude Code detection
        getCurrentCharacter: () => {
          const currentSession = chatContent[currentSessionIndexRef.current];
          const characterName = currentSession?.ai_character_name;
          return characters.find(c => c.nameForAPI === characterName);
        },
        // Get current session ID for Claude Code API
        getSessionId: () => {
          return chatContent[currentSessionIndexRef.current]?.session_id || '';
        },
        setSessionId: (newSessionId) => {
          setChatContent(prevChatContent => {
            const updated = [...prevChatContent];
            const sessionIdx = currentSessionIndexRef.current;
            const currentSession = updated[sessionIdx];
            if (currentSession && currentSession.session_id !== newSessionId) {
              updated[sessionIdx] = {
                ...currentSession,
                session_id: newSessionId
              };
            }
            return updated;
          });
        },
        onTranscriptionUpdate: (text) => {
          console.log("Transcription update callback:", text);
          // Update the transcription placeholder message with updated text
          setChatContent(prevChatContent => {
            const updated = [...prevChatContent];
            const idx = transcriptionMessageIndexRef.current;
            if (idx !== null && idx !== undefined) {
              // Update the user's transcribed message
              updated[currentSessionIndexRef.current].messages[idx].message = text;
              // Make sure it's still marked as a user message
              updated[currentSessionIndexRef.current].messages[idx].isUserMessage = true;
            }
            return updated;
          });
        },
        onAiAnswerUpdate: (text) => {
          console.log("AI answer update callback:", text);
          // Update or create the AI answer message
          setChatContent(prevChatContent => {
            const updated = [...prevChatContent];
            const sessionIdx = currentSessionIndexRef.current;

            // Check if this is a Claude Code character (status updates should replace, not append)
            const characterName = updated[sessionIdx]?.ai_character_name;
            const character = characters.find(c => c.nameForAPI === characterName);
            const isClaudeCode = character?.isClaudeCodeCharacter === true;

            if (aiAnswerMessageIndexRef.current === null) {
              // First "text" chunk: create a new placeholder for AI's answer
              updated[sessionIdx].messages.push({
                message: text,
                isUserMessage: false,
                created_at: new Date().toISOString(),
                image_locations: [],
                file_locations: [],
                ai_character_name: updated[sessionIdx].ai_character_name,
              });
              aiAnswerMessageIndexRef.current = updated[sessionIdx].messages.length - 1;
            } else if (isClaudeCode) {
              // Claude Code characters: replace message (status updates like "Sherlock is investigating...")
              updated[sessionIdx].messages[aiAnswerMessageIndexRef.current].message = text;
            } else {
              // Standard WebSocket streaming: append to the existing AI answer message
              const currentMessage = updated[sessionIdx].messages[aiAnswerMessageIndexRef.current].message;
              updated[sessionIdx].messages[aiAnswerMessageIndexRef.current].message = currentMessage + text;
            }

            return updated;
          });

          // Scroll to the latest message
          if (mScrollToBottom) {
            setTimeout(() => {
              mScrollToBottom(currentSessionIndexRef.current, false);
            }, 100);
          }
        },
        // For Claude Code characters: replace entire message (not append)
        onSherlockResponse: (content, messageId, returnedSessionId) => {
          console.log("Claude Code response received:", { messageId, returnedSessionId });
          setChatContent(prevChatContent => {
            const updated = [...prevChatContent];
            const sessionIdx = currentSessionIndexRef.current;

            // Update session ID if returned
            // Skip session fetching to prevent ChatWindow from overwriting current chat with old DB content
            if (returnedSessionId && !updated[sessionIdx].session_id) {
              setShouldSkipSessionFetching(true);
              updated[sessionIdx].session_id = returnedSessionId;
            }

            // Replace the AI message content entirely
            if (aiAnswerMessageIndexRef.current !== null) {
              updated[sessionIdx].messages[aiAnswerMessageIndexRef.current].message = content;
              updated[sessionIdx].messages[aiAnswerMessageIndexRef.current].message_id = messageId;
            }

            return updated;
          });

          // Scroll to the latest message
          if (mScrollToBottom) {
            setTimeout(() => {
              mScrollToBottom(currentSessionIndexRef.current, false);
            }, 100);
          }
        },
        onReasoningUpdate: (text) => {
          console.log("Reasoning/Thinking update callback:", text);
          // Update the AI message with reasoning/thinking content
          setChatContent(prevChatContent => {
            const updated = [...prevChatContent];
            const sessionIdx = currentSessionIndexRef.current;

            // If AI message doesn't exist yet, create it first
            if (aiAnswerMessageIndexRef.current === null) {
              updated[sessionIdx].messages.push({
                message: '',
                isUserMessage: false,
                created_at: new Date().toISOString(),
                image_locations: [],
                file_locations: [],
                ai_character_name: updated[sessionIdx].ai_character_name,
                ai_reasoning: text,
              });
              aiAnswerMessageIndexRef.current = updated[sessionIdx].messages.length - 1;
              return updated;
            }

            // Create new object references to trigger React.memo re-render
            return prevChatContent.map((session, sIdx) => {
              if (sIdx !== currentSessionIndexRef.current) return session;
              return {
                ...session,
                messages: session.messages.map((msg, mIdx) => {
                  if (mIdx !== aiAnswerMessageIndexRef.current) return msg;
                  return { ...msg, ai_reasoning: text };
                })
              };
            });
          });
        },
        onProcessingComplete: () => {
          console.log("Audio processing complete");
          setIsRecording(false);
          isStartingRecordingRef.current = false;
        },
        onError: (error) => {
          console.error("Recording error:", error);
          setErrorMsg("Error during voice recording. Please try again.");
          setIsRecording(false);
          isStartingRecordingRef.current = false;
        },
        // Pass chat content and current session index to AudioRecorder
        chatContent: chatContent,
        currentSessionIndex: currentSessionIndexRef.current,
        // Callback to get current attachments at stop time
        // Used to include attachments added DURING recording in RecordingFinished message
        // Uses refs to get latest values (not stale closure values)
        getAttachments: () => {
          const result = [];
          // Get uploaded images (filter out placeholders that haven't finished uploading)
          attachedImagesRef.current.forEach(img => {
            if (img.url && !img.placeholder) {
              result.push({ type: 'image', url: img.url });
            }
          });
          // Get uploaded files (PDFs, etc.)
          attachedFilesRef.current.forEach(file => {
            if (file.url && !file.placeholder) {
              result.push({ type: 'file', url: file.url });
            }
          });
          return result;
        }
      });

      try {
        await audioRecorderRef.current.start();
        // Recording started successfully - clear the starting flag
        isStartingRecordingRef.current = false;
      } catch (error) {
        console.error("Failed to start recording:", error);
        setErrorMsg("Could not access microphone. Please check your browser permissions.");
        setIsRecording(false);
        isStartingRecordingRef.current = false;
      }
    } else {
      // Stop the recording
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  const handleAttachClick = () => {
    document.getElementById('file-input').click();
  };

  const handleFileChange = async (e) => {
    setErrorMsg("");
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const pdfFiles = files.filter(file => file.type === 'application/pdf');

    // Display placeholders
    const placeholders = imageFiles.map(file => ({ file, url: '', placeholder: true }));
    setAttachedImages(prevImages => [...prevImages, ...placeholders]);

    // Display placeholders for PDFs
    const pdfPlaceholders = pdfFiles.map(file => ({ file, url: '', name: file.name, placeholder: true }));
    setAttachedFiles(prevPdfs => [...prevPdfs, ...pdfPlaceholders]);

    setUploading(true);
    for (const imageFile of imageFiles) {
      try {
        const resizedFile = await resizeImage(imageFile);
        const response = await uploadFileToS3(STORAGE_UPLOAD_ENDPOINT, "provider.s3", "s3_upload", getSettings, resizedFile);

        if (response.success) {
          const newUrl = getUploadedFileUrl(response);
          if (!newUrl) {
            throw new Error('Upload response did not include a URL');
          }
          setAttachedImages(prevImages => prevImages.map(img => img.file === imageFile ? { ...img, url: newUrl, placeholder: false } : img));
        } else {
          setErrorMsg("Problem with file upload. Try again.")
          throw new Error(response.message);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setErrorMsg("Problem with file upload. Try again.")
        setAttachedImages(prevImages => prevImages.filter(img => img.file !== imageFile));
      }
    }

    // Upload PDFs
    for (const pdfFile of pdfFiles) {
      console.log("pdfFile: ", pdfFile)
      try {
        const response = await uploadFileToS3(STORAGE_UPLOAD_ENDPOINT, "provider.s3", "s3_upload", getSettings, pdfFile);

        if (response.success) {
          const newUrl = getUploadedFileUrl(response);
          if (!newUrl) {
            throw new Error('Upload response did not include a URL');
          }
          console.log("New url: ", newUrl)
          setAttachedFiles(prevPdfs => prevPdfs.map(pdf => pdf.file === pdfFile ? { ...pdf, url: newUrl, placeholder: false } : pdf));

        } else {
          setErrorMsg("Problem with file upload. Try again.")
          throw new Error(response.message);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setErrorMsg("Problem with file upload. Try again.")
        setAttachedFiles(prevPdfs => prevPdfs.filter(pdf => pdf.file !== pdfFile));
      }
    }

    setUploading(false);
  };

  const handleRemoveImage = (index) => {
    setAttachedImages(prevImages => prevImages.filter((_, i) => i !== index));
  };

  const handleRemovePdf = (index) => {
    setAttachedFiles(prevPdfs => prevPdfs.filter((_, i) => i !== index));
  };

  const handleInputChange = async (e) => {
    const inputValue = e.target.value;
    setUserInput(inputValue);

    // if @ is used - we trigger character selection view
    if (inputValue.includes("@")) {
      const atIndex = inputValue.lastIndexOf("@");
      const query = inputValue.substring(atIndex + 1).toLowerCase();
      setIsPermanentCharacterChangeCheckboxVisible(true);
      // we can filter out characters by name
      if (query === "") {
        setDisplayedCharacters(characters);
      } else {
        const filtered = filterCharacters(query);
        setDisplayedCharacters(filtered);
      }
    } else { // if there is @ in userInput (for example removed) - hide selection view
      setShowLocalCharacterSelect(false);
    }

    if (inputValue === "") {
      setShowLocalCharacterSelect(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Only prevent default and submit on Enter if not on mobile
      if (!isMobile) {
        e.preventDefault();
        checkIfCharacterMentioned();
        handleSendClick();
      } else {
        // On mobile, just add a new line
        e.preventDefault();
        setUserInput(prev => prev + '\n');
      }
    }
  };

  // to handle ENTER, arrows (when choosing AI character from the list)
  const handleKeyDown = async (event) => {
    if (showLocalCharacterSelect) {
      var currentIndex = displayedCharacters.findIndex(char => char.name === selectedCharacterName);
      // there were some stupid problems - where currentIndex was found as -1
      if (displayedCharacters.length === 1 || currentIndex === -1) currentIndex = 0;

      if (event.key === "Enter" || event.key === 13) {
        event.preventDefault();
        handleCharacterSelect(displayedCharacters[currentIndex]);
      } else if (event.key === "ArrowRight" || event.key === 39) {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % displayedCharacters.length;
        setSelectedCharacterName(displayedCharacters[nextIndex].name);
      } else if (event.key === "ArrowLeft" || event.key === 37) {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + displayedCharacters.length) % displayedCharacters.length;
        setSelectedCharacterName(displayedCharacters[prevIndex].name);
      } else if (event.key === "Escape" || event.key === 27) {
        setShowLocalCharacterSelect(false);
      }
    } else if (event.key === "@" || event.key === 50) {
      setShowLocalCharacterSelect(true);
    }
  };


  // used when submit button is clicked or enter is used to submit
  // if @ is used in edited message - we check if there is character mentioned
  const checkIfCharacterMentioned = () => {
    // if it's editing message and there is @ mention of different character - let use set proper one!
    if (editingMessage !== null) {
      const atIndex = userInput.lastIndexOf("@");
      if (atIndex !== -1) {
        // Extract the full character name after the '@' symbol
        const afterAt = userInput.substring(atIndex + 1);

        // Check combinations of 1, 2, or 3 words
        // because character names can be like that
        const words = afterAt.split(/\s+/);
        const potentialNames = [
          words[0],
          words.slice(0, 2).join(' '),
          words.slice(0, 3).join(' ')
        ];

        const character = potentialNames
          .map(name => characters.find(char => char.name.toLowerCase() === name.toLowerCase()))
          .find(char => char); // Find the first matching character

        if (character) {
          // but only if it's not set already (because it should be reset via call.chat.api)
          // there is case where we edit message, mention character via @ and then when send button is used and this function is triggered - it sets original and current to same character
          if (chatContent[currentSessionIndexRef.current].original_ai_character === "")
            handleCharacterSelect(character);
        }
      }
    }
  }

  // executed when character is chosen from the list
  const handleCharacterSelect = (character) => {
    setShowLocalCharacterSelect(false);

    // avoid error -> if @ is used and nothing is chosen
    if (character && character.nameForAPI) {

      const current_ai_character = chatContent[currentSessionIndexRef.current].ai_character_name;
      // set current (main AI character) to temporary variable (so later in ChatHandleAPI we can fallback)
      setChatContent((prevChatContent) => {
        const updatedChatContent = [...prevChatContent];
        updatedChatContent[currentSessionIndexRef.current].ai_character_name = character.nameForAPI;
        // if it's not permanent change - we set original character - so later we can fall back to it
        if (!isPermanentCharacterChangeSet) {
          updatedChatContent[currentSessionIndexRef.current].original_ai_character = current_ai_character;
        }
        // reset the flag
        setIsPermanentCharacterChangeSet(false);

        return updatedChatContent;
      });

      // reset display character (for next execution)
      setDisplayedCharacters(characters);
      setFocusInput(true);
      // set nicely full name of AI character after @
      setUserInput((prevInput) => {
        const cursorPosition = userInputRef.current.selectionStart;
        const atIndex = prevInput.lastIndexOf("@", cursorPosition - 1);
        if (atIndex !== -1) {
          const newText = prevInput.substring(0, atIndex + 1) + character.name + " " + prevInput.substring(cursorPosition);
          return newText;
        }
        return prevInput;
      });
    } else {
      setFocusInput(true);
    }
  };

  // when i'm in text area and i paste image - it should be uploaded as attached one
  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    let imageFile = null;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageFile = items[i].getAsFile();
        break;
      }
    }

    if (imageFile) {
      e.preventDefault();
      setErrorMsg("");

      // Display placeholder
      const placeholder = { file: imageFile, url: '', placeholder: true };
      setAttachedImages(prevImages => [...prevImages, placeholder]);

      setUploading(true);
      try {
        const resizedFile = await resizeImage(imageFile);
        const response = await uploadFileToS3(STORAGE_UPLOAD_ENDPOINT, "provider.s3", "s3_upload", getSettings, resizedFile);

        if (response.success) {
          const newUrl = getUploadedFileUrl(response);
          if (!newUrl) {
            throw new Error('Upload response did not include a URL');
          }
          setAttachedImages(prevImages => prevImages.map(img =>
            img.file === imageFile ? { ...img, url: newUrl, placeholder: false } : img
          ));
        } else {
          setErrorMsg("Problem with file upload. Try again.")
          throw new Error(response.message);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setErrorMsg("Problem with file upload. Try again.")
        setAttachedImages(prevImages => prevImages.filter(img => img.file !== imageFile));
      }
      setUploading(false);
    }
  };

  // setting height of user input (if more then 1 line)
  useEffect(() => {
    const input = userInputRef.current;
    if (input) {
      input.style.height = 'auto';
      const halfOfScreen = window.innerHeight * 0.5;
      //input.style.height = `${Math.min(input.scrollHeight, halfOfScreen)}px`;
      const newHeight = Math.min(input.scrollHeight, halfOfScreen);
      input.style.height = `${newHeight}px`;
      setBottomToolsHeight(newHeight);
    }

  }, [userInput, setBottomToolsHeight]);

  // make sure that user input is active on load (so we will not need to click on it)
  useEffect(() => {
    if (userInputRef.current) {
      if (!isMobile)
        userInputRef.current.focus();
    }
  }, [isMobile]);
  useEffect(() => {
    if (focusInput && userInputRef.current) {
      // on mobile let's put focus manually
      if (!isMobile)
        userInputRef.current.focus();
      setFocusInput(false);
    }
  }, [focusInput, isMobile, setFocusInput]);

  // Toggle handlers for the new buttons
  const toggleThink = () => {
    const newValue = !thinkEnabled;
    disableAllTools();
    setThinkEnabled(newValue);
    setTextEnableReasoning(newValue);
  };

  const toggleBrowse = () => {
    const newValue = !browseEnabled;
    disableAllTools();
    setBrowseEnabled(newValue);
    setGeneralWebsearchEnabled(newValue);
  };

  const toggleResearch = () => {
    const newValue = !deepResearchEnabled;
    disableAllTools();
    setDeepResearchEnabled(newValue);
    setGeneralDeepResearchEnabled(newValue);
  };

  const toggleAiAgent = () => {
    const newValue = !aiAgentEnabled;
    disableAllTools();
    setAiAgentEnabled(newValue);
    setGeneralAiAgentEnabled(newValue);
  };

  const toggleRevised = () => {
    const newValue = !revisedEnabled;
    //disableAllTools();
    setRevisedEnabled(newValue);
  };

  const disableAllTools = () => {
    setThinkEnabled(false);
    setBrowseEnabled(false);
    setDeepResearchEnabled(false);
    setAiAgentEnabled(false);
    setRevisedEnabled(false);
  }

  // Helper function to get the SVG with proper styling
  const getStyledSvgIcon = (iconName, isEnabled) => {
    // For the think icon, we use different icons based on state
    if (iconName === 'think') {
      return isEnabled ? getSvgIcon('thinkOn') : getSvgIcon('thinkOff');
    }

    // For the research icon, we use different icons based on state
    if (iconName === 'research') {
      return isEnabled ? getSvgIcon('deepResearchOn') : getSvgIcon('deepResearchOff');
    }

    // For other icons, we use the same icon but apply CSS styling
    return getSvgIcon(iconName);
  };

  return (
    <div className={`bottom-tools-menu ${mode === 'health' ? 'floating-bottom-tools-menu' : ''}`}>
      <div className="bottom-tools-menu-characters">
        {showLocalCharacterSelect && <ChatCharacters onSelect={handleCharacterSelect} characters={displayedCharacters} selectedCharacterName={selectedCharacterName} />}
      </div>

      {/* Floating button to show health options (only in Health section ) */}
      {mode === 'health' && !showHealthOptions && (
        <button className="floating-health-options-button" onClick={() => setShowHealthOptions(true)}>
          +
        </button>
      )}

      {/* Health Additional Options Section */}
      {mode === 'health' && showHealthOptions && (
        <div className="health-options-section">
          <div className="health-switch">
            <label>
              <input
                type="checkbox"
                checked={includeHealthData}
                onChange={(e) => {
                  setIncludeHealthData(e.target.checked);
                }}
              />
              Include health data
            </label>
          </div>
          <div className="health-switch">
            <label>
              <input
                type="checkbox"
                checked={includeCorrelationData}
                onChange={(e) => {
                  setIncludeCorrelationData(e.target.checked);
                  if (correlationData === null) {
                    setErrorMsg("No correlation data available. Generate correlations first.");
                    setIncludeCorrelationData(false);
                  }
                }}
              />
              Include correlations
            </label>
          </div>
        </div>
      )}

      <div className="image-preview-container">
        {attachedImages.map((image, index) => (
          <div key={index} className="image-preview">
            {image.placeholder ? (
              <div className="placeholder" />
            ) : (
              <img src={image.url} alt="preview" />
            )}
            <button className="remove-button" onClick={() => handleRemoveImage(index)}>X</button>
          </div>
        ))}
        {attachedFiles.map((pdf, index) => (
          <div key={index} className="image-preview">
            <div className="placeholder">
              <span className="pdfName">{pdf.name}</span>
            </div>
            <button className="remove-button" onClick={() => handleRemovePdf(index)}>X</button>
          </div>
        ))}
      </div>

      <div className="input-area-container">
        <textarea
          ref={userInputRef}
          className="message-input"
          placeholder="Talk to me..."
          value={userInput}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onKeyPress={handleKeyPress}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />

        <div className="buttons-row">
          <div className="tool-buttons">
            <button
              className={`tool-button ${thinkEnabled ? 'enabled' : 'disabled'}`}
              onClick={toggleThink}
              title="Think"
            >
              {getStyledSvgIcon('think', thinkEnabled)}
              <span className="button-text">Think</span>
            </button>

            {mode !== 'imagecenter' && (
              <button
                className={`tool-button ${browseEnabled ? 'enabled' : 'disabled'}`}
                onClick={toggleBrowse}
                title="Browse Internet"
              >
                {getSvgIcon('browseInternet')}
                <span className="button-text">Browse</span>
              </button>
            )}

            {mode !== 'imagecenter' && (
              <button
                className={`tool-button ${deepResearchEnabled ? 'enabled' : 'disabled'}`}
                onClick={toggleResearch}
                title="Deep Research"
              >
                {getStyledSvgIcon('research', deepResearchEnabled)}
                <span className="button-text">Research</span>
              </button>
            )}

            <button
              className={`tool-button ${aiAgentEnabled ? 'enabled' : 'disabled'}`}
              onClick={toggleAiAgent}
              title="AI Agent"
            >
              {getSvgIcon('aiAgent')}
              <span className="button-text">Agent</span>
            </button>

            {mode === 'imagecenter' && (
              <button
                className={`tool-button ${revisedEnabled ? 'enabled' : 'disabled'}`}
                onClick={toggleRevised}
                title="Revised"
              >
                {getSvgIcon('revise')}
                <span className="button-text">Revised</span>
              </button>
            )}
          </div>

          <div className="action-buttons">
            <button className="send-button" onClick={handleSendButtonClick} disabled={isLoading || uploading}>
              {getSvgIcon('buttonSend')}
            </button>
            <button className="attach-button" onClick={handleAttachClick} disabled={isLoading || uploading}>
              {getSvgIcon('buttonAttach')}
            </button>
            {/* Microphone button toggles the AudioRecorder */}
            <button
              className={`mic-button ${isRecording ? 'recording' : ''}`}
              onClick={handleMicClick}
              disabled={isLoading || uploading}
            >
              {isRecording ? getSvgIcon('buttonStopMic') : getSvgIcon('buttonStartMic')}
            </button>
          </div>
        </div>
      </div>

      <input
        type="file"
        id="file-input"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        multiple
      />
    </div>
  );
};

export default BottomToolsMenu;
