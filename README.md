# BetterAI - React Web Client (Legacy)

> Multi-modal AI chat platform with real-time streaming, health analytics, and content generation.
> This is the original React web client - now superseded by a React Native app.

## What Is This

A full-featured web frontend for interacting with AI models through a rich, multi-session chat interface. Built as a personal side project to explore real-time AI integrations, data visualization, and modern React patterns.

**This is the legacy (web) version.** The active version has been rewritten in React Native for cross-platform support.

## Key Features

**AI Chat Interface**
- Multi-session chat with 50+ selectable AI personas/characters
- Real-time response streaming via WebSocket with HTTP fallback
- Message editing, regeneration, and full conversation history
- Markdown rendering with syntax highlighting and Mermaid diagram support
- File and image attachments with client-side compression before upload

**AI Tools Integration**
- Image generation (DALL-E, Flux, Stable Diffusion) with configurable parameters
- Text-to-speech via ElevenLabs with voice selection and speed control
- Speech-to-text transcription via Deepgram with real-time audio recording
- Web search, reasoning mode, and agent mode toggles
- Proactive AI assistant 

**Health & Fitness Dashboard**
- Garmin API integration with 13+ specialized chart types
- Sleep metrics, HRV, body battery, training load, body composition
- Statistical correlation heatmaps across health metrics
- Floating chat overlay for AI-powered health data Q&A
- Date range filtering with interactive visualizations

**Content Generation**
- Hiking blog generator from GPX tracks, photos, and audio
- Interactive Leaflet maps with GPS trail visualization
- Blood test result analyzer with reference range validation
- AI-generated image gallery with multi-model support

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Framework** | React 18, React Router v6 |
| **State** | React Context API, custom hooks, refs for mutable state |
| **Streaming** | WebSocket (with resilient auto-reconnect), HTTP streaming fallback |
| **Charts** | Chart.js, Recharts, chartjs-adapter-date-fns |
| **Maps** | Leaflet, react-leaflet |
| **Rendering** | Marked (markdown), PrismJS (syntax highlighting), Mermaid (diagrams), DOMPurify (sanitization) |
| **Testing** | Jest, React Testing Library, MSW (mock API), jest-websocket-mock |
| **Build** | Create React App, Babel |
| **Deployment** | Docker multi-stage (Node build + Nginx), S3 for media storage |

## Architecture

```
src/
├── components/          # 35+ React components
│   ├── Main.js          # Root orchestrator - session management, API routing
│   ├── ChatWindow.js    # Message display with auto-scroll
│   ├── ChatMessage.js   # Rich message rendering (markdown, code, images)
│   ├── ChatCharacters.js # AI persona selection grid
│   ├── Sidebar.js       # Session history with infinite scroll & search
│   ├── TopMenu.js       # Model selector, session tabs
│   ├── BottomToolsMenu.js # Input area, attachments, voice controls
│   ├── options/         # Settings panels (text, image, TTS, speech)
│   ├── health/          # Garmin integration with 13+ chart components
│   └── Visualization/   # Chart and diagram renderers
├── hooks/               # 7 custom hooks (chat API, sessions, settings, debounce)
├── services/            # API layer - REST, WebSocket streaming, auth (2500+ lines)
└── utils/               # Configuration (50+ settings), streaming, audio, image utils
```

**Data flow:** User input flows through `useChatAPI` hook to `CallChatAPI` service, which handles optimistic UI updates, WebSocket streaming with chunk callbacks, and database synchronization - all while rendering AI responses in real-time.

## Running Locally

**Prerequisites:** Node 18+, npm 8+

```bash
cd storage-react
npm install
npm start         # Dev server on http://localhost:3000
```

**Testing:**
```bash
npm test          # Jest watch mode
npm run test:ci   # Single run (CI)
```

**Docker (production):**
```bash
docker build -f Dockerfile.prod -t betterai-web .
docker run -p 80:80 betterai-web
```

## Configuration

48 user-configurable settings stored in localStorage, organized by category:

- **Text** - Model, temperature, memory size, reasoning, streaming, web search
- **Image** - Model (DALL-E/Flux/SD), size, quality, guidance scale
- **TTS** - Voice, speed, stability, similarity boost
- **Speech** - Language, model, temperature, sample rate

## Project Status

**Legacy / Archived** - This React web app served as the primary frontend for the BetterAI platform. It has been replaced by a React Native cross-platform app. The codebase is maintained here as a portfolio reference and for historical context.

## License

This project is for portfolio/demonstration purposes.
