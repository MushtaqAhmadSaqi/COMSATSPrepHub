const CONSENT_KEY = 'pph_analytics_consent';
let gaInitialized = false;
let gaMeasurementId = '';
let gaScriptEl = null;

export function getAnalyticsConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export function disableAnalytics() {
  if (typeof window === 'undefined') return;
  if (gaMeasurementId) {
    window[`ga-disable-${gaMeasurementId}`] = true;
  }
  if (gaScriptEl?.parentNode) {
    gaScriptEl.parentNode.removeChild(gaScriptEl);
  }
  gaScriptEl = null;
  gaInitialized = false;
}

export function setAnalyticsConsent(status) {
  try {
    if (status === null) {
      localStorage.removeItem(CONSENT_KEY);
    } else {
      localStorage.setItem(CONSENT_KEY, status);
    }
  } catch {
    // ignore storage errors
  }

  if (status === 'accepted') {
    initConsentGatedAnalytics();
  } else {
    disableAnalytics();
  }
}

export function initConsentGatedAnalytics() {
  if (typeof window === 'undefined' || gaInitialized) return;
  if (navigator.doNotTrack === '1') return;
  if (getAnalyticsConsent() !== 'accepted') return;

  const measurementId = String(import.meta.env?.VITE_GA_MEASUREMENT_ID || '').trim();
  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) return;

  gaInitialized = true;
  gaMeasurementId = measurementId;
  window[`ga-disable-${measurementId}`] = false;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
  gaScriptEl = script;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId, { anonymize_ip: true });
}
