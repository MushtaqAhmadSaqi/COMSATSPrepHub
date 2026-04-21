/**
 * js/dark-mode.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared theme engine for the whole project.
 *
 * Improvements:
 * - one storage key for all pages
 * - supports both old and new toggle button IDs
 * - dispatches a custom event when theme changes
 * - syncs icons automatically
 * - handles system theme changes safely
 * - avoids theme flicker as early as possible
 */

(function () {
  const THEME_KEY = 'comsats_theme';
  const HTML = document.documentElement;
  const DARK_CLASS = 'dark';
  const MEDIA_QUERY = '(prefers-color-scheme: dark)';
  const media = window.matchMedia(MEDIA_QUERY);

  function normalizeTheme(value) {
    return value === 'dark' ? 'dark' : 'light';
  }

  function getStoredTheme() {
    const value = localStorage.getItem(THEME_KEY);
    if (!value) return null;
    return normalizeTheme(value);
  }

  function getSystemTheme() {
    return media.matches ? 'dark' : 'light';
  }

  function getPreferredTheme() {
    return getStoredTheme() || getSystemTheme();
  }

  function isDarkTheme(theme) {
    return normalizeTheme(theme) === 'dark';
  }

  function setHtmlTheme(theme) {
    if (isDarkTheme(theme)) {
      HTML.classList.add(DARK_CLASS);
    } else {
      HTML.classList.remove(DARK_CLASS);
    }
  }

  function getThemeIconMarkup(theme) {
    const dark = isDarkTheme(theme);

    if (dark) {
      // Sun icon when dark mode is active
      return `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      `;
    }

    // Moon icon when light mode is active
    return `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    `;
  }

  function getToggleTargets() {
    return document.querySelectorAll(
      [
        '#dark-mode-icon',
        '.dark-mode-icon',
        '#darkToggle',
        '[data-theme-icon]'
      ].join(',')
    );
  }

  function updateToggleIcons(theme) {
    const targets = getToggleTargets();
    if (!targets.length) return;

    targets.forEach(target => {
      const useEmoji = target.id === 'darkToggle' || target.dataset.themeIcon === 'emoji';

      if (useEmoji) {
        target.textContent = isDarkTheme(theme) ? '☀️' : '🌙';
      } else {
        target.innerHTML = getThemeIconMarkup(theme);
      }
    });
  }

  function updateToggleLabels(theme) {
    const buttons = document.querySelectorAll(
      [
        '#dark-mode-toggle',
        '#darkToggle',
        '[data-theme-toggle]'
      ].join(',')
    );

    buttons.forEach(button => {
      const nextLabel = isDarkTheme(theme) ? 'Switch to light mode' : 'Switch to dark mode';
      button.setAttribute('aria-label', nextLabel);
      button.setAttribute('title', nextLabel);
      button.setAttribute('data-current-theme', normalizeTheme(theme));
    });
  }

  function dispatchThemeChange(theme) {
    document.dispatchEvent(
      new CustomEvent('comsatsprephub:themechange', {
        detail: {
          theme: normalizeTheme(theme),
          isDark: isDarkTheme(theme)
        }
      })
    );
  }

  function applyTheme(theme, options = {}) {
    const normalized = normalizeTheme(theme);
    const { persist = true, dispatch = true } = options;

    setHtmlTheme(normalized);

    if (persist) {
      localStorage.setItem(THEME_KEY, normalized);
    }

    updateToggleIcons(normalized);
    updateToggleLabels(normalized);

    if (dispatch) {
      dispatchThemeChange(normalized);
    }

    return normalized;
  }

  function setTheme(theme) {
    return applyTheme(theme, { persist: true, dispatch: true });
  }

  function toggleTheme() {
    const current = HTML.classList.contains(DARK_CLASS) ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    return setTheme(next);
  }

  function refreshThemeIcons() {
    const current = HTML.classList.contains(DARK_CLASS) ? 'dark' : 'light';
    updateToggleIcons(current);
    updateToggleLabels(current);
  }

  function clearStoredTheme() {
    localStorage.removeItem(THEME_KEY);
    const theme = getSystemTheme();
    applyTheme(theme, { persist: false, dispatch: true });
    return theme;
  }

  function handleToggleClick(event) {
    const button = event.target.closest(
      '#dark-mode-toggle, #darkToggle, [data-theme-toggle]'
    );

    if (!button) return;

    toggleTheme();
  }

  function handleSystemThemeChange(event) {
    // Only auto-follow system when user has not manually selected a theme
    if (getStoredTheme()) return;

    applyTheme(event.matches ? 'dark' : 'light', {
      persist: false,
      dispatch: true
    });
  }

  function bindEvents() {
    document.addEventListener('click', handleToggleClick);

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleSystemThemeChange);
    } else if (typeof media.addListener === 'function') {
      // older browser fallback
      media.addListener(handleSystemThemeChange);
    }
  }

  function init() {
    applyTheme(getPreferredTheme(), {
      persist: !!getStoredTheme(),
      dispatch: false
    });

    bindEvents();
    refreshThemeIcons();
  }

  // Expose stable global API for pages that need it
  window.getPreferredTheme = getPreferredTheme;
  window.setAppTheme = setTheme;
  window.toggleDarkMode = toggleTheme;
  window.refreshThemeIcons = refreshThemeIcons;
  window.clearStoredThemePreference = clearStoredTheme;

  // Apply as early as possible to reduce flash
  if (isDarkTheme(getPreferredTheme())) {
    HTML.classList.add(DARK_CLASS);
  } else {
    HTML.classList.remove(DARK_CLASS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
