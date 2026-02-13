Tags: #frontend #react #components #chat-ui #ai-assistant #multi-modal #state-management #websockets #streaming

# React Frontend Components

This directory contains all React UI components for the BetterAI frontend application. The frontend is part of a larger full-stack AI assistant platform with a FastAPI backend, serving as the primary user interface for multi-modal AI interactions including text chat, voice, image generation, health analytics, and hiking blog generation.

## System Context

The frontend communicates with the backend via:
- **REST API calls** (`services/api.methods.js`) for standard requests
- **WebSocket connections** for real-time streaming responses
- **S3 integration** for file/image uploads

Configuration is managed through `utils/configuration.js` with settings persisted in localStorage.

---

## Architecture Overview

### Core Application Flow

```
Main.js (root orchestrator)
    ├── TopMenu.js (navigation, model selection, session tabs)
    ├── Sidebar.js (session history, search, tags)
    ├── ChatWindow.js (message display container)
    │       ├── ChatCharacters.js (AI persona selection)
    │       └── ChatMessage.js (individual message rendering)
    ├── BottomToolsMenu.js (input area, attachments, AI tools)
    └── ProgressIndicator.js (loading states)
```

### State Management

**StateContextProvider.js** - Central React Context providing global state:
- `chatContent` - Multi-session chat data structure
- `currentSessionIndex` - Active session tracking
- `userInput`, `attachedImages`, `attachedFiles` - Input state
- `healthData`, `correlationData` - Health module data
- `progressBarMessage`, `errorMsg` - UI feedback state

---

## Component Groups

### 1. Chat Core (Main Conversational UI)

| File | Purpose |
|------|---------|
| `Main.js` | Root component, session management, routing, API orchestration |
| `ChatWindow.js` | Message list container, auto-scroll, character selection display |
| `ChatMessage.js` | Message rendering with markdown, code highlighting (Prism.js), context menus, image galleries |
| `ChatCharacters.js` | AI persona grid (50+ characters), selection handling, filtering via `@` mentions |
| `ChatImageModal.js` | Fullscreen image/chart viewer with navigation |

**Key behaviors:**
- Messages support markdown via `marked` + `DOMPurify` sanitization
- Code blocks get syntax highlighting (Python, JS, Kotlin, Bash, etc.)
- Right-click context menu: Edit, Regenerate, Copy, Remove, New Session From Here
- Character switching via `@CharacterName` in input

### 2. Navigation & Controls

| File | Purpose |
|------|---------|
| `TopMenu.js` | Model selector (Claude, GPT, Gemini, etc.), environment toggle, session tabs |
| `Sidebar.js` | Session history with search, date filtering, tags, infinite scroll |
| `SidebarSessionItem.js` | Individual session row with tags display |
| `BottomToolsMenu.js` | Text input, file attachments, voice recording, AI tool toggles |
| `ProgressIndicator.js` | Animated loading bar with status text |

**AI Tool Toggles in BottomToolsMenu:**
- Think (reasoning mode)
- Browse (web search via Perplexity)
- Research (deep research mode)
- Agent (agentic mode)

### 3. Settings & Configuration (`options/` subdirectory)

Accessed via TopMenu dropdown. Each panel manages specific settings stored in configuration utils.

| File | Settings Managed |
|------|------------------|
| `General.js` | Production mode, test data, websockets, auth token |
| `Text.js` | Temperature, memory size, streaming, reasoning effort, websearch model |
| `Image.js` | Image model (DALL-E, Flux, SD), quality, safe prompt toggle |
| `TTS.js` | TTS model, voice selection, speed, auto-trigger |
| `Speech.js` | Speech-to-text language, temperature |

### 4. Specialized Features

#### Image Generation Center
| File | Purpose |
|------|---------|
| `ImageCenter.js` | Dedicated image generation UI with thumbnail sidebar, like/download actions |

**Flow:** User prompt → Agent mode → Backend generates images → Displayed in gallery

#### Hiking Blog Generator (Wanderer)
| File | Purpose |
|------|---------|
| `Wanderer.js` | GPX + photos + audio upload, blog generation, resizable panels |
| `WandererMap.js` | Leaflet map with GPS track polyline, photo markers matched by timestamp |
| `WandererExampleMapData.js` | Sample data for demo |
| `WandererExampleBlogPost.js` | Example generated blog |

**Flow:** Upload GPX/images/audio → Backend AI generates blog markdown + extracts track → Displayed with interactive map

#### Health & Fitness (See `health/CLAUDE.md` for details)
| File | Purpose |
|------|---------|
| `BloodTests.js` | Blood test results table with tooltips, out-of-range highlighting |
| `BloodTests.helpers.js` | Utility for range validation |
| `Garmin.js` | Single activity map + elevation chart |

### 5. Authentication & Legal

| File | Purpose |
|------|---------|
| `Login.js` | Username/password form, token storage, 15-day expiration |
| `Privacy.js` | Privacy policy page |
| `TermsConditions.js` | Terms of service page |

---

## CSS Organization

Stylesheets in `css/` subdirectory mirror component names:
- `Main.css`, `ChatWindow.css`, `ChatMessage.css`, etc.
- Mobile-responsive breakpoints at 768px
- Dark theme support in some components

---

## Key Integration Points

### Custom Hooks Used
- `useChatAPI` - Main chat API orchestration
- `useSettings` - Settings aggregation for API calls
- `useFetchChatContent` - Session content loading
- `useFetchChatSessions` - Session list pagination
- `useCurrentSession` - Current session ID extraction
- `useDebounce` - Search input debouncing

### External Libraries
- `react-router-dom` - Routing
- `marked` + `dompurify` - Markdown rendering
- `prismjs` - Code syntax highlighting
- `react-datepicker` - Date range selection
- `react-resizable` - Resizable panels
- `react-leaflet` - Maps

---

## Development Notes

- Character definitions in `ChatCharacters.js` include: `nameForAPI`, `voice`, `welcome_msg`, `autoResponse` flag
- Session structure: `{ db_session_id, ai_character_name, original_ai_character, auto_trigger_tts, messages[] }`
- Message structure: `{ message, isUserMessage, image_locations[], file_locations[], messageId, created_at }`
- WebSocket streaming updates `chatContent` incrementally for real-time response display
