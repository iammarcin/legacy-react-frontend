// hooks/useDebounce.js
import { useState, useEffect } from 'react';

//custom hook for debouncing (delaying) some operations 
// used in search sessions with search input (to prevent too many API calls)
// and when we collect chunks from streaming response (to avoid out of order / duplicated chunks)
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
