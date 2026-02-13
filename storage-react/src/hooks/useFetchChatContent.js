// hooks/useFetchChatContent.js
import { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { StateContext } from '../components/StateContextProvider';
import { useSettings } from './useSettings';
import { triggerAPIRequest, extractResponseData } from '../services/api.methods';

import config from '../config';
import { formatDate } from '../utils/misc';

export const useFetchChatContent = () => {
  const navigate = useNavigate();
  const { setChatContent, setShowCharacterSelection, setErrorMsg } = useContext(StateContext);
  const getSettings = useSettings();

  return useCallback(async (sessionId, currentSessionIndex) => {
    try {
      if (config.VERBOSE_SUPERB === 1)
        console.log("123 EXecuting useFetchChatContent hook useCallback fetchChatContent with sessionId: ", sessionId);

      const userInput = { "session_id": sessionId };
      const response = await triggerAPIRequest("api/db", "provider.db", "db_get_user_session", userInput, getSettings);

      const sessionResult = extractResponseData(response);

      if (!response.success || !sessionResult) {
        setChatContent((prevChatContent) => {
          const updatedChatContent = [...prevChatContent];
          updatedChatContent[currentSessionIndex].session_id = "";
          return updatedChatContent;
        });
        navigate(`/`);
        setShowCharacterSelection(true);
        return null;
      } else {
        const messages = sessionResult.messages || [];
        setChatContent((prevChatContent) => {
          const updatedChatContent = [...prevChatContent];
          updatedChatContent[currentSessionIndex] = {
            ...sessionResult,
            messages: messages.map(message => ({
              ...message,
              chart_data: message.chart_data ?? [],
              message_id: message.message_id ?? 0,
              isUserMessage: message.sender === 'User',
              ai_character_name: message.ai_character_name ?? sessionResult.ai_character_name ?? '',
              file_locations: message.file_locations ?? [],
              image_locations: message.image_locations ?? []
            }))
          };
          updatedChatContent[currentSessionIndex].session_id = sessionId;
          updatedChatContent[currentSessionIndex].ai_character_name = sessionResult.ai_character_name;
          return updatedChatContent;
        });
        setShowCharacterSelection(false);
        return sessionResult;
      }
    } catch (error) {
      setErrorMsg("Problem with fetching data. Try again.");
      console.error('Failed to fetch chat content', error);
      return null;
    }
  }, [getSettings, setChatContent, setShowCharacterSelection, setErrorMsg, navigate]);
};
