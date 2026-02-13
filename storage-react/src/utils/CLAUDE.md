# React Utils - Helper Functions & Configuration

Tags: #react #utils #configuration #localstorage #settings #streaming #audio #recording #health-data #visualization #chart-js #image-compression #uuid #date-formatting #svg-icons #color-palette #websocket-payload

## System Context

This directory contains utility functions and configuration management for the BetterAI React frontend. These are pure helpers and stateless functions used across the application by both hooks and services. The utilities handle user settings persistence, message formatting for WebSocket payloads, audio recording, health data visualization, and common helper functions.

**Related Documentation:**
- `../hooks/CLAUDE.md` - React hooks that use these utilities
- `../services/CLAUDE.md` - Services that depend on configuration and streaming utils
- `../../CLAUDE.md` - Overall React application architecture

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                Components                    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          Hooks & Services                    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│                 Utils                        │
│  ┌─────────────┐ ┌─────────────┐            │
│  │configuration│ │streamingUtils│           │
│  │   (state)   │ │  (payloads) │           │
│  └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐            │
│  │audio.record │ │health.data  │           │
│  │ (capture)   │ │ (charts)    │           │
│  └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐            │
│  │    misc     │ │ svg.icons   │           │
│  │ (helpers)   │ │   (UI)      │           │
│  └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────┘
```

## File Reference

### configuration.js (~20KB)
**Purpose:** Single source of truth for all user configuration, backed by localStorage.

**Architecture:** Getter/setter pairs with sensible defaults. All settings persist across sessions.

**Settings Categories:**

| Category | Key Settings | Defaults |
|----------|-------------|----------|
| **Text Model** | model, temperature, memory_limit, streaming, reasoning_enabled | gpt-4o-mini, 0.1, 2000, true, false |
| **TTS** | voice, stability, similarity_boost, speed, model | alloy, 0.0, 0.0, 1.0, tts-1 |
| **Speech** | language, model, temperature, recording_sample_rate | en, deepgram-nova-3, 0.0, 16000 |
| **Image** | model, size, quality_hd, number_of_images | dall-e-3, 1024, false, 1 |
| **General** | use_websockets, return_test_data, ai_agent_enabled | true, false, false |

**Key Getter Functions:**
```javascript
// Text settings
getTextTemperature(), getTextModelName(), getTextMemorySize(), getTextStreaming()
getTextReasoningEnabled(), getTextFileAttachedMessagesLimit()

// TTS settings
getTTSVoice(), getTTSSpeed(), getTTSStability(), getTTSSimilarityBoost()
getTTSModelName(), getTTSAutoExecute()

// Speech settings
getSpeechLanguage(), getSpeechModelName(), getSpeechTemperature()
getSpeechRecordingSampleRate(), getSpeechRealtimeVoice()

// Image settings
getImageModelName(), getImageSize(), getImageQualityHD(), getImageNumberOfImages()
getFluxGuidance(), getFluxUpsampling(), getSDStylePreset(), getSDCFGScale()

// Auth & API
getCustomerId(), getAuthTokenForBackend(), getURLForAPICalls()
getUseWebsockets(), getReturnTestData()
```

**Type Conversion:** `convertType(value, type)` handles float, int, boolean conversions from localStorage strings.

**API Endpoint:** Default `"https://www.goodtogreat.life/api/"`, configurable via `setURLForAPICalls()`.

---

### streamingUtils.js (~15KB)
**Purpose:** Converts React state messages to backend-compatible WebSocket/streaming payloads.

**Key Exports:**

| Function | Purpose |
|----------|---------|
| `prepareChatHistory(chatContent, sessionIndex, editPosition)` | Formats message history for backend |
| `prepareUserPrompt(chatContent, sessionIndex, editPosition)` | Extracts and formats current user input |
| `prepareResponseChatItem(chatContent, index, editPosition, characterName)` | Creates AI response placeholder |
| `prepareUserInputForWebsocketsRequest(...)` | Builds complete WebSocket payload |
| `prepareSettingsForWebsocketsRequest(getSettings, requestType)` | Clones settings for WS request |

**Message Format Transformation:**

User messages become:
```javascript
{ role: "user", content: [
  { type: "text", text: "..." },
  { type: "image_url", image_url: { url: "..." } },
  { type: "file_url", file_url: { url: "..." } },
  { type: "audio_url", audio_url: { url: "..." } }
]}
```

AI responses become:
```javascript
{ role: "assistant", content: "string" }
```

**WebSocket Payload Structure:**
```javascript
{
  prompt: [...],                    // Formatted user message
  chat_history: [...],              // Formatted message history
  session_id: "uuid",               // Current session
  userMessage: {...},               // Full user message object
  aiResponse: {...},                // Empty AI placeholder
  auto_trigger_tts: boolean,
  ai_text_gen_model: "model-name",
  new_ai_character_name: "name",
  is_edited_message: boolean,
  customer_id: "uuid"
}
```

**Character Detection:** Adds `image_mode` to prompt if character has `uiOption="image"`.

---

### audio.recording.js (~7.8KB)
**Purpose:** Manages audio capture and real-time streaming to backend for speech-to-text.

**Key Export:** `AudioRecorder` class

**Constructor Options:**
```javascript
{
  getSettings,              // Settings callback
  onTranscriptionUpdate,    // Called with transcription text chunks
  onAiAnswerUpdate,         // Called with AI response chunks
  onError,                  // Error handler
  onTTSFileUploaded         // Called when TTS audio ready
}
```

**Key Methods:**
- `start()` - Initiates audio recording
- `stop()` - Stops recording and closes WebSocket
- `startAudioRecording()` - Main recording logic

**Implementation:**
- Uses `navigator.mediaDevices.getUserMedia()` for microphone access
- Creates `MediaRecorder` for audio capture
- Sends audio chunks via WebSocket in real-time
- On stop, sends `"RecordingFinished"` message

**Dual WebSocket Pattern:**
- `audioWs` - Sends audio data to backend
- `textWs` - Receives transcription and AI response

---

### health.data.process.js (~4KB)
**Purpose:** Transforms health/fitness data for Chart.js visualization.

**Key Exports:**

| Function | Purpose |
|----------|---------|
| `processNonGroupedDataForGraph(data, keys, transforms, colors, labels, chartTypes, isHidden, yAxisIDs)` | Simple time-series data |
| `groupAndProcessDataForGraph(data, startDate, endDate, keys, transformFn, colors, labels, secondaryKey, valueKey)` | Grouped/aggregated data |

**Output Format (Chart.js compatible):**
```javascript
{
  labels: ["2024-01-01", "2024-01-02", ...],
  datasets: [
    { label: "Sleep", data: [...], backgroundColor: "rgba(...)", type: "bar" },
    { label: "HRV", data: [...], borderColor: "rgba(...)", type: "line" }
  ]
}
```

**Features:**
- Multi-axis support (left/right Y-axes)
- Bar and line chart types
- Date range filling (missing dates get zero values)
- Secondary grouping (e.g., activities by type)
- Value aggregation (sum or count)

**Dependencies:** Uses `getColor()` from `color.helper.js`

---

### misc.js (~3KB)
**Purpose:** Common utility functions used across the application.

**Key Exports:**

| Function | Purpose |
|----------|---------|
| `generateUUID()` | Creates unique identifiers |
| `formatDate(dateString, format)` | Date string formatting |
| `convertFileAndImageLocationsToAttached(locations)` | URL to attachment object conversion |
| `optimizeHealthDataForAPICall(data)` | Health data to CSV for API |

**generateUUID():**
- Uses `crypto.randomUUID()` in modern browsers
- Fallback implementation for older browsers

**formatDate():**
- Default: `"YYYY-MM-DD HH:MM"`
- With `format='ymd'`: `"YYYY-MM-DD"`
- Returns empty string for null input

**convertFileAndImageLocationsToAttached():**
```javascript
// Input: ["https://...", "https://..."]
// Output: [{ file: null, url: "https://...", placeholder: false }, ...]
```
Used when editing messages with existing attachments.

---

### svg.icons.provider.js (~11KB)
**Purpose:** SVG icon components for consistent UI iconography.

**Pattern:** Each icon is a function returning SVG JSX with configurable size and color.

**Available Icons:**
- Navigation: menu, close, arrow, expand, collapse
- Actions: send, edit, delete, copy, regenerate
- Media: play, pause, microphone, image, file
- Status: loading, error, success, info
- Chat: user, assistant, character avatars

**Usage:**
```javascript
import { SendIcon, MicrophoneIcon } from '../utils/svg.icons.provider';
<SendIcon size={24} color="#000" />
```

---

### color.helper.js (~1.6KB)
**Purpose:** Centralized color palette with opacity support.

**Key Export:** `getColor(colorName, opacity)` → RGBA string

**Available Colors:**
`red`, `green`, `blue`, `orange`, `yellow`, `purple`, `pink`, `violet`, `gray`, `white`

**Usage:**
```javascript
getColor('blue', 0.8)  // "rgba(54, 162, 235, 0.8)"
getColor('red', 1.0)   // "rgba(255, 99, 132, 1.0)"
```

**Primary Consumer:** `health.data.process.js` for chart colors

---

### image.utils.js (~595B)
**Purpose:** Image compression before S3 upload to reduce bandwidth and storage.

**Key Export:** `resizeImage(file)` → Promise<File>

**Compression Settings:**
- Max file size: 1.5MB
- Max dimensions: 1092px
- Uses `browser-image-compression` library with Web Workers

**Error Handling:** Returns original file on compression failure.

## Cross-Dependencies

| Utility | Dependencies |
|---------|--------------|
| configuration.js | None (pure localStorage) |
| streamingUtils.js | configuration.js, misc.js, ChatCharacters.js |
| audio.recording.js | streamingUtils.js, configuration.js, api.websocket.js |
| health.data.process.js | color.helper.js |
| misc.js | None (pure functions) |
| svg.icons.provider.js | None (pure components) |
| color.helper.js | None (pure function) |
| image.utils.js | browser-image-compression (npm) |

## Implementation Notes

- **Configuration First:** Before modifying settings behavior, check `configuration.js` for existing getters/setters.
- **Payload Contracts:** `streamingUtils.js` must stay in sync with backend expectations and Android app.
- **Audio Permissions:** `audio.recording.js` requires microphone permission; handle denial gracefully.
- **Chart.js Version:** Health data processors are built for Chart.js v3+ dataset structure.
- **Image Compression:** Happens client-side before upload; backend may apply additional processing.
- **Icon Consistency:** Use `svg.icons.provider.js` for all icons; don't import external icon libraries.
