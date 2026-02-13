// ChatWindow.js

import React, { useEffect, useState, useRef, useContext } from 'react';

import { StateContext } from './StateContextProvider';

import ChatMessage from './ChatMessage';
import ChatCharacters from './ChatCharacters';
import ChartLoadingIndicator from './ChartLoadingIndicator';
import ChartErrorDisplay from './ChartErrorDisplay';

import { useCurrentSessionId } from '../hooks/useCurrentSession';
import { useFetchChatContent } from '../hooks/useFetchChatContent';
import useSherlockProactiveConnection from '../hooks/useSherlockProactiveConnection';

import config from '../config';
import './css/ChatWindow.css';

import { getSvgIcon } from '../utils/svg.icons.provider';

const ChatWindow = () => {

  // if i right click on any message (to show context window) - we need to reset previous context window 
  // if i clicked 2 time on 2 diff messages - two diff context menu were shown
  const [contextMenuIndex, setContextMenuIndex] = useState(null);
  // chat content loaded - so we can scroll to bottom (and we need to separate it to make sure that scroll is executed AFTER chat content is loaded)
  const [contentLoaded, setContentLoaded] = useState(false);
  // show scroll button (bottom, down corner) - to scroll to very bottom of the screen
  const [showScrollButton, setShowScrollButton] = useState(false);
  // here we need to useRef it - because otherwise - we would have neverending re-render (because of async)
  const contentLoadedRef = useRef(contentLoaded);

  const {
    chatContent, setChatContent, chatContentRef,
    shouldSkipSessionFetching, currentSessionIndex, currentSessionIndexRef,
    endOfMessagesRef, bottomToolsHeight,
    showCharacterSelection, setShowCharacterSelection,
    isAtBottomRef, mScrollToBottom, setFocusInput,
    isLastMessage,
    chartLoadingState, chartError, setChartError
  } = useContext(StateContext);

  const normalizedChartError = chartError
    ? (typeof chartError === 'object' ? chartError : { error: chartError })
    : null;

  const currentSessionId = useCurrentSessionId();
  const fetchChatContent = useFetchChatContent();
  useSherlockProactiveConnection();

  // Collect all images from the current session if the AI character is 'iris'
  const allSessionImages = chatContent[currentSessionIndex]?.ai_character_name === 'iris'
    ? chatContent[currentSessionIndex].messages.flatMap(message => message.image_locations || [])
    : [];

  // we need to keep track of content loaded - to avoid re-renders in fetch content
  useEffect(() => {
    contentLoadedRef.current = contentLoaded;
  }, [contentLoaded]);

  useEffect(() => {
    const handleFetchContent = async () => {
      if (config.VERBOSE_SUPERB === 1) {
        console.log("123 useEffect handleFetchContent. for currentSessionId: ", currentSessionId);
      }

      if (currentSessionId && !contentLoadedRef.current) {
        await fetchChatContent(currentSessionId, currentSessionIndexRef.current);
        setContentLoaded(true);
      }
    };

    // there is a case where this will be true - and then we don't need to fetch session (for example when switching between sessions in top menu)
    if (shouldSkipSessionFetching === false)
      handleFetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, contentLoadedRef, currentSessionIndexRef, shouldSkipSessionFetching]);  //, fetchChatContent]);
  // above on purpose i removed fetchChatContent - as it was causing unnecessary re-render

  // once chat content loaded - we can scroll to bottom finally
  useEffect(() => {
    if (contentLoaded) {
      // slight delay to make sure that content is loaded
      setTimeout(() => {
        mScrollToBottom(currentSessionIndexRef.current, false);
      }, 500);

      setContentLoaded(false); // Reset for future loads
    }
  }, [contentLoaded, currentSessionIndexRef, mScrollToBottom]);

  // we control if user scrolls or not
  // idea is that if we are at the bottom - automated scrolling works, but if user scrolls up - we stop automated scrolling
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages');

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isBottom = scrollTop + clientHeight >= scrollHeight - 120; // threshold from bottom
      isAtBottomRef.current = isBottom;
      setShowScrollButton(!isBottom);
    };

    messagesContainer.addEventListener('scroll', handleScroll);

    return () => {
      messagesContainer.removeEventListener('scroll', handleScroll);
    };
  }, [isAtBottomRef]);

  const scrollToBottom = () => {
    mScrollToBottom(currentSessionIndexRef.current, false);
  };

  const handleCharacterSelect = (character) => {
    setShowCharacterSelection(false);
    setChatContent((prevChatContent) => {
      const updatedChatContent = [...prevChatContent];
      updatedChatContent[currentSessionIndexRef.current].ai_character_name = character.nameForAPI
      return updatedChatContent;
    });
    setFocusInput(true);
  };

  // Debugging only in super verbose mode
  useEffect(() => {
    //debugger; // this is useful for debugging via chrome!
    if (config.VERBOSE_SUPERB === 1) {
      // json stringify is used to get value of chatContent at the moment of logging (in chrome)- it creates deep copy
      // and then json parse so they are better readable
      console.log("useEffect general chat content: ", JSON.parse(JSON.stringify(chatContent)));
    }

    chatContentRef.current = chatContent;
  }, [chatContent, chatContentRef]);

  return (
    <div className="chat-window">
      {showCharacterSelection ? (
        <ChatCharacters onSelect={handleCharacterSelect} />
      ) : null}
      <div className="messages">
        {chatContent[currentSessionIndex] && chatContent[currentSessionIndex].messages ? (
          chatContent[currentSessionIndex].messages.map((message, index) => (
            <ChatMessage
              key={message.message_id || index}
              index={index}
              message={message}
              isLastMessage={isLastMessage(index, message)}
              contextMenuIndex={contextMenuIndex}
              setContextMenuIndex={setContextMenuIndex}
              allSessionImages={allSessionImages}
            />
          ))
        ) : null}
        {chartLoadingState && (
          <ChartLoadingIndicator
            chartType={chartLoadingState.chart_type}
            title={chartLoadingState.title}
          />
        )}
        {normalizedChartError && (
          <ChartErrorDisplay
            error={normalizedChartError.error || normalizedChartError.message}
            chartType={normalizedChartError.chart_type}
            title={normalizedChartError.title}
            onDismiss={() => setChartError(null)}
          />
        )}
        {showScrollButton && (
          <button className="scroll-to-bottom" onClick={scrollToBottom} style={{ bottom: `calc(80px + ${bottomToolsHeight}px)` }}>
            {getSvgIcon('doubleArrowDown')}
          </button>
        )}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};

export default ChatWindow;
