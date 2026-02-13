import sherlockWebSocket, { ConnectionState, SherlockWebSocketService } from '../sherlock.websocket';

describe('SherlockWebSocketService stream_error handling', () => {
  beforeEach(() => {
    if (!global.WebSocket) {
      global.WebSocket = { OPEN: 1 };
    }
  });

  it('handles stream_error event and calls onStreamError callback', () => {
    const service = new SherlockWebSocketService();
    const mockOnStreamError = jest.fn();
    service.onStreamError = mockOnStreamError;

    // Simulate receiving a stream_error message
    const streamErrorMessage = {
      type: 'stream_error',
      data: {
        code: 'rate_limit',
        message: 'Rate limit exceeded',
        session_id: 'test-session-123',
      },
    };

    // Mock the handleMessage method call
    service.handleMessage({ data: JSON.stringify(streamErrorMessage) });

    expect(mockOnStreamError).toHaveBeenCalledWith({
      code: 'rate_limit',
      message: 'Rate limit exceeded',
      session_id: 'test-session-123',
    });
  });

  it('handles stream_error with unknown code', () => {
    const service = new SherlockWebSocketService();
    const mockOnStreamError = jest.fn();
    service.onStreamError = mockOnStreamError;

    const streamErrorMessage = {
      type: 'stream_error',
      data: {
        message: 'Something went wrong',
      },
    };

    service.handleMessage({ data: JSON.stringify(streamErrorMessage) });

    expect(mockOnStreamError).toHaveBeenCalledWith({
      code: 'unknown',
      message: 'Something went wrong',
      session_id: undefined,
    });
  });
});

describe('SherlockWebSocketService', () => {
  beforeEach(() => {
    if (!global.WebSocket) {
      global.WebSocket = { OPEN: 1 };
    }
  });

  it('sends attachments when connected', async () => {
    const service = new SherlockWebSocketService();
    service.connectionState = ConnectionState.CONNECTED;
    service.ws = { readyState: WebSocket.OPEN, send: jest.fn() };

    const attachments = {
      imageLocations: ['https://s3.test/photo.png'],
      fileLocations: ['https://s3.test/report.pdf'],
    };

    const promise = service.sendMessage('Hello', 'text', 'sherlock', attachments);

    expect(service.ws.send).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(service.ws.send.mock.calls[0][0]);
    expect(payload).toEqual({
      type: 'send_message',
      content: 'Hello',
      source: 'text',
      ai_character_name: 'sherlock',
      attachments: {
        image_locations: ['https://s3.test/photo.png'],
        file_locations: ['https://s3.test/report.pdf'],
      },
    });

    service._pendingSend.resolve({ message_id: '1', session_id: 's', queued: true });
    await expect(promise).resolves.toEqual({ message_id: '1', session_id: 's', queued: true });
  });

  it('queues attachments when offline', () => {
    const service = new SherlockWebSocketService();
    service.connectionState = ConnectionState.DISCONNECTED;

    service.sendMessage('Queued', 'text', 'bugsy', {
      imageLocations: ['https://s3.test/queued.png'],
      fileLocations: [],
    });

    expect(service.pendingMessages).toHaveLength(1);
    expect(service.pendingMessages[0]).toEqual(
      expect.objectContaining({
        content: 'Queued',
        source: 'text',
        ai_character_name: 'bugsy',
        attachments: {
          image_locations: ['https://s3.test/queued.png'],
          file_locations: [],
        },
      })
    );
  });
});

describe('sherlockWebSocket singleton', () => {
  it('flushes pending messages with attachments', async () => {
    const sendSpy = jest.spyOn(sherlockWebSocket, 'sendMessage').mockResolvedValue({
      message_id: '1',
      session_id: 's',
      queued: true,
    });

    sherlockWebSocket.pendingMessages = [
      {
        content: 'Hi',
        source: 'text',
        ai_character_name: 'sherlock',
        attachments: { image_locations: ['https://s3.test/hi.png'], file_locations: [] },
        resolve: jest.fn(),
        reject: jest.fn(),
      },
    ];

    sherlockWebSocket.flushPendingMessages();

    expect(sendSpy).toHaveBeenCalledWith(
      'Hi',
      'text',
      'sherlock',
      { image_locations: ['https://s3.test/hi.png'], file_locations: [] }
    );

    sendSpy.mockRestore();
  });
});
