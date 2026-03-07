import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { prefetchApiData } from './apiCache';
import api from './api';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline asset caching
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    // New version available — activate immediately so the next page load uses it.
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  },
});

// Prefetch cacheable API data so it's available offline
const backendUrl = process.env.REACT_APP_BACKEND_URL;
if (backendUrl) {
  prefetchApiData(api, backendUrl);
}
