// Main.js

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { StateContext } from './StateContextProvider';
import useChatAPI from '../hooks/useChatAPI';

import TopMenu from './TopMenu';
import BottomToolsMenu from './BottomToolsMenu';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ProgressIndicator from './ProgressIndicator';
import './css/Main.css';

import config from '../config';
import {
  getTextModelName, setURLForAPICalls,
  setTextEnableReasoning, setGeneralAiAgentEnabled,
  setGeneralWebsearchEnabled, setGeneralDeepResearchEnabled,
} from '../utils/configuration';

const Main = () => {
  // to get sessionId from URL and load the session
  const { sessionId } = useParams();
  const navigate = useNavigate();
  // sidebar visibility (mostly it's about mobile)
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const {
    chatContent, setChatContent, currentSessionIndex,
    setShouldSkipSessionFetching, setCurrentSessionIndex, setSidebarResetTrigger,
    setShowCharacterSelection, readyForRegenerate, setReadyForRegenerate,
    progressBarMessage, userInput, setUserInput, sidebarSearchText,
    editingMessage, attachedImages, setAttachedImages,
    attachedFiles, setAttachedFiles, setFocusInput, setEditingMessage,
    setTopMenuDropdownVisible, setIsPermanentCharacterChangeCheckboxVisible,
    currentSessionIndexRef,
    setIsLoading, errorMsg, setErrorMsg, mScrollToBottom,
    setChartLoadingState, setChartError
  } = useContext(StateContext);

  // custom hook
  const { callChatAPI } = useChatAPI();

  setURLForAPICalls();

  // if URL consists of sessionId
  useEffect(() => {
    if (config.VERBOSE_SUPERB === 1) {
      console.log("sessionId set to: ", sessionId)
    }
    setChatContent((prevChatContent) => {
      const updatedChatContent = [...prevChatContent];
      updatedChatContent[currentSessionIndexRef.current].session_id = sessionId;
      return updatedChatContent;
    });

  }, [sessionId, currentSessionIndexRef, setChatContent]);

  // Update ref every time currentSessionIndex changes (use cases above)
  useEffect(() => {
    currentSessionIndexRef.current = currentSessionIndex;
  }, [currentSessionIndex, currentSessionIndexRef]);

  // this is executable in case session is chosen in Sidebar
  const handleSelectSession = (session) => {
    if (config.DEBUG === 1) {
      console.log("session selected: ", session)
    }
    setShouldSkipSessionFetching(false);
    setChatContent((prevChatContent) => {
      const updatedChatContent = [...prevChatContent];
      updatedChatContent[currentSessionIndexRef.current].session_id = session.session_id;
      return updatedChatContent;
    });
    navigate(`/session/${session.session_id}`);
    setShowCharacterSelection(false);
    setFocusInput(true);
    setTopMenuDropdownVisible(false);
  };

  // new chat session (in top menu) clicked - pretty much reset
  const handleOnNewChatClicked = () => {
    navigate(`/`);
    // only if there is some text in search bar - reset it (because it triggers re-render)
    if (sidebarSearchText !== '') {
      setSidebarResetTrigger(true);
    }
    setShowCharacterSelection(true);
    setIsPermanentCharacterChangeCheckboxVisible(false);
    setUserInput('');
    setAttachedImages([]);
    setAttachedFiles([]);
    setIsLoading(false);
    setCurrentSessionIndex(0);
    setErrorMsg('');
    setFocusInput(true);
    setEditingMessage(null);
    setTextEnableReasoning(false);
    setGeneralAiAgentEnabled(false);
    setGeneralWebsearchEnabled(false);
    setGeneralDeepResearchEnabled(false);
    setChartLoadingState(null);
    setChartError(null);

    setChatContent([
      {
        id: 0,
        //local_session_id: uuidv4(), // ?? implement?
        session_id: "", // this is to track session in DB (canonical snake_case)
        ai_character_name: "assistant",
        original_ai_character: "",
        ai_text_gen_model: "",
        auto_trigger_tts: false,
        messages: [] // Each session starts with an empty array of messages
      }
    ]);

  }

  const handleSendClick = useCallback(() => {
    setErrorMsg('');
    const modelName = getTextModelName();
    if (userInput.trim() === '') {
      setErrorMsg("Please provide your input");
      return;
    }

    if (modelName === 'deepseek-reason' || modelName === 'o3-mini' || modelName === 'LLama 3.3 70b') {
      if (attachedImages.length > 0) {
        setErrorMsg("Currently chosen model does not support images. Remove image or change the model");
        return;
      } else if (attachedFiles.length > 0) {
        setErrorMsg("In order to process attached files you need to change the model");
        return;
      }
    }

    // snapshot copy of chatContentRef.current;
    const chatContentSnapshot = [...chatContent];
    console.log("Main chatContentSnapshot: ", chatContentSnapshot);

    if (editingMessage !== null) {
      callChatAPI({
        chatContentSnapshot,
        editMessagePosition: editingMessage
      });
    } else {
      callChatAPI({
        chatContentSnapshot
      });
    }
    setUserInput("");
    setAttachedImages([]);
    setAttachedFiles([]);
    setFocusInput(true);
    setEditingMessage(null);
  }, [chatContent, attachedImages, attachedFiles, userInput, editingMessage, callChatAPI, setAttachedFiles, setAttachedImages, setErrorMsg, setUserInput, setFocusInput, setEditingMessage]
  );

  // we monitor if handleRegenerate in ChatMessage was used
  useEffect(() => {
    if (readyForRegenerate) {
      handleSendClick();
      setReadyForRegenerate(false);
    }
  }, [readyForRegenerate, handleSendClick, setReadyForRegenerate]);

  return (
    <div className="layout">
      <TopMenu
        onNewChatClicked={handleOnNewChatClicked}
        toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
        mode="normal"
      />
      <div className={`main-content ${isSidebarVisible ? 'sidebar-visible' : ''}`}>
        <Sidebar
          onSelectSession={handleSelectSession}
          toggleSidebar={() => setIsSidebarVisible(false)}
        />
        <div className="chat-area">
          <ChatWindow />
          {progressBarMessage && <ProgressIndicator message={progressBarMessage} />}
          {errorMsg && <div className="bot-error-msg">{errorMsg}</div>}
          <BottomToolsMenu
            handleSendClick={handleSendClick}
            mode="normal"
            mScrollToBottom={mScrollToBottom}
          />
        </div>
      </div>
    </div>
  );
};

export default Main;
