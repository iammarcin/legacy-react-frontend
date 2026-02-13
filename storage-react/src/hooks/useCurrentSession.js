// hooks/useCurrentSession.js

// this is kind of centralized getCurrentSession - to be sure that we have latest data, but also don't trigger re-renders when not necessary
import { useContext, useMemo } from 'react';
import { StateContext } from '../components/StateContextProvider';

export const useCurrentSession = () => {
  const { chatContent, currentSessionIndexRef } = useContext(StateContext);

  return useMemo(() => {
    return chatContent[currentSessionIndexRef.current];
  }, [chatContent, currentSessionIndexRef]);
};

export const useCurrentSessionId = () => {
  const { chatContent, currentSessionIndexRef } = useContext(StateContext);

  return useMemo(() => {
    const currentSession = chatContent[currentSessionIndexRef.current];
    return currentSession ? currentSession.session_id : null;
  }, [chatContent, currentSessionIndexRef]);
};

export const useCurrentSessionCharacter = () => {
  const { chatContent, currentSessionIndexRef } = useContext(StateContext);

  return useMemo(() => {
    const currentSession = chatContent[currentSessionIndexRef.current];
    return currentSession ? currentSession.ai_character_name : "";
  }, [chatContent, currentSessionIndexRef]);
};

