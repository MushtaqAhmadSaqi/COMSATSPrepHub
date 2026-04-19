/**
 * js/dark-mode.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Core engine for Theme Management (Light/Dark).
 * Handles: System preference detection, localStorage persistence, 
 * CSS class toggling, and icon updates.
 */

(function() {
  const THEME_KEY = 'comsats_theme';
  const HTML = document.documentElement;
  
  // ── Theme State ────────────────────────────────────────────────────────────
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  function applyTheme(theme) {
    if (theme === 'dark') {
      HTML.classList.add('dark');
    } else {
      HTML.classList.remove('dark');
    }
    
    localStorage.setItem(THEME_KEY, theme);
    _updateToggleIcon(theme);
  }
  
  // ── UI Updates ─────────────────────────────────────────────────────────────
  function _updateToggleIcon(theme) {
    const iconContainers = document.querySelectorAll('.dark-mode-icon');
    if (iconContainers.length === 0) return;
    
    iconContainers.forEach(container => {
      if (theme === 'dark') {
        // Sun Icon for Dark Mode
        container.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        `;
      } else {
        // Moon Icon for Light Mode
        container.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        `;
      }
    });
  }
  
  // Expose actions
  window.toggleDarkMode = function() {
    const current = HTML.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  };

  window.refreshThemeIcons = function() {
    applyTheme(HTML.classList.contains('dark') ? 'dark' : 'light');
  };
  
  // ── Initialization ─────────────────────────────────────────────────────────
  function init() {
    const theme = getPreferredTheme();
    applyTheme(theme);
    
    // Wire up toggle button if it exists (or will exist via layout.js injection)
    // We use a MutationObserver or a simple event delegation for late-bound elements
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#dark-mode-toggle');
      if (btn) {
        window.toggleDarkMode();
      }
    });

    // Handle system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Run as early as possible to prevent flicker
  const theme = getPreferredTheme();
  if (theme === 'dark') HTML.classList.add('dark');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
