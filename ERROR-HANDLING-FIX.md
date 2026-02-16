# Error Handling Fix - February 2026

## Issue
When the backend returned structured error responses (objects with keys like `error`, `message`, `troubleshooting`, `retry_after`), the frontend would crash with a React error:

```
ERROR
Objects are not valid as a React child (found: object with keys {error, message, troubleshooting, retry_after})
```

This occurred specifically when `POST /api/plans/generate` returned a 503 error with a structured error body.

## Root Cause
The frontend was attempting to render the error object directly in JSX without extracting the message string:

```javascript
// Before (PortPlanner.js)
catch (err) {
  const detail = err.response?.data?.detail || err.message;
  setError(detail);  // detail could be an object!
}

// Later in the component:
<p className="text-sm text-red-600">{error}</p>  // React can't render objects!
```

## Solution
Created a centralized `getErrorMessage()` utility function in `utils.js` that:
1. Checks if the error detail is a structured object with a `message` field
2. Extracts the message string if available
3. Falls back to plain string errors or generic messages
4. Handles edge cases (null, undefined, empty strings)

### Files Changed
1. **frontend/src/utils.js**
   - Added `getErrorMessage()` utility function
   - Comprehensive error handling for all error response formats

2. **frontend/src/pages/PortPlanner.js**
   - Updated to use `getErrorMessage()` instead of raw error objects
   - Error state now always contains a string

3. **frontend/src/pages/TripSetup.js**
   - Updated alert messages to use `getErrorMessage()`
   - Consistent error handling across the app

4. **frontend/src/pages/DayPlanView.js**
   - Updated alert messages to use `getErrorMessage()`

5. **frontend/src/__tests__/getErrorMessage.test.js** (new file)
   - Comprehensive test suite for error message extraction
   - Covers all edge cases (structured errors, string errors, nulls, etc.)

## Testing
- ✅ All existing tests pass
- ✅ New unit tests added for `getErrorMessage()` utility
- ✅ Tested with structured error responses
- ✅ Tested with plain string errors
- ✅ Tested with missing/null errors
- ✅ Tested with empty strings

## Backend Error Format
The backend sends structured errors in this format:

```json
{
  "detail": {
    "error": "ai_service_quota_exceeded",
    "message": "The AI service has reached its usage quota. This is temporary - please try again in a few minutes.",
    "troubleshooting": "Administrators: Check your Google Cloud Console for API quotas and billing status.",
    "retry_after": 300
  }
}
```

The frontend now correctly extracts just the `message` field for display to users.

## Future Considerations
- Could optionally display the `troubleshooting` message to users if needed
- Could use `retry_after` to implement automatic retry logic
- Could use `error` code for more specific error handling (e.g., different UI for quota vs authentication errors)
