// StateContextProvider.js

import { createContext, useState, useEffect, useRef, useCallback } from "react";
//import { v4 as uuidv4 } from 'uuid';

export const StateContext = createContext();

export const StateContextProvider = ({ children }) => {
  const [chatContent, setChatContent] = useState([
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
  // ref -> to update in ChatWindow and use in call.chat.api
  const chatContentRef = useRef(chatContent);
  // optional assetInput - used for example in Health - it is separated from chatContent - because we don't necessarily want it to be displayed for user in chat messages (it's long etc)
  const [assetInput, setAssetInput] = useState([]);
  // this is index of sessions on top menu (in circle buttons) - to identify which button is currently active etc
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  // this is to avoid fetchChatContent on changing of currentSessionIndex (when switching top menu sessions) - IMPORTANT! 
  // and also for scrollToBottom function (to be sure that we're scrolling if we are generating data from APIs in active session only)
  const currentSessionIndexRef = useRef(currentSessionIndex);
  // it will be set to false in most cases (by default so when user just provides URL, or when we click on Sidebar and we want session to be fetched) 
  // but sometimes will be set to true (for example in TopMenu when clicking between sessions) - because then we just want to navigate to URL but don't want sessions to be fetched (because they are already there)
  const [shouldSkipSessionFetching, setShouldSkipSessionFetching] = useState(false);
  // when new session is created or when we just want to refresh session list in Sidebar (for example in call api - when new session is create)
  const [sidebarResetTrigger, setSidebarResetTrigger] = useState(false);
  // this will be used to trigger auo rename session in prod (only after first message) - set in call.chat.api, monitored and executed in Sidebar
  const [triggerSessionAutoRename, setTriggerSessionAutoRename] = useState("");
  // show window with characters
  const [showCharacterSelection, setShowCharacterSelection] = useState(true);
  // this will be used to focus (make active) userInput text area from BottomToolsMenu - so i don't need to click on it to start typing
  const [focusInput, setFocusInput] = useState(false);
  // this is when we click regenerate in ChatMessage - we have to use useEffect here - because other way async data is not set before sending to API
  const [readyForRegenerate, setReadyForRegenerate] = useState(false);
  // progress bar handling
  const [progressBarMessage, setProgressBarMessage] = useState('');
  // user input (text + images) from bottom menu
  const [userInput, setUserInput] = useState('');
  // used for editing messages
  const [editingMessage, setEditingMessage] = useState(null);
  const [attachedImages, setAttachedImages] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  // (from ChatWindow) this is used for scrollToBottom
  const endOfMessagesRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // to control UI depending if its mobile or not
  const [isMobile, setIsMobile] = useState(false);
  // used in Sidebar - search text is what we put into search text input in sidebar
  // it is also reset when new chat is clicked
  const [sidebarSearchText, setSidebarSearchText] = useState('');
  // this is to control visibility of dropdown menu in Top Menu
  const [isTopMenuDropdownVisible, setTopMenuDropdownVisible] = useState(false);
  // if checkbox for permanent character change is set
  const [isPermanentCharacterChangeSet, setIsPermanentCharacterChangeSet] = useState(false);
  // sometimes we don't want to show checkbox for permanent character change (for example on startup window)
  const [isPermanentCharacterChangeCheckboxVisible, setIsPermanentCharacterChangeCheckboxVisible] = useState(false);
  // this is to handle new session from here - when we click on message and create new session from here
  // thing is that when submitting the message after new session is created - we save in db only those new messages - so we lose whole previous session
  // so this flag is supposed to handle this case - if it's set to true - when sending new API call we will:
  // set flag so in backend saving in db will be different (not only single message but all chat history)
  // and then we reset flag after API call is completed
  const [isNewSessionFromHere, setIsNewSessionFromHere] = useState(false);
  // bottom tools height - to put scroll down button just over it
  const [bottomToolsHeight, setBottomToolsHeight] = useState(40);
  // this is to control if automated scrolling is enabled or not (if we are at the bottom of the screen we want automated scrolling, if user scrolls up - we don't)
  // useRef - because useState - did not work (as scrollToBottom is memoized or when passed to hook - it was only taking initial value)
  // scrolling controlled within ChatWindow
  const isAtBottomRef = useRef(true);

  /* HEALTH SECTION DEDICATED */
  // next 3 are used in BottomMenu - but only if it's floating window (Health data)
  // State for health options visibility (to show additional health data options)
  const [showHealthOptions, setShowHealthOptions] = useState(false);
  // State for the include all the Health data switch
  const [includeHealthData, setIncludeHealthData] = useState(true);
  // State for the include correlation data switch
  const [includeCorrelationData, setIncludeCorrelationData] = useState(false);
  // this is data from garmin - used mostly to show graphs (and attach to AI questions)
  const [healthData, setHealthData] = useState(null);
  // based on above data - we calculate correlations and store here
  const [correlationData, setCorrelationData] = useState(null);
  // if high number - it means that correlation (even if high) is not significant. A low p-value (< 0.05) indicates that the correlation is statistically significant and likely reflects a true relationship, while a high p-value suggests the correlation may be due to random variation.
  // if there is (rare hopefully) case that p-valu is high and correlation is high - it means that data is not perfect (either not enough or there are outliers or high variability)
  const [pValuesData, setPValuesData] = useState(null);
  // min correlation threshold to display
  const [correlationThreshold, setCorrelationThreshold] = useState(0.25);
  // p value threshold to display
  const [pValueThreshold, setPValueThreshold] = useState(0.15);
  /* END OF HEALTH SECTION DEDICATED */

  // chart rendering state
  const [chartLoadingState, setChartLoadingState] = useState(null);
  const [chartError, setChartError] = useState(null);

  // this is showProgress, hideProgress merged in one place
  // accepting method - "show" and "hide"
  // and then adding or removing specific text
  const manageProgressText = (method, text) => {
    if (method === 'show') {
      setProgressBarMessage((prevMessage) => prevMessage ? `${prevMessage} ${text}` : text);
    } else if (method === 'hide') {
      setProgressBarMessage((prevMessage) => {
        const messages = prevMessage.split(' ');
        const filteredMessages = messages.filter((msg) => msg !== text);
        return filteredMessages.join(' ');
      });
    }
  }

  // to check if its last message
  // for AI response is simple - because its just last message in chat content
  // but for user request - we need to check little bit more
  // used in ChatWindow and FloatingChat
  const isLastMessage = (index, message) => {
    if (!message) return false;
    const currentChatContent = chatContent[currentSessionIndex].messages;

    if (message.isUserMessage) {
      // Check if the next message exists and is an AI response
      return (index === currentChatContent.length - 1) ||
        (index === currentChatContent.length - 2 && !currentChatContent[index + 1].isUserMessage);
    } else {
      // For AI messages, the original logic works
      return index === currentChatContent.length - 1;
    }
  };

  const scrollToBottom = (whichChat, smooth = true) => {
    // only scroll if we are at the bottom of the screen. if we scroll up - we don't scroll down automatically
    // or when smooth = false (it means that we restore session via chat window)
    if (isAtBottomRef.current || smooth === false) {
      if (whichChat === currentSessionIndexRef.current && endOfMessagesRef.current) {
        endOfMessagesRef.current.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    }
  };
  // a memoized version of scroll to bottom (not to trigger re-renders)
  const mScrollToBottom = useCallback((whichChat, smooth = true) => {
    scrollToBottom(whichChat, smooth);
  }, []);

  useEffect(() => {
    // check if mobile - to arrange UI
    if (window.innerWidth <= 768) {
      setIsMobile(true);
    }
  }, []);

  const [currentSessionAICharacter, setCurrentSessionAICharacter] = useState('assistant');

  useEffect(() => {
    setCurrentSessionAICharacter(chatContent[currentSessionIndex].ai_character_name);
  }, [chatContent, currentSessionIndex]);

  return (
    <StateContext.Provider value={{
      chatContent, setChatContent, chatContentRef,
      assetInput, setAssetInput,
      currentSessionIndex, setCurrentSessionIndex,
      shouldSkipSessionFetching, setShouldSkipSessionFetching,
      sidebarResetTrigger, setSidebarResetTrigger,
      triggerSessionAutoRename, setTriggerSessionAutoRename,
      showCharacterSelection, setShowCharacterSelection,
      focusInput, setFocusInput,
      readyForRegenerate, setReadyForRegenerate,
      progressBarMessage, setProgressBarMessage,
      userInput, setUserInput,
      editingMessage, setEditingMessage,
      attachedImages, setAttachedImages,
      attachedFiles, setAttachedFiles,
      endOfMessagesRef, currentSessionIndexRef,
      isLoading, setIsLoading,
      errorMsg, setErrorMsg,
      isMobile, isLastMessage,
      sidebarSearchText, setSidebarSearchText,
      isTopMenuDropdownVisible, setTopMenuDropdownVisible,
      isPermanentCharacterChangeSet, setIsPermanentCharacterChangeSet,
      isPermanentCharacterChangeCheckboxVisible, setIsPermanentCharacterChangeCheckboxVisible,
      isNewSessionFromHere, setIsNewSessionFromHere,
      bottomToolsHeight, setBottomToolsHeight,
      isAtBottomRef,
      showHealthOptions, setShowHealthOptions,
      includeHealthData, setIncludeHealthData,
      includeCorrelationData, setIncludeCorrelationData,
      healthData, setHealthData,
      correlationData, setCorrelationData,
      pValuesData, setPValuesData,
      correlationThreshold, setCorrelationThreshold,
      pValueThreshold, setPValueThreshold,
      manageProgressText, mScrollToBottom,
      currentSessionAICharacter,
      chartLoadingState, setChartLoadingState,
      chartError, setChartError
    }}>
      {children}
    </StateContext.Provider>
  );
};
