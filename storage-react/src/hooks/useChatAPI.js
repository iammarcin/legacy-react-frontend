// hooks/useChatAPI.js

import { useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { StateContext } from '../components/StateContextProvider';

import CallChatAPI from '../services/call.chat.api';
import { getTextModelName } from '../utils/configuration';
import { useSettings } from './useSettings';


// generate text API call (and potentially image)
// if editMessagePosition is not null - it means it is edited message
const useChatAPI = () => {
  const navigate = useNavigate();
  const {
    setChatContent, assetInput, attachedImages, attachedFiles, currentSessionIndexRef,
    userInput, setFocusInput, setTriggerSessionAutoRename, setIsLoading, setErrorMsg,
    isNewSessionFromHere, setIsNewSessionFromHere,
    setShowCharacterSelection, manageProgressText, mScrollToBottom,
    setChartLoadingState, setChartError, setShouldSkipSessionFetching
  } = useContext(StateContext);

  const getSettings = useSettings();

  const callChatAPI = useCallback(async ({ chatContentSnapshot, editMessagePosition = null, isHealthMode = false }) => {
    setShowCharacterSelection(false);
    setErrorMsg('');

    try {
      const sessionIdForAPI = chatContentSnapshot[currentSessionIndexRef.current].session_id;
      const sessionIndexForAPI = currentSessionIndexRef.current;
      const apiAIModelName = getTextModelName();

      await CallChatAPI({
        userInput, assetInput, editMessagePosition, attachedImages, attachedFiles,
        sessionIndexForAPI, sessionIdForAPI, chatContentSnapshot,
        isNewSessionFromHere, setIsNewSessionFromHere, setChatContent,
        apiAIModelName, isHealthMode, setFocusInput, setTriggerSessionAutoRename, setIsLoading,
        setErrorMsg, manageProgressText, mScrollToBottom, getSettings, navigate,
        setChartLoadingState, setChartError, setShouldSkipSessionFetching
      });
    } catch (error) {
      setErrorMsg(error.message);
    }
  }, [userInput, assetInput, attachedFiles, attachedImages, currentSessionIndexRef, manageProgressText, mScrollToBottom, setChatContent, setErrorMsg, setFocusInput, setIsLoading, setTriggerSessionAutoRename, setShowCharacterSelection, getSettings, navigate, isNewSessionFromHere, setIsNewSessionFromHere, setChartLoadingState, setChartError, setShouldSkipSessionFetching]);

  return { callChatAPI };
};

export default useChatAPI;
