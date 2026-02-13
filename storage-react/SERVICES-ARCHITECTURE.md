# React Services Architecture

## Overview

This document describes the service layer architecture for API communication in the React frontend. The architecture follows a layered approach, separating concerns between WebSocket communication, HTTP requests, payload preparation, and business logic.

## Service Files

### api.service.js
Low-level HTTP wrapper. Handles fetch calls and error handling.

**Exports:**
- `makeApiCall({ endpoint, method, body, headers, streamResponse })` - Core function for making API calls

**Responsibilities:**
- Execute fetch requests
- Handle response parsing
- Manage error handling
- Support streaming responses

### api.methods.js
High-level API methods for database and other operations.

**Exports:**
- `triggerAPIRequest(endpoint, category, action, userInput, getSettings)` - Generic API request
- `triggerStreamingAPIRequest(endpoint, category, action, userInput, assetInput, getSettings, callbacks)` - HTTP streaming
- `triggerStreamingWSRequest(options)` - WebSocket streaming (re-exported from api.websocket.js)
- `triggerStreamingWSTextRequest(options)` - Text WebSocket streaming (re-exported)
- `prepareChatHistoryForDB(chatContent)` - Format chat for database
- `updateSessionInDB(chatContent, sessionId, getSettings, updateTime)` - Update session
- `generateImage(prompt, getSettings)` - Generate images
- `extractResponseData(response)` - Extract data from responses
- Database operation helpers (search, sessions, prompts, auth)

**Responsibilities:**
- Build request payloads for database operations
- Normalize responses from backend
- Convert between camelCase (frontend) and snake_case (backend)
- Clean and validate request data

### api.websocket.js
WebSocket connection management for streaming.

**Exports:**
- `getWebSocketUrl(endpoint)` - Build WebSocket URL with auth token
- `triggerStreamingWSRequest(options)` - Generic WebSocket streaming
- `triggerStreamingWSTextRequest(options)` - Text chat streaming wrapper
- `createWebSocketConnection(url, handlers)` - Low-level WebSocket utility

**Responsibilities:**
- Create and manage WebSocket connections
- Handle WebSocket lifecycle (open, message, error, close)
- Parse incoming messages by type (text, dbOperationExecuted, custom events, etc.)
- Support both text and audio streaming modes
- Manage handshake protocol with backend

**Message Types Handled:**
- `websocket_ready` - Backend ready signal
- `working` - Backend processing acknowledgment
- `error` / `stream_error` - Backend error messages
- `text_completed` - Text generation complete (dual-flag pattern)
- `tts_completed` / `tts_not_requested` - TTS generation complete (dual-flag pattern)
- `text_chunk` - Text content chunks
- `thinking_chunk` - AI reasoning chunks
- `db_operation_executed` - Database operation confirmation
- `custom_event` - Custom events (e.g., image generation)
- `transcription_in_progress` / `transcription_complete` - Audio transcription
- `tts_file_uploaded` - Text-to-speech file upload

### call.chat.api.js
Chat message orchestration. Main entry point.

**Exports:**
- `CallChatAPI(options)` - Send new or edited chat messages

**Responsibilities:**
- Orchestrate the entire chat message flow
- Handle both new messages and message edits
- Support both WebSocket and HTTP streaming modes
- Manage optimistic UI updates
- Handle character switching
- Trigger image generation (for image-enabled characters)
- Coordinate database operations (in non-WebSocket mode)
- Manage session state updates

**Parameters:**
- `userInput` - User's message text
- `assetInput` - Additional assets
- `editMessagePosition` - Position of message being edited (null for new messages)
- `attachedImages` / `attachedFiles` - Media attachments
- `sessionIndexForAPI` / `sessionIdForAPI` - Session identifiers
- `isNewSessionFromHere` - Flag for new session creation
- `chatContentSnapshot` - Current chat state
- `setChatContent` - State updater function
- `apiAIModelName` - AI model to use
- `isHealthMode` - Special mode flag
- Various callback functions for UI updates

## Utils

### streamingUtils.js
Payload preparation for WebSocket requests. Matches Kotlin implementation.

**Exports:**
- `prepareChatHistory(chatContent, sessionIndex, editPosition)` - Format chat history
- `prepareUserPrompt(chatContent, sessionIndex, editPosition)` - Format user prompt
- `prepareResponseChatItem(chatContent, sessionIndex, editPosition, characterName)` - Create AI placeholder
- `prepareUserInputForWebsocketsRequest(...args)` - Complete WebSocket payload
- `prepareSettingsForWebsocketsRequest(getSettings, requestType)` - Format settings

**Responsibilities:**
- Prepare payloads matching backend expectations
- Handle message formatting for chat history
- Include all required metadata (messageIds, localIds, timestamps, etc.)
- Set `is_edited_message` flag correctly
- Add image_mode for image-enabled characters

### misc.js
General utility functions.

**Exports:**
- `generateUUID()` - Generate UUID v4
- `formatDate(dateString, format)` - Format dates
- `convertFileAndImageLocationsToAttached(imageLocations)` - Convert URLs to attachment format
- `optimizeHealthDataForAPICall(data)` - Format health data for API

## Data Flow

### New Message Flow
```
User Input
  → useChatAPI hook
  → CallChatAPI
  → Prepare optimistic UI update (add user message to chatContent)
  → prepareChatHistory (streamingUtils) - excludes last message
  → prepareUserPrompt (streamingUtils) - formats current message
  → prepareResponseChatItem (streamingUtils) - creates AI placeholder
  → prepareUserInputForWebsocketsRequest (streamingUtils) - complete payload
      ├── is_edited_message: false
      ├── userMessage (no messageId)
      └── aiResponse (no messageId)
  → triggerStreamingWSTextRequest (api.websocket)
  → WebSocket to backend
  → onChunkReceived callbacks
      └── Update AI message in chatContent
  → Backend sends dbOperationExecuted
      ├── Contains userMessageId and aiMessageId
      └── Update messageIds in chatContent
  → onStreamEnd callback
  → UI confirms persistence
```

### Edit Message Flow
```
User Edits Message
  → CallChatAPI with editMessagePosition = { index: N, messageId: ID }
  → Update user message at position N in chatContent
  → prepareChatHistory (streamingUtils) - excludes edited messages
  → prepareUserPrompt (streamingUtils) - gets message at edit position
      └── Includes messageId from database
  → prepareResponseChatItem (streamingUtils) - gets/creates AI response
      └── Includes messageId if exists
  → prepareUserInputForWebsocketsRequest (streamingUtils)
      ├── is_edited_message: true  ← CRITICAL
      ├── userMessage.messageId: ID  ← CRITICAL
      └── aiResponse.messageId: ID  ← CRITICAL
  → WebSocket to backend
  → Backend UPDATES existing DB records (not INSERT)
  → Backend sends dbOperationExecuted with same messageIds
  → UI updates with final state
  → After refresh: only edited version exists (not old + new)
```

### Database Operations (Non-WebSocket Mode)

When `getUseWebsockets()` returns false:
```
After streaming completes
  → prepareFinalInputForDB (call.chat.api.js)
      ├── Builds payload for database
      └── Includes userMessage, aiResponse, chat_history
  → triggerAPIRequest("api/db", "provider.db", action, payload)
      ├── action: "db_new_message" or "db_edit_message"
      └── api.methods.js handles request building
  → Backend saves to database
  → Response includes messageIds and sessionId
  → Update chatContent with database IDs
```

## Key Patterns

### 1. Payload Structure
**Always use streamingUtils functions** for WebSocket payloads:
- `prepareChatHistory()` - Format history excluding edited messages
- `prepareUserPrompt()` - Format current user message
- `prepareResponseChatItem()` - Create AI response placeholder
- `prepareUserInputForWebsocketsRequest()` - Combine into complete payload

**Never build payloads manually** in call.chat.api.js or other files.

### 2. Edit Detection
Pass `editMessagePosition` through the entire call chain:
- `editMessagePosition = null` → New message
- `editMessagePosition = { index: N, messageId: ID }` → Edit message at position N

The `prepareUserInputForWebsocketsRequest()` function checks this and sets:
- `is_edited_message: true` when editing
- Includes `messageId` in both `userMessage` and `aiResponse`

### 3. DB Operations in WebSocket Mode
In WebSocket mode, **backend handles all database operations**:
- Frontend sends complete payload via WebSocket
- Backend processes and saves to database
- Backend sends `dbOperationExecuted` event with messageIds
- Frontend updates chatContent with returned IDs

No need to call `prepareFinalInputForDB()` or `triggerAPIRequest()` for DB operations.

### 4. Optimistic UI Updates
1. Add user message to `chatContentSnapshot` immediately
2. Add AI placeholder to `chatContentSnapshot`
3. Call `setChatContent()` to update UI
4. Stream chunks update the AI message
5. When `dbOperationExecuted` received, update messageIds
6. UI shows instant feedback, database IDs confirmed async

### 5. Error Handling
Each layer handles errors appropriately:
- **api.service.js** - Network errors, HTTP errors
- **api.websocket.js** - WebSocket connection errors, message parsing errors
- **call.chat.api.js** - Business logic errors, fallback to HTTP mode
- **Callbacks** - UI error display

### 6. Character-Specific Behavior
Characters are defined in `ChatCharacters.js`:
- `autoResponse: true` - Character sends AI response automatically
- `autoResponse: false` - Only save user message, no AI response
- `uiOption: "image"` - Add `image_mode` to userPrompt

`call.chat.api.js` checks character config and adjusts flow accordingly.

## Message Structure

### Frontend Message Format (chatContent)
```javascript
{
  message: "text",
  isUserMessage: true/false,
  messageId: 123,  // From database
  localId: "uuid",  // Client-side ID
  dateGenerate: "2025-11-06 07:33",
  image_locations: ["url1", "url2"],
  fileNames: ["file1.pdf"],
  aiCharacterName: "assistant",
  apiAIModelName: "gpt-4o-mini",
  favorite: false,
  isTTS: false,
  showTranscribeButton: false,
  isGPSLocationMessage: false
}
```

### Backend WebSocket Payload Format
```javascript
{
  requestType: "text",
  userInput: {
    prompt: [{ type: "text", text: "..." }],
    chat_history: [...],
    session_id: "uuid",
    userMessage: {
      message: "...",
      isUserMessage: true,
      messageId: 123,  // Only when editing
      localId: "uuid",
      dateGenerate: "...",
      imageLocations: [],
      fileNames: [],
      // ... other fields
    },
    aiResponse: {
      message: "",
      isUserMessage: false,
      messageId: 124,  // Only when editing
      localId: "uuid",
      aiCharacterName: "assistant",
      apiTextGenAIModelName: "gpt-4o-mini",
      // ... other fields
    },
    is_edited_message: false,  // true when editing
    ai_text_gen_model: "gpt-4o-mini",
    new_ai_character_name: "assistant",
    customer_id: 1,
    auto_trigger_tts: false,
    audio_file_name: ""
  },
  assetInput: [],
  userSettings: { ... },
  customerId: 1
}
```

## Testing Guidelines

### Unit Testing
Test each utility function independently:
- `prepareChatHistory()` - Verify correct exclusion of messages
- `prepareUserPrompt()` - Verify attachment formatting
- `prepareUserInputForWebsocketsRequest()` - Verify all required fields present

### Integration Testing
Test complete flows:
1. New message → Verify `is_edited_message: false`
2. Edit message → Verify `is_edited_message: true` and messageIds present
3. WebSocket connection → Verify handshake and message handling
4. Database operations → Verify messageIds updated correctly

### Manual Testing
After changes, verify:
1. Send new message → Message appears, refreshes correctly
2. Edit message → Message updates in place, refresh shows only edited version
3. Check console logs → Verify payload structure
4. Check network tab → Verify WebSocket messages
5. Check database → Verify record updates (not new inserts on edit)

## Common Issues and Solutions

### Issue: Edit creates new message instead of updating
**Cause:** `is_edited_message` flag not set or messageIds missing

**Solution:**
1. Verify `editMessagePosition` passed correctly through call chain
2. Check console log for "WebSocket payload prepared:"
3. Verify `is_edited_message: true` and messageIds present
4. Check message objects have `messageId` field populated from database

### Issue: Duplicate fields in payload
**Cause:** Manual payload building instead of using streamingUtils

**Solution:**
- Always use `prepareUserInputForWebsocketsRequest()`
- Never build payload manually in call.chat.api.js
- Removed duplicate field logic in Milestone 1

### Issue: MessageIds not updating after save
**Cause:** Not handling `dbOperationExecuted` event correctly

**Solution:**
1. Check `onDBOperationExecuted` callback in api.websocket.js
2. Verify callback updates chatContentSnapshot with messageIds
3. Verify `setChatContent()` called to update UI

## Version History

- **Milestone 1** (Completed): Cleaned up duplicate WebSocket fields
- **Milestone 2** (Completed): Integrated streamingUtils into call.chat.api.js
- **Milestone 3** (Completed): Testing and verification
- **Milestone 4** (Current): Code cleanup, documentation, and consolidation

## Future Improvements

1. **TypeScript Migration** - Add type safety to payload structures
2. **Error Recovery** - Better handling of WebSocket disconnections
3. **Offline Support** - Queue messages when offline
4. **Performance** - Optimize large chat histories
5. **Testing** - Add comprehensive unit and integration tests

## Related Documentation

- **Kotlin Reference:** `storage-kotlin/app/src/main/java/utils/StreamingUtils.kt`
- **Backend:** `storage-backend/core/websocket/chat_websocket.py`
- **Database Schema:** `storage-backend/db/models/messages.py`
- **Context Document:** `docker/DocumentationResearch/react-edit-message-fix-context.md`
- **Implementation Summary:** `docker/DocumentationResearch/react-edit-message-fix-summary.md`
