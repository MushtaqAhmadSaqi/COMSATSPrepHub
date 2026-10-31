import React, { useState, useEffect } from 'react';

/**
 * OfflineBanner — Displays a friendly, non-intrusive banner when the device loses network connectivity.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        width: '100%',
        padding: '0.5rem 1rem',
        fontSize: '0.85rem',
        fontWeight: 600,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        zIndex: 9999,
        background: isOffline ? '#ef4444' : '#10b981',
        color: '#ffffff',
        transition: 'all 0.3s ease'
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">
        {isOffline ? 'wifi_off' : 'wifi'}
      </span>
      <span>
        {isOffline
          ? 'You are currently offline. Viewing cached content where available.'
          : 'Network connection restored. Back online!'}
      </span>
    </div>
  );
}

