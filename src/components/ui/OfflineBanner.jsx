import React, { useState, useEffect } from 'react';
import AppIcon from './AppIcon';

/**
 * OfflineBanner — Displays a friendly, non-intrusive banner when the device loses network connectivity.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    let timer;
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      timer = setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      clearTimeout(timer);
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timer);
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
        color: '#0f172a',
        transition: 'background-color 0.25s ease, color 0.25s ease'
      }}
    >
      <AppIcon name={isOffline ? 'wifi_off' : 'wifi'} size={18} />
      <span>
        {isOffline
          ? 'You are currently offline. Viewing cached content where available.'
          : 'Network connection restored. Back online!'}
      </span>
    </div>
  );
}
