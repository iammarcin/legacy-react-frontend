import makeApiCall from '../api.service';

describe('makeApiCall', () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    delete global.fetch;
    consoleSpy.mockRestore();
  });

  it('sends JSON payloads and returns success responses', async () => {
    const mockJson = jest.fn().mockResolvedValue({
      success: true,
      message: 'ok',
      data: { value: 1 },
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: mockJson,
    });

    const response = await makeApiCall({
      endpoint: '/api/test',
      method: 'POST',
      body: { sample: true },
    });
    const [, requestInit] = fetch.mock.calls[0];
    expect(requestInit.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      })
    );
    expect(requestInit.body).toBe(JSON.stringify({ sample: true }));
    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({ method: 'POST' })
    );
    expect(response).toEqual({
      code: 200,
      success: true,
      message: 'ok',
      data: { value: 1 },
      meta: {},
    });
  });

  it('returns unauthorized payload when the backend responds with 401', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ success: false, message: 'Unauthorized' }),
    });

    const response = await makeApiCall({ endpoint: '/api/test', method: 'POST', body: {} });

    expect(response).toEqual({ code: 401, success: false, message: 'Unauthorized', data: null, meta: {} });
  });

  it('surface parsing errors with descriptive messaging', async () => {
    const parseError = new SyntaxError('Unexpected token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockImplementation(() => { throw parseError; }),
    });

    const response = await makeApiCall({ endpoint: '/api/test' });
    const [, getRequestInit] = fetch.mock.calls[0];
    expect(getRequestInit.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      })
    );
    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({ method: 'GET' })
    );
    expect(response).toEqual({
      code: 200,
      success: false,
      message: `Failed to parse response: ${parseError.message}`,
      data: null,
      meta: {},
    });
  });

  it('propagates network errors with status defaults', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network down'));

    const response = await makeApiCall({ endpoint: '/api/test', method: 'POST', body: { test: true } });

    expect(response).toEqual({
      code: 500,
      success: false,
      message: 'Network down',
      data: null,
      meta: {},
    });
  });
});
