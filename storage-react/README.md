# BetterAI React Frontend

This package hosts the chat frontend that powers the BetterAI web client. It is a Create React App (CRA) project with a custom state provider, REST/WebSocket bridges, and a suite of MSW-backed tests.

## Prerequisites

- Node 18+
- npm 8+

Install dependencies from the component root:

```bash
npm install
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm start` | Launches the CRA dev server on <http://localhost:3000>. |
| `npm run build` | Builds the production bundle into `build/`. |
| `npm test` | Starts Jest in interactive watch mode. |
| `npm run test:ci` | Runs Jest once with `--watch=false`; used by CI. |

## Testing Toolkit

The testing environment is configured in `src/setupTests.js` and includes:

- **Mock Service Worker (MSW)** via a shared server in `src/test/server.js` for deterministic REST fixtures.
- **`jest-websocket-mock`** helpers exposed through `global.createMockWebSocketServer` for streaming workflows.
- **Configuration fixtures** with `createTestConfiguration()` that prime every localStorage-backed getter and authenticated routes.
- **`renderWithProviders`** helper to mount components inside `StateContextProvider` and a memory router without repeating boilerplate.

### Writing Tests

```js
import { renderWithProviders } from './test/utils';
import { server, rest } from './test/server';

server.use(
  rest.get('/api/v1/example', (req, res, ctx) => res(ctx.json({ success: true, data: {} })))
);

const { getByText } = renderWithProviders(<ExampleComponent />);
```

- Use `createTestConfiguration({ overrides })` inside tests to customise seeded values.
- Call `server.use(...)` within individual tests to override default MSW handlers.
- Use `createMockWebSocketServer(url)` to stand up a fake WebSocket server and assert streaming payloads.

### Running Tests in CI

The CI workflow executes `npm run test:ci`, which maps to `npm test -- --watch=false`. Local developers can run the same command to mimic pipeline behaviour and generate coverage reports.

## Authenticated Routes in Tests

`createTestConfiguration()` seeds `localStorage.authToken` with a non-expired token and syncs `auth_token_for_backend`. Components that rely on authenticated routing (`<App />`) render the main shell automatically in tests without invoking the actual login form.

## Folder Structure Highlights

- `src/components/StateContextProvider.js` – global chat/session state provider used by most components.
- `src/services/` – REST helpers (`api.service.js`, `api.methods.js`) and WebSocket orchestrators.
- `src/hooks/useSettings.js` – composes configuration payloads consumed by backend calls.
- `src/test/` – testing fixtures (`server.js`, utilities) used by Jest suites.

Refer to `DocumentationApp/MILESTONE-06-REACT-TESTING-FOUNDATIONS.md` for the broader testing roadmap.
