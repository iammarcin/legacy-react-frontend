# React Services - API Communication Layer

Tags: #react #services #api #http #websocket #streaming #rest #authentication #jwt #chat-api #real-time #fetch #backend-integration #message-handling

## System Context

This directory contains the API communication layer for the BetterAI React frontend. Services handle all HTTP requests, WebSocket connections, and chat orchestration. They sit between the hooks layer (which manages React state) and the FastAPI backend. The architecture supports both traditional REST calls and real-time WebSocket streaming for chat responses.

**Related Documentation:**
- `../hooks/CLAUDE.md` - React hooks that consume these services
- `../utils/CLAUDE.md` - Utility functions used by services (streamingUtils, configuration)
- `../../CLAUDE.md` - Overall React application architecture

## Architecture Overview

```
Hooks → Services → Backend API
         ↓
    ┌────┴────┐
    │         │
  HTTP      WebSocket
(api.service) (api.websocket)
    │         │
    └────┬────┘
         ↓
    call.chat.api (orchestrator)
```

## File Reference

### api.service.js
**Purpose:** Low-level HTTP transport wrapper around the Fetch API.

**Key Export:** `makeApiCall(endpoint, method, headers, body, binaryResponse, streamResponse, onChunkReceived)`

**Responsibilities:**
- Generic HTTP requests (GET, POST, PUT, PATCH, DELETE)
- Auth token injection via `authHeader()`
- FormData handling (strips Content-Type for boundary)
- Streaming response support (reads chunks via `getReader()`)
- Binary response handling

**Response Structure:**
```javascript
{
  code: number,        // HTTP status code
  success: boolean,    // true if 2xx
  message: string,     // Status text or error
  data: object|null,   // Response payload
  meta: {}             // Reserved for future use
}
```

**Error Handling:**
- 401 → Returns `{ message: "Unauthorized" }`
- JSON parse error → Returns `{ message: "Error parsing response" }`

---

### auth.header.js
**Purpose:** Manages JWT token injection for authenticated requests.

**Key Export:** `authHeader()` → `{ Authorization: "Bearer {token}" }` or `{}`

**Token Source:** `getAuthTokenForBackend()` from `../utils/configuration.js`

**Edge Case:** Returns empty object if no token exists, allowing unauthenticated endpoints.

---

### api.methods.js (~19KB)
**Purpose:** High-level REST helpers with action-based routing and payload preparation.

**Key Exports:**

| Function | Purpose |
|----------|---------|
| `triggerAPIRequest(basePath, provider, action, userInput, getSettings)` | Main REST caller with action routing |
| `prepareChatHistoryForDB(chatContent)` | Formats messages for database persistence |
| `extractResponseData(response)` | Normalizes response from `data` or `message` |
| `prepareMessageWriteBody()` | Body builder for new/edit messages |
| `prepareUpdateMessageBody()` | Body builder for message patches |
| `prepareSessionDetailBody()` | Body builder for session fetch |
| `prepareListSessionsBody()` | Body builder for paginated session lists |
| `prepareSearchSessionsBody()` | Body builder for full-text search |

**Action Routing Map (CHAT_ACTION_ROUTES):**
```javascript
{
  // Message operations
  db_new_message: { method: "POST", path: "/messages" },
  db_edit_message: { method: "PATCH", path: "/messages" },
  db_update_message: { method: "PUT", path: "/messages" },
  db_remove_messages: { method: "DELETE", path: "/messages" },

  // Session operations
  db_all_sessions_for_user: { method: "POST", path: "/sessions/list" },
  db_get_user_session: { method: "POST", path: "/sessions/detail" },
  db_search_messages: { method: "POST", path: "/sessions/search" },
  db_update_session: { method: "PATCH", path: "/sessions" },
  db_remove_session: { method: "DELETE", path: "/sessions" },

  // Prompt operations
  db_get_all_prompts: { method: "GET", path: "/prompts" },
  // ... plus auth operations
}
```

**Key Transformations:**
- camelCase → snake_case for all request payloads
- Automatic `customer_id` injection into all requests
- Response normalization: snake_case → camelCase

---

### api.websocket.js (~14KB)
**Purpose:** WebSocket management for real-time text and audio streaming.

**Key Exports:**

| Function | Purpose |
|----------|---------|
| `triggerStreamingWSRequest(options)` | Generic WebSocket handler |
| `triggerStreamingWSTextRequest(options)` | Text chat-specific wrapper |
| `getWebSocketUrl(endpoint)` | Converts HTTP URL to WebSocket URL |

**Message Types Handled:**
| Type | Meaning |
|------|---------|
| `"websocket_ready"` | Backend ready, handshake complete |
| `"working"` | Backend acknowledged request |
| `"text_chunk"` | Text chunk for UI streaming |
| `"thinking_chunk"` | AI reasoning chunk |
| `"text_completed"` | Text generation finished (dual-flag) |
| `"tts_completed"` / `"tts_not_requested"` | TTS finished (dual-flag) |
| `"error"` / `"stream_error"` | Backend error |
| `"db_operation_executed"` | Message saved to database |
| `"transcription_in_progress"` | Audio transcription started |
| `"transcription_complete"` | Audio transcription finished |
| `"tts_file_uploaded"` | TTS audio ready |

**Text Mode Flow:**
1. Connection opens → sends payload with userInput, settings, chat history
2. Backend responds `"websocket_ready"` → handshake complete
3. Backend sends `"text_chunk"` chunks → `onChunkReceived` fires
4. Backend sends `"text_completed"` + `"tts_completed"` (or `"tts_not_requested"`) → `onStreamEnd` fires (dual-flag pattern)

**URL Construction:** Appends auth token as query parameter: `wss://...?token={jwt}`

---

### call.chat.api.js (~27KB)
**Purpose:** Central orchestrator for all chat operations - the heart of message handling.

**Key Export:** `CallChatAPI(params)` - async function

**Parameters:**
```javascript
{
  chatContentSnapshot,      // Cloned chat state
  setChatContent,           // State setter
  editMessagePosition,      // Index if editing, null if new
  userInput,               // User's message text
  assetInput,              // Asset references
  attachedImages,          // Image attachments
  attachedFiles,           // File attachments
  scrollToBottom,          // UI scroll function
  setLoading,              // Loading state setter
  setErrorMsg,             // Error state setter
  getSettings,             // Settings callback
  isHealthMode,            // Health data mode flag
  onDBOperationExecuted,   // DB confirmation callback
  onCustomEvent            // Image generation callback
}
```

**Core Responsibilities:**

1. **Message Building:**
   - Creates user message with attachments
   - Creates AI response placeholder
   - Handles edit mode (replaces existing) vs new message (appends)

2. **Payload Preparation:** Uses `streamingUtils.js`:
   - `prepareChatHistory()` - formats message history
   - `prepareUserPrompt()` - formats current input
   - `prepareResponseChatItem()` - creates AI placeholder
   - `prepareUserInputForWebsocketsRequest()` - builds complete WS payload

3. **Character Handling:**
   - Looks up character config from `ChatCharacters.js`
   - Checks `autoResponse` flag
   - Stores character name in message metadata

4. **Streaming Mode Selection:**
   - Checks `getUseWebsockets()` flag
   - WebSocket route: `triggerStreamingWSTextRequest()`
   - HTTP route: `triggerStreamingAPIRequest()`

5. **Database Operations:**
   - New session creation on first message
   - Session auto-rename after initial messages
   - Message persistence handled by backend in WS mode

6. **UI Updates:**
   - Optimistic updates (user message appears immediately)
   - Streaming chunks update AI placeholder in real-time
   - Image attachment handling via `onCustomEvent`
   - Auto-scroll management

**Edit Message Flow:**
- `editMessagePosition` contains index of message being edited
- Replaces message at that index instead of appending
- AI response updates at index+1 or creates new

**State Management Pattern:**
- Mutates `chatContentSnapshot` before passing to `setChatContent`
- Keeps snapshot updated alongside React state for DB operations
- Uses `chunkBuffer` to accumulate streaming text before DB save

## Cross-Dependencies

| Service | Other Services | Utils Used |
|---------|---------------|------------|
| api.service.js | auth.header.js | - |
| auth.header.js | - | configuration.js |
| api.methods.js | api.websocket.js | configuration.js, misc.js |
| api.websocket.js | - | configuration.js |
| call.chat.api.js | api.methods.js, api.websocket.js | streamingUtils.js, configuration.js, misc.js |

## Implementation Notes

- **Snapshot Pattern:** `CallChatAPI` expects cloned state to prevent stale closures during async streaming.
- **Dual Transport:** System supports both HTTP streaming and WebSocket; controlled by `getUseWebsockets()`.
- **Optimistic Updates:** User messages appear immediately; AI placeholder shows before streaming starts.
- **Customer ID:** Automatically injected into all requests via `getCustomerId()`.
- **Error Recovery:** WebSocket reconnection not automatic; errors propagate to `setErrorMsg`.
- **Extending Actions:** Add new entries to `CHAT_ACTION_ROUTES` and corresponding `prepare*Body` helper.
