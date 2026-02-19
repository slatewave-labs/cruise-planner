// --- Device Identity ---

const DEVICE_ID_KEY = 'app_device_id';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// --- Error Message Extraction ---

/**
 * Extracts a user-friendly error message from an API error response.
 * Handles both structured error objects and plain string errors.
 * 
 * @param {Error} error - The error object from axios
 * @returns {string} - A user-friendly error message
 */
export function getErrorMessage(error) {
  const detail = error.response?.data?.detail;
  
  // If detail is a structured error object with a message field
  if (detail && typeof detail === 'object' && detail.message && detail.message.trim()) {
    return detail.message;
  }
  
  // If detail is a plain string
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  
  // Fallback to error.message or generic message
  return error.message || 'An unexpected error occurred. Please try again.';
}
