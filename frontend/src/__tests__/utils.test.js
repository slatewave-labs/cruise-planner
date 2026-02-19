/**
 * Unit tests for utility functions in utils.js
 * Tests device ID generation and error message extraction
 */
import { getDeviceId, getErrorMessage } from '../utils';

// Local store for these tests
let testStore = {};

describe('Device ID Utils', () => {
  beforeEach(() => {
    testStore = {};
    jest.clearAllMocks();

    // Inject local implementation
    localStorage.getItem.mockImplementation((key) => testStore[key] || null);
    localStorage.setItem.mockImplementation((key, value) => {
      testStore[key] = value.toString();
    });
    localStorage.removeItem.mockImplementation((key) => {
      delete testStore[key];
    });
    localStorage.clear.mockImplementation(() => {
      testStore = {};
    });
  });

  test('getDeviceId generates new ID if none exists', () => {
    const id = getDeviceId();

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(localStorage.setItem).toHaveBeenCalledWith('app_device_id', id);
  });

  test('getDeviceId returns existing ID if present', () => {
    const existingId = 'existing-device-id';
    testStore['app_device_id'] = existingId;

    const id = getDeviceId();

    expect(id).toBe(existingId);
  });

  test('getDeviceId returns same ID on multiple calls', () => {
    const id1 = getDeviceId();
    const id2 = getDeviceId();

    expect(id1).toBe(id2);
  });
});

describe('Error Message Utils', () => {
  test('extracts message from structured error object', () => {
    const error = {
      response: {
        data: {
          detail: {
            message: 'Structured error message',
            error: 'error_code',
          },
        },
      },
    };

    const message = getErrorMessage(error);
    expect(message).toBe('Structured error message');
  });

  test('extracts message from plain string detail', () => {
    const error = {
      response: {
        data: {
          detail: 'Plain string error',
        },
      },
    };

    const message = getErrorMessage(error);
    expect(message).toBe('Plain string error');
  });

  test('returns error.message as fallback', () => {
    const error = {
      message: 'Network error occurred',
    };

    const message = getErrorMessage(error);
    expect(message).toBe('Network error occurred');
  });

  test('returns generic message if no error info available', () => {
    const error = {};

    const message = getErrorMessage(error);
    expect(message).toBe('An unexpected error occurred. Please try again.');
  });

  test('ignores empty string in detail.message', () => {
    const error = {
      response: {
        data: {
          detail: {
            message: '   ',
            error: 'error_code',
          },
        },
      },
      message: 'Fallback message',
    };

    const message = getErrorMessage(error);
    expect(message).toBe('Fallback message');
  });
});