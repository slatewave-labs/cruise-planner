import { getErrorMessage } from '../utils';

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
});
