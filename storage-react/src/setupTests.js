import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, WritableStream, TransformStream } from 'stream/web';
import WS from 'jest-websocket-mock';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream;
}

if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = WritableStream;
}

if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = TransformStream;
}

const { server } = require('./test/server');
const { createTestConfiguration, clearTestConfiguration } = require('./test/utils');

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  jest.clearAllMocks();
  createTestConfiguration();
});

afterEach(() => {
  server.resetHandlers();
  WS.clean();
  clearTestConfiguration();
});

afterAll(() => {
  try {
    server.close();
  } catch (error) {
    // Ignore disposal errors caused by upstream polyfills in test environments
  }
});

globalThis.createMockWebSocketServer = (url, options) => new WS(url, options);
globalThis.mockServer = server;
