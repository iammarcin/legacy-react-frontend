// hooks/useFetchChatSessions.js
import { useCallback, useContext } from 'react';
import { StateContext } from '../components/StateContextProvider';
import { useSettings } from './useSettings';
import { triggerAPIRequest, extractResponseData } from '../services/api.methods';

import { formatDate } from '../utils/misc';

import config from '../config';

export const useFetchChatSessions = () => {
  const { setErrorMsg, setSidebarResetTrigger, currentSessionAICharacter } = useContext(StateContext);
  const getSettings = useSettings(currentSessionAICharacter);

  return useCallback(async (offset, limit, searchText = '', startDate = null, endDate = null, tags = []) => {
    if (config.VERBOSE_SUPERB === 1)
      console.log("123 useFetchChatSessions hook useCallback with offset: ", offset);
    try {
      const trimmedSearch = (searchText || '').trim();

      const listInput = {
        limit,
        offset,
        include_messages: false,
      };

      if (startDate && endDate) {
        listInput.start_date = formatDate(startDate, 'ymd');
        if (endDate) {
          // Increment endDate by one day - to include the selected date (SQL stuff - in backend i finally did if < end_date)
          const incrementedEndDate = new Date(endDate);
          incrementedEndDate.setDate(incrementedEndDate.getDate() + 1);
          listInput.end_date = formatDate(incrementedEndDate, 'ymd');
        }
      }
      if (tags.length > 0) {
        listInput.tags = tags;
      }

      const action = trimmedSearch ? "db_search_messages" : "db_all_sessions_for_user";
      const userInput =
        action === "db_search_messages"
          ? { limit, search_text: trimmedSearch }
          : listInput;

      const response = await triggerAPIRequest(
        "api/db",
        "provider.db",
        action,
        userInput,
        getSettings
      );

      setSidebarResetTrigger(false);
      const sessions = extractResponseData(response);
      return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
      setErrorMsg("Problem with fetching data. Try again.");
      console.error('Failed to fetch chat sessions', error);
      return [];
    }
  }, [getSettings, setErrorMsg, setSidebarResetTrigger]);
};