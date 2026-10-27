import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA Service Worker in production for offline app-shell & paper caching
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  import.meta.env?.PROD
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration is a progressive enhancement
    });
  });
}
