# React Hooks - Custom State & Data Fetching

Tags: #react #hooks #frontend #state-management #data-fetching #chat-api #sessions #settings #memoization #debounce #custom-hooks

## System Context

This directory contains custom React hooks for the BetterAI chat frontend. These hooks are the primary interface between React components and the service layer, managing state orchestration, data fetching, and user settings aggregation. The hooks work within React's Context system (`StateContextProvider`) and delegate API communication to the `services/` layer.

**Related Documentation:**
- `../services/CLAUDE.md` - API communication layer these hooks consume
- `../utils/CLAUDE.md` - Configuration and utility functions used by hooks
- `../../CLAUDE.md` - Overall React application architecture

## Architecture Overview

```
Components → Hooks → Services → Backend
              ↓
        StateContext (chatContent, sessions, UI flags)
```

Hooks follow a consistent pattern: wrap async operations in `useCallback`, consume context via `useContext(StateContext)`, and delegate API work to services.

## File Reference

### useChatAPI.js
**Purpose:** Central orchestrator for sending chat messages to the backend.

**Key Export:** `useChatAPI()` → `{ callChatAPI }`

**Responsibilities:**
- Validates model name via `getTextModelName()`
- Manages loading state (`setLoading`)
- Handles errors (`setErrorMsg`)
- Delegates to `CallChatAPI` service from `call.chat.api.js`

**Usage Pattern:**
```javascript
const { callChatAPI } = useChatAPI();
callChatAPI({ chatContentSnapshot, editMessagePosition, isHealthMode });
```

**Dependencies:** `CallChatAPI` (service), `useSettings()` (hook), `StateContext`

---

### useCurrentSession.js
**Purpose:** Memoized selectors for current session data, preventing unnecessary re-renders.

**Key Exports:**
- `useCurrentSession()` - Returns full current session object
- `useCurrentSessionId()` - Returns only `db_session_id`
- `useCurrentSessionCharacter()` - Returns only `ai_character_name`

**Why Three Hooks:** Components needing only the session ID won't re-render when other session properties change. Critical for performance in chat UI.

**Data Source:** `StateContext.chatContent[currentSessionIndexRef.current]`

---

### useDebounce.js
**Purpose:** Delays state updates to prevent excessive re-renders and API calls.

**Key Export:** `useDebounce(value, delay)` → debounced value

**Common Uses:**
- Search input debouncing (prevents API call per keystroke)
- Streaming chunk collection (prevents out-of-order processing)

**Implementation:** Standard React debounce with `useEffect` cleanup.

---

### useFetchChatContent.js
**Purpose:** Loads all messages for a specific session from the backend database.

**Key Export:** `useFetchChatContent()` → `fetchChatContent(sessionId, sessionIndex)`

**Data Normalization:** Converts backend snake_case to frontend conventions:
- `message_id` → `messageId`
- `sender === 'User'` → `isUserMessage: true`
- Standardizes `image_locations`, `file_locations`

**Error Handling:** On failure, clears session, navigates to home, shows character selection.

**Dependencies:** `triggerAPIRequest` (service), `extractResponseData` (service), `useSettings()` (hook)

---

### useFetchChatSessions.js
**Purpose:** Fetches paginated list of sessions with search and filtering support.

**Key Export:** `useFetchChatSessions()` → `fetchChatSessions(options)`

**Options Supported:**
- `offset`, `limit` - Pagination
- `searchText` - Full-text search on messages
- `startDate`, `endDate` - Date range filter
- `selectedTags` - Tag-based filtering

**API Routing:**
- With `searchText` → calls `db_search_messages` action
- Without → calls `db_all_sessions_for_user` action

**Date Handling:** Increments `endDate` by 1 day for SQL boundary conditions.

---

### useSettings.js
**Purpose:** Aggregates all user configuration from localStorage into a single payload for API calls.

**Key Export:** `useSettings()` → `getSettings()` callback

**Settings Structure:**
```javascript
{
  text: { temperature, model, memory_limit, streaming, reasoning_enabled, ... },
  tts: { stability, similarity_boost, voice, speed, model, ... },
  speech: { language, temperature, model, realtime_voice, ... },
  image: { model, number_of_images, size, quality_hd, flux_*, sd_*, ... },
  general: { returnTestData, ai_agent_enabled }
}
```

**Character Integration:** Includes `ai_character` from current session in text settings.

**Memoization:** Uses `useCallback` to prevent recreating settings object on every render.

**Dependencies:** All getters from `../utils/configuration.js`

## Cross-Dependencies

| Hook | Services Used | Utils Used |
|------|--------------|------------|
| useChatAPI | call.chat.api.js | configuration.js |
| useFetchChatContent | api.methods.js | configuration.js |
| useFetchChatSessions | api.methods.js | misc.js (formatDate) |
| useSettings | - | configuration.js (50+ getters) |
| useCurrentSession | - | - |
| useDebounce | - | - |

## Implementation Notes

- **Snapshot Pattern:** `useChatAPI` expects `chatContentSnapshot` (cloned state) to prevent stale closure issues during async operations.
- **Ref Sync:** Hooks rely on `currentSessionIndexRef` being current before invocation; provider syncs this via `useEffect`.
- **Error Boundaries:** Hooks catch errors and route to context's `setErrorMsg`; they don't throw.
- **No Direct Fetch:** Hooks never call `fetch()` directly; always delegate to services layer.
