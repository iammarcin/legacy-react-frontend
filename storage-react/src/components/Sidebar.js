// Sidebar.js

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';

import { StateContext } from './StateContextProvider';
import SidebarSessionItem from './SidebarSessionItem';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import './css/Sidebar.css';

import { useCurrentSessionId } from '../hooks/useCurrentSession';
import { useSettings } from '../hooks/useSettings';
import { useFetchChatSessions } from '../hooks/useFetchChatSessions';
import { getSvgIcon } from '../utils/svg.icons.provider';

import { triggerAPIRequest, extractResponseData, generateSessionName } from '../services/api.methods';
import useDebounce from '../hooks/useDebounce';

import {
  getIsProdMode,
  setTextEnableReasoning, setGeneralAiAgentEnabled,
  setGeneralWebsearchEnabled, setGeneralDeepResearchEnabled,
} from '../utils/configuration';

import config from '../config';

const Sidebar = ({ onSelectSession, toggleSidebar }) => {
  const {
    sidebarResetTrigger, setSidebarResetTrigger,
    triggerSessionAutoRename, setTriggerSessionAutoRename,
    sidebarSearchText, setSidebarSearchText, isMobile,
  } = useContext(StateContext);

  const [chatSessions, setChatSessions] = useState([]);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);
  // it's all very complex :( - but we needed to use a lot of useRef to avoid re-renders... it was nightmare!
  // if fetching is progress - another one will not be triggered
  const isFetchingRef = useRef(false);
  // if initial fetch is done - we don't want to fetch it again (only if we want - like when scrolling down)
  const initialFetchDoneRef = useRef(false);
  // search text (search bar) as ref
  const searchTermRef = useRef('');
  // to allow us to load more sessions when scrolling down
  const isLoadingMoreRef = useRef(false);
  // list of session ids - to find unique ones
  const fetchedSessionIds = useRef(new Set());
  // as we can type in search bar - and each keystroke can trigger API call - we put it as debounce not to trigger to many calls at the same time
  const debouncedSearchText = useDebounce(sidebarSearchText, 300);
  const observer = useRef();
  const [contextMenu, setContextMenu] = useState(null);
  const [renamePopup, setRenamePopup] = useState(null);
  const renameInputRef = useRef(null);
  // tags for sessions in DB
  // utils/svg.icons.provider.js
  const availableTags = [
    { id: 'codeCompleted', icon: 'codeCompleted' },
    { id: 'fridayWalk', icon: 'fridayWalk' },
    { id: 'important', icon: 'important' },
    { id: 'toRead', icon: 'toRead' },
    { id: 'favorite', icon: 'favorite' },
  ];

  // for additional search options
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchDateRange, setSearchDateRange] = useState([null, null]);
  const [searchStartDate, searchEndDate] = searchDateRange;
  const [searchSelectedTags, setSearchSelectedTags] = useState([]);
  // due to async react - we will set this flag and this will trigger search
  const [searchQueryReady, setSearchQueryReady] = useState(false);

  const getSettings = useSettings();

  const currentSessionId = useCurrentSessionId();
  const fetchChatSessions = useFetchChatSessions();

  // callback executing fetchChatSessions hook - to get list of sessions from DB
  const handleFetchSessions = useCallback(async (newOffset, searchText, isInitialFetch = false, searchStartDate = null, searchEndDate = null, searchSelectedTags = []) => {
    if (isFetchingRef.current) return;
    if (config.VERBOSE_SUPERB === 1)
      console.log("234 handleFetchSessions triggered with limit, offset, searchText, isInitialFetch: ", limit, newOffset, searchText, isInitialFetch);

    isFetchingRef.current = true;
    const sessions = await fetchChatSessions(newOffset, limit, searchText, searchStartDate, searchEndDate, searchSelectedTags);
    console.log("234 sessions: ", sessions);
    const uniqueSessions = sessions.filter(
      session => !fetchedSessionIds.current.has(session.session_id)
    );
    uniqueSessions.forEach(session => fetchedSessionIds.current.add(session.session_id));
    setChatSessions(prevSessions => (isInitialFetch ? uniqueSessions : [...prevSessions, ...uniqueSessions]));

    // Check if we received fewer sessions than the limit, indicating no more sessions are available
    if (sessions.length < limit) {
      setHasMoreSessions(false);
    } else {
      setHasMoreSessions(true);
    }

    setTextEnableReasoning(false);
    setGeneralAiAgentEnabled(false);
    setGeneralWebsearchEnabled(false);
    setGeneralDeepResearchEnabled(false);

    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
    }
    isFetchingRef.current = false;
    isLoadingMoreRef.current = false;
  }, [fetchChatSessions, limit]);

  // making sure that we fetch the list of sessions properly (only once)
  useEffect(() => {
    if (!initialFetchDoneRef.current || debouncedSearchText !== searchTermRef.current) {
      if (config.VERBOSE_SUPERB === 1)
        console.log("234 fetching list of sessions via useEffect");
      handleFetchSessions(0, debouncedSearchText, true);
      initialFetchDoneRef.current = true;
    }
  }, [handleFetchSessions, debouncedSearchText]);

  // this will be executed via listener here - when setSidebarResetTrigger is set to true (for example when new chat is clicked)
  // if there is any search executed - this will reset everything and sessions will be fetached
  const resetSidebarState = useCallback(() => {
    setSidebarSearchText('');
    searchTermRef.current = '';
    setOffset(0);
    fetchedSessionIds.current.clear();
    setChatSessions([]);
    setHasMoreSessions(true);
    initialFetchDoneRef.current = false;
    isLoadingMoreRef.current = false;
    setIsSearchMode(false);
  }, [setSidebarSearchText]);

  // listener to above - first we reset everything regarding search for new sessions and then we get inital list again
  // also if sidebarResetTrigger is set in initial few messages (via call.chat.api hook) - we want to refresh list of sessions (so new one appears)
  useEffect(() => {
    if (sidebarResetTrigger) {
      resetSidebarState();
      handleFetchSessions(0, '', true);
      setSidebarResetTrigger(false);
    }
  }, [sidebarResetTrigger, resetSidebarState, setSidebarResetTrigger, handleFetchSessions])

  // load more sessions when user scrolls down
  const loadMoreSessions = useCallback(() => {
    if (!isFetchingRef.current && !isLoadingMoreRef.current && hasMoreSessions) {
      if (config.VERBOSE_SUPERB === 1)
        console.log("234 loadMoreSessions triggered with offset and limit: ", offset, limit);
      isLoadingMoreRef.current = true;
      console.log("234 fetchedSessionIds: ", fetchedSessionIds.current);
      const newOffset = offset + limit;
      setOffset(newOffset);
      handleFetchSessions(newOffset, debouncedSearchText, false, searchStartDate, searchEndDate, searchSelectedTags);
    }
  }, [offset, limit, hasMoreSessions, searchStartDate, searchEndDate, searchSelectedTags, handleFetchSessions, debouncedSearchText]);

  // when search bar is used - this is triggered
  const handleSearch = useCallback((term) => {
    setSidebarSearchText(term);
    searchTermRef.current = term;
    setIsSearchMode(term !== '');
    setOffset(0);
    fetchedSessionIds.current.clear();
    setChatSessions([]);
    setHasMoreSessions(true);
    initialFetchDoneRef.current = false;
  }, [setSidebarSearchText]);

  // if we remove all text from search bar - also reset 
  useEffect(() => {
    if (sidebarSearchText === '') {
      setSidebarResetTrigger(true)
    }
  }, [sidebarSearchText, setSidebarResetTrigger]);

  // observer watching if user scrolls down till end of the sidebar with list of chats
  // if it goes down - new sessions are loaded
  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    if (!isSearchMode && hasMoreSessions) {
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoadingMoreRef.current) {
          loadMoreSessions();
        }
      });

      const loadMoreElement = document.querySelector('.load-more');
      if (loadMoreElement) {
        observer.current.observe(loadMoreElement);
      }
    }

    return () => observer.current && observer.current.disconnect();
  }, [loadMoreSessions, isSearchMode, hasMoreSessions]);


  // put focus on input so user can start typing
  useEffect(() => {
    if (renamePopup) {
      renameInputRef.current.focus();
    }
  }, [renamePopup]);

  // show context menu when right click is detected
  const handleRightClick = (event, session) => {
    event.preventDefault();
    setContextMenu({
      x: event.pageX,
      y: event.pageY,
      session
    });
  };

  const handleRename = () => {
    setRenamePopup({
      session: contextMenu.session,
      name: contextMenu.session.session_name
    });
    setContextMenu(null);
  };

  // this one is for adding / removing tags from each session
  const handleTagToggle = async (sessionId, tag) => {
    const session = chatSessions.find(s => s.session_id === sessionId);
    if (!session) return;

    const newTags = session.tags ? [...session.tags] : [];
    const tagIndex = newTags.indexOf(tag);

    if (tagIndex > -1) {
      newTags.splice(tagIndex, 1);
    } else {
      newTags.push(tag);
    }

    try {
      const userInput = {
        "session_id": sessionId,
        "tags": newTags,
        "update_last_mod_time_in_db": false
      };
      await triggerAPIRequest("api/db", "provider.db", "db_update_session", userInput, getSettings);

      setChatSessions(prevSessions => prevSessions.map(s =>
        s.session_id === sessionId ? { ...s, tags: newTags } : s
      ));
    } catch (error) {
      console.error('Failed to update session tags', error);
    }
  };

  const handleRemove = async () => {
    try {
      const sessionId = contextMenu.session.session_id;
      const userInput = { "session_id": sessionId };
      await triggerAPIRequest("api/db", "provider.db", "db_remove_session", userInput, getSettings);
      setChatSessions(prevSessions => prevSessions.filter(session => session.session_id !== sessionId));
    } catch (error) {
      console.error('Failed to remove session', error);
    }
    setContextMenu(null);
  };

  const handleRenameChange = (event) => {
    setRenamePopup({
      ...renamePopup,
      name: event.target.value
    });
  };

  const handleRenameSubmit = useCallback(async (sessionId = null, newSessionName = null) => {
    const currentSessionId = sessionId || renamePopup?.session?.session_id;  // Use passed sessionId or fallback to renamePopup
    const currentNewName = newSessionName || renamePopup?.name;  // Use passed newSessionName or fallback to renamePopup

    // If neither sessionId nor renamePopup exists, we can't proceed
    if (!currentSessionId || !currentNewName) {
      console.error('No session ID or new session name available for renaming.');
      return;
    }
    const triggerDBRename = async () => {
      try {
        const currentSessionId = sessionId || renamePopup.session.session_id;
        const currentNewName = newSessionName || renamePopup.name;

        const userInput = {
          "session_id": currentSessionId,
          "new_session_name": currentNewName,
          "update_last_mod_time_in_db": false
        };

        await triggerAPIRequest("api/db", "provider.db", "db_update_session", userInput, getSettings);

        setChatSessions(prevSessions => prevSessions.map(session =>
          session.session_id === currentSessionId ? { ...session, session_name: currentNewName } : session
        ));
      } catch (error) {
        console.error('Failed to rename session', error);
      }
    }
    triggerDBRename();
    setRenamePopup(null);
  }, [getSettings, renamePopup]);

  const handleAutoRename = useCallback(async (sessionId) => {
    setContextMenu(null);
    try {
      if (!sessionId || sessionId === "") {
        return;
      }

      const response = await generateSessionName(sessionId, getSettings);
      if (response.success) {
        const data = response.data;
        const newSessionName = data?.session_name || data?.sessionName || extractResponseData(response);

        if (newSessionName && newSessionName.trim() !== "") {
          handleRenameSubmit(sessionId, newSessionName);
        }
      } else {
        console.error('Failed to auto-rename session:', response.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to auto-rename session:', error);
    }
  }, [getSettings, handleRenameSubmit]);

  const handleRenameCancel = () => {
    setRenamePopup(null);
  };

  // when any session chosen we trigger handleSelectSession from Main
  const handleSelectSession = (session) => {
    setContextMenu(null);
    onSelectSession(session);
    if (isMobile)
      toggleSidebar();
  };

  // for pressing Enter or Escape we want to submit or cancel renaming
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleRenameSubmit();
    } else if (event.key === 'Escape') {
      handleRenameCancel();
    }
  };

  /* SEARCH DROPDOWN SECTION */
  // to show/ hide search dropdown
  const toggleSearchDropdown = () => setShowSearchDropdown(!showSearchDropdown);

  // when tag is clicked - we want to add or remove it from search
  const handleSearchTagToggle = (tagId) => {
    setSearchSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(tag => tag !== tagId) : [...prev, tagId]
    );
    setSearchQueryReady(true);
  };

  // when date is chosen - we want to set it as search date
  const handleSearchDateChange = (update) => {
    setSearchDateRange(update);
    if (update[0] && update[1]) {
      setSearchQueryReady(true);
    }
  };

  // and this is executed when anything from above is changed
  const handleSearchFilterChange = useCallback(() => {
    resetSidebarState();
    handleFetchSessions(0, sidebarSearchText, true, searchStartDate, searchEndDate, searchSelectedTags);
  }, [resetSidebarState, handleFetchSessions, sidebarSearchText, searchStartDate, searchEndDate, searchSelectedTags]);

  // when reset button is clicked - we want to reset all search filters
  const handleSearchReset = () => {
    setSearchDateRange([null, null]);
    setSearchSelectedTags([]);
    setSearchQueryReady(true);
    setShowSearchDropdown(false);
  }

  // used to monitor triggerSessionAutoRename from call.chat.api - when first message is triggered
  // idea is that auto rename of current session will be triggered - and just after that we refresh the list of sessions
  useEffect(() => {
    if (triggerSessionAutoRename !== "") {
      if (getIsProdMode()) {
        handleAutoRename(triggerSessionAutoRename);
      }

      setTriggerSessionAutoRename("");

      setTimeout(() => {
        setSidebarResetTrigger(true);
      }, 1000); // 1-second delay - so we are sure that DB from auto rename is updated

    }
  }, [triggerSessionAutoRename, handleAutoRename, setSidebarResetTrigger, setTriggerSessionAutoRename]);

  // we monitor searchQueryReady - if it's set to true - we trigger search
  useEffect(() => {
    if (searchQueryReady) {
      handleSearchFilterChange();
      setSearchQueryReady(false);
    }
  }, [searchQueryReady, handleSearchFilterChange]);
  /* END OF SEARCH DROPDOWN SECTION */

  return (
    <div className="sidebar">
      <div className="search-container">
        <input
          type="text"
          value={sidebarSearchText}
          className="search-bar"
          placeholder="Search sessions..."
          onChange={(e) => handleSearch(e.target.value)}
        />
        <div className="search-dropdown-icon" onClick={toggleSearchDropdown}>
          {showSearchDropdown ? getSvgIcon('keyboardArrowUp') : getSvgIcon('keyboardArrowDown')}
        </div>
      </div>
      {showSearchDropdown && (
        <div className="search-dropdown-menu">
          <div className="search-date-picker-container">
            <DatePicker
              selectsRange={true}
              startDate={searchStartDate}
              endDate={searchEndDate}
              placeholderText="Choose your dates"
              onChange={handleSearchDateChange}
              dateFormat="yyyy-MM-dd"
              className="custom-search-datepicker"
            />
          </div>
          <div className="search-tag-icons">
            {availableTags.map(({ id, icon }) => (
              <div
                key={id}
                className={`search-tag-icon ${searchSelectedTags.includes(id) ? 'selected' : ''}`}
                onClick={() => handleSearchTagToggle(id)}
              >
                {getSvgIcon(icon)}
              </div>
            ))}
          </div>
          <button className="search-dropdown-menu-button" onClick={handleSearchReset}>Reset Filters</button>
        </div>
      )}
      <ul>
        {chatSessions.map((session) => (
          <li key={session.session_id} className={currentSessionId === session.session_id ? 'selected' : ''}
          >
            <SidebarSessionItem
              session={session}
              availableTags={availableTags}
              onSelect={handleSelectSession}
              onContextMenu={handleRightClick}
              onTagToggle={handleTagToggle}
            />
          </li>
        ))}
        <div className="load-more"></div>
      </ul>
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="context-menu-item" onClick={handleRename}>Rename</div>
          <div className="context-menu-item" onClick={() => handleAutoRename(contextMenu.session.session_id)}>
            Auto rename
          </div>
          <div className="context-menu-item" onClick={handleRemove}>Remove</div>
        </div>
      )}
      <div className="sidebar-popups">
        {renamePopup && (
          <div className="rename-popup">
            <div className="rename-popup-content">
              <h3>Rename Session</h3>
              <input
                type="text"
                value={renamePopup.name}
                onChange={handleRenameChange}
                onKeyDown={handleKeyDown}
                ref={renameInputRef}
              />
              <div className="button-group">
                <button onClick={handleRenameSubmit}>Submit</button>
                <button onClick={handleRenameCancel}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
