# storage-react Agent Guide

## Scope & Environment
- Operate only inside `docker/storage-react/` unless explicitly asked otherwise.
- React app bootstrapped with CRA; use `npm start`, `npm test`, `npm run build` from this directory.
- Node version from container is fine; dependencies managed via `package.json` / `package-lock.json`.
- Never commit `node_modules/` or generated build artifacts.

## High-Level Architecture
- Entry point: `src/index.js` renders `<App />` inside `<React.StrictMode>`.
- Routing in `src/App.js` with React Router v6; authenticated routes render `<Main />`, plus standalone routes for health, garmin, image center, wanderer demos, vibes demos, privacy, terms, blood tests.
- Global state via `components/StateContextProvider.js`; wraps router in `App.js` and exposes chat/session/UI flags.
- API configuration and user settings under `src/config.js` and `src/utils/configuration.js` (localStorage-backed getters/setters for text/image/tts/etc).

## State & Hooks
- `StateContextProvider` owns chat sessions array, UI toggles, loading flags, refs (`chatContentRef`, `currentSessionIndexRef`, `endOfMessagesRef`, `isAtBottomRef`); update state through provided setters to keep refs in sync.
- `useChatAPI` orchestrates sending chat requests; expects an up-to-date `chatContentSnapshot` copy and uses `CallChatAPI` service. Ensure `currentSessionIndexRef` reflects the active tab before invoking.
- Fetch helpers:
  - `useFetchChatContent(sessionId, index)` populates messages for a specific session and normalizes message shape.
  - `useFetchChatSessions` paginates sidebar sessions/search, handles optional date filters and tags.
  - `useCurrentSession*` selectors derive current session data without forcing rerenders.
  - `useSettings` composes payload for API requests from `configuration.js` getters; include updated character name before calling APIs.
- Debounce utilities live in `hooks/useDebounce.js`; use when wiring search inputs.

## Networking Layer
- HTTP calls go through `services/api.service.js` (`makeApiCall` wrapper). Always pass fully qualified endpoint from `config.apiEndpoint`; `auth.header.js` injects backend JWT.
- High-level request helpers in `services/api.methods.js`:
  - `triggerAPIRequest(basePath, provider, action, body, getSettings)` builds REST calls using action-to-route map and customer_id injection.
  - Utility helpers convert camelCase ↔ snake_case, prepare bodies for messages/sessions/prompts.
  - `prepareChatHistoryForDB` formats chat history for persistence; reuse when updating DB payloads.
- Streaming/WebSockets in `services/api.websocket.js`:
  - `triggerStreamingWSRequest` handles handshake, payload dispatch, lifecycle callbacks for text/audio modes.
  - `triggerStreamingWSTextRequest` wraps it for chat text streams (auto-attaches settings, images/files).
  - `prepareFinalUserInput` (inside module) and utilities in `utils/streamingUtils.js` mirror Android behavior; update both if payload contracts change.
- `services/call.chat.api.js` is the central orchestrator for sending messages:
  - Mutates a snapshot of chat content, appends placeholders, triggers HTTP or WS streaming based on `getUseWebsockets()`.
  - Handles regenerate/edit flows, chunk buffering, auto image attach events, DB updates. Maintain separation between optimistic UI updates (`setChatContent`) and backend confirmations (`updateSessionInDB`).

## UI Composition
- Chat shell (`components/Main.js`) wires context state with UI widgets: `TopMenu`, `Sidebar`, `ChatWindow`, `BottomToolsMenu`, and `ProgressIndicator`.
  - Session navigation updates URL via React Router; keep `shouldSkipSessionFetching` semantics intact when switching sessions vs. sidebar loads.
  - `handleSendClick` enforces model/attachment compatibility and delegates to `useChatAPI`.
- `ChatWindow.js` renders messages, character selection, scroll management, and fetches session content on mount. Respect `isAtBottomRef` logic when adding new auto-scroll behaviors.
- Message rendering lives in `ChatMessage.js` (handles context menus, regenerate, attachments) with supporting components in `components/css/` for styling.
- Options panels under `components/options/` adjust text/image/tts/speech settings; they rely on configuration getters/setters—update both UI and config helpers when adding fields.
- Additional feature areas:
  - `components/health/` integrates Garmin/health visualizations (chart.js, data transforms in `utils/health.data.process.js`).
  - `components/vibes/` hosts demo layouts with nested routing (`VibesLayout`, `Demo1`, `Demo2`).
  - `components/Wanderer*` provide map/blog examples (Leaflet map data in `WandererExampleMapData.js`).
  - `components/ImageCenter.js` manages generated image gallery interactions.
- Shared visual assets: SVG icon helpers in `utils/svg.icons.provider.js`, CSS modules under `components/css/` and nested feature directories.

## Utilities & Helpers
- `utils/misc.js` includes formatting helpers like `formatDate`, random ID generators; reuse rather than reinvent.
- `utils/image.utils.js` handles browser image compression/previews for uploads.
- Audio recording features live in `utils/audio.recording.js` (handles `MediaRecorder`, sample rate conversions).
- Color helpers, configuration toggles, and streaming utilities are centralized—search here before modifying component-level logic.

## Authentication & Persistence
- `components/Login.js` performs basic username/password auth; stores `{ token, expiration }` under `localStorage.authToken`. `App.js` checks validity on load. Keep storage key consistent with backend expectations.
- `auth.header.js` reads backend token (via configuration) and attaches `Authorization` header to REST calls.
- Session persistence with backend uses `updateSessionInDB`, `prepareChatHistoryForDB`, and `updateSessionName` helpers. Maintain DB payload structure when adding fields.

## Styling & Assets
- Global styles in `src/index.css` and `App.css`; component-specific styles under `components/css/` and nested folders (e.g., `components/vibes/css/`).
- Follow existing BEM-like class names; avoid introducing CSS frameworks.
- Static assets reside in `public/` (`imgs/`, manifest, icons). Keep CRA asset import conventions.

## Testing & Tooling
- Default CRA testing via `react-scripts test`; existing `App.test.js` is placeholder. Add component/unit tests with React Testing Library when feasible.
- No ESLint custom config beyond CRA defaults; prefer `npm run lint` via `react-scripts` if needed (or run `npx eslint` manually when adding rules).
- For integration with backend, rely on `.env`/localStorage flags. Use `setURLForAPICalls` (from `utils/configuration`) to sync API base URL before requests.

## Code Reuse

**Before implementing, search for existing similar code first.** If found, challenge the approach and suggest extending it. Prefer extending existing functions/components over creating new ones. Be proactive - minimal code is the goal.

## Implementation Tips
- Always clone `chatContent` before mutation when passing into services to keep React state updates predictable.
- Keep `chatContentRef` updated whenever you mutate `chatContent`; provider already syncs via `useEffect`—avoid bypassing `setChatContent`.
- When introducing new state in `StateContextProvider`, expose both state and setter in provider value to keep consumers consistent.
- When adding API actions, extend `CHAT_ACTION_ROUTES` in `api.methods.js` and add corresponding `prepare*Body` helper if payload differs.
- Ensure websocket features gracefully fall back when `getUseWebsockets()` is false; maintain parity between streaming and non-streaming flows.
- Respect separation between authenticated routes and public routes in `App.js`; update login redirect logic when adding new protected pages.
- Keep documentation lean and update this file when architectural changes occur.
