import { getErrorMessage, isOffline, isNetworkError } from '../utils';

describe('getErrorMessage', () => {
  test('extracts message from structured error response', () => {
    const error = {
      response: {
        data: {
          detail: {
            error: 'ai_service_quota_exceeded',
            message: 'The AI service has reached its usage quota.',
            troubleshooting: 'Check your API quotas.',
            retry_after: 300,
          },
        },
      },
    };

    const result = getErrorMessage(error);
    expect(result).toBe('The AI service has reached its usage quota.');
  });

  test('handles plain string error response', () => {
    const error = {
      response: {
        data: {
          detail: 'Something went wrong',
        },
      },
    };

    const result = getErrorMessage(error);
    expect(result).toBe('Something went wrong');
  });

  test('falls back to error.message when detail is unavailable', () => {
    const error = {
      message: 'Network error',
    };

    const result = getErrorMessage(error);
    expect(result).toBe('Network error');
  });

  test('returns generic message when no error info is available', () => {
    const error = {};

    const result = getErrorMessage(error);
    expect(result).toBe('An unexpected error occurred. Please try again.');
  });

  test('handles null detail gracefully', () => {
    const error = {
      response: {
        data: {
          detail: null,
        },
      },
    };

    const result = getErrorMessage(error);
    expect(result).toBe('An unexpected error occurred. Please try again.');
  });

  test('handles undefined response gracefully', () => {
    const error = {
      message: 'Request failed',
    };

    const result = getErrorMessage(error);
    expect(result).toBe('Request failed');
  });

  test('handles structured error with empty message', () => {
    const error = {
      response: {
        data: {
          detail: {
            error: 'some_error',
            message: '',
          },
        },
      },
      message: 'Fallback message',
    };

    const result = getErrorMessage(error);
    // Empty string is falsy, should fall back
    expect(result).toBe('Fallback message');
  });

  test('returns offline message for network errors (no response, has request)', () => {
    const error = { request: {}, message: 'Network Error' };
    const result = getErrorMessage(error);
    expect(result).toMatch(/offline/i);
    expect(result).toMatch(/internet connection/i);
  });

  test('returns offline message for ERR_NETWORK code', () => {
    const error = { code: 'ERR_NETWORK', message: 'Network Error' };
    const result = getErrorMessage(error);
    expect(result).toMatch(/offline/i);
  });

  test('does not return offline message when response exists', () => {
    const error = {
      response: { data: { detail: 'Server error' } },
      request: {},
    };
    const result = getErrorMessage(error);
    expect(result).toBe('Server error');
  });
});

describe('isOffline', () => {
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  test('returns true when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false, writable: true, configurable: true,
    });
    expect(isOffline()).toBe(true);
  });

  test('returns false when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true, writable: true, configurable: true,
    });
    expect(isOffline()).toBe(false);
  });
});

describe('isNetworkError', () => {
  test('returns true when no response and request exists', () => {
    expect(isNetworkError({ request: {} })).toBe(true);
  });

  test('returns true for ERR_NETWORK code', () => {
    expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
  });

  test('returns false when response is present', () => {
    expect(isNetworkError({ response: { status: 500 }, request: {} })).toBe(false);
  });

  test('returns false for empty error object', () => {
    expect(isNetworkError({})).toBe(false);
  });
});
