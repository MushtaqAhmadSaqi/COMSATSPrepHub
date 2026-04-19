/**
 * js/layout.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Injects the shared Header, Footer, and Mobile Bottom Nav into every page.
 * Also handles: session-aware nav button, AOS init, mobile scroll hide/show,
 * and swipe navigation.
 *
 * Usage (add to each HTML page before closing </body>):
 *   <script type="module" src="js/layout.js"></script>
 */

import { auth } from './core.js';
import { initAuthModal, openModal } from './auth-ui.js';

// ── Page Config ───────────────────────────────────────────────────────────────
// Each page declares its active route by setting data-page on <body>.
// e.g. <body data-page="subjects.html">

const ROUTES = ['index.html', 'subjects.html', 'quiz.html', 'about-us.html'];

// ── Entry Point ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const session = await auth.getSession();
  const userName = session ? auth.getUserName(session.user) : null;
  const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  _injectHeader(currentPage, session, userName);
  _injectFooter();
  _injectMobileNav(currentPage);
  _wireNavButton(session, userName);
  if (!session) initAuthModal();
  _initSwipeNav(currentPage);
  _initScrollHideNav();
  _initAOS();
});

// ── Header ────────────────────────────────────────────────────────────────────
function _injectHeader(currentPage, session, userName) {
  if (document.querySelector('header')) return;

  const isLoggedIn = !!session;
  const btnLabel = isLoggedIn 
    ? `<span class="material-symbols-outlined text-[17px]">dashboard</span><span class="hidden sm:inline">${userName}</span>` 
    : `<span class="material-symbols-outlined text-[17px]">person</span><span class="hidden sm:inline">Sign In</span>`;

  const header = document.createElement('header');
  header.className = 'navbar sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 transition-all duration-300';
  header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <!-- Logo -->
        <a href="index.html" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-sm group-hover:scale-105 transition-transform">C</div>
          <span class="font-black text-lg tracking-tight text-[#1a1a2e] dark:text-white">COMSATSPrepHub</span>
        </a>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-8">
          <a href="index.html" class="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors ${currentPage === 'index.html' ? 'text-primary dark:text-primary' : ''}">Home</a>
          <a href="subjects.html" class="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors ${currentPage === 'subjects.html' ? 'text-primary dark:text-primary' : ''}">Subjects</a>
          <a href="quiz.html" class="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors ${currentPage === 'quiz.html' ? 'text-primary dark:text-primary' : ''}">Quiz</a>
          <a href="about-us.html" class="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors ${currentPage === 'about-us.html' ? 'text-primary dark:text-primary' : ''}">Team</a>
        </nav>

        <!-- Right Actions -->
        <div class="flex items-center gap-2 sm:gap-4">
          <!-- Dark Mode Toggle -->
          <button id="dark-mode-toggle"
                  class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-95 text-gray-600 dark:text-gray-300"
                  aria-label="Toggle dark mode">
            <span id="dark-mode-icon" class="block w-5 h-5 flex items-center justify-center"></span>
          </button>

          <!-- Auth/Dashboard -->
          <button id="open-auth-modal" 
                  class="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-all shadow-sm">
            ${btnLabel}
          </button>

          <!-- Mobile Menu trigger (conceptual) -->
          <button class="md:hidden p-2 text-gray-500" aria-label="Menu">
            <span class="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>
    `;
  document.body.prepend(header);
}

// ── Footer ────────────────────────────────────────────────────────────────────
function _injectFooter() {
  if (document.querySelector('footer')) return;

  const footer = document.createElement('footer');
  footer.className = 'bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-white/5 py-8 px-6 transition-colors duration-300';
  footer.innerHTML = `
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
          <div class="font-black text-lg tracking-tight text-[#1a1a2e] dark:text-white mb-1">COMSATSPrepHub</div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Master your academic journey with verified resources.</p>
        </div>
        <div class="flex flex-wrap justify-center gap-6 md:gap-10">
          <a href="about-us.html" class="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">About Us</a>
          <a href="terms.html"    class="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">Terms</a>
          <a href="https://github.com/MushtaqAhmadSaqi" target="_blank" class="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">Github</a>
        </div>
        <div class="text-[10px] font-medium text-gray-400 dark:text-gray-500 italic uppercase tracking-wider">
          Made with care by Mushtaq Ahmad Saqi
        </div>
      </div>
    `;
  document.body.appendChild(footer);
}

// ── Mobile Bottom Nav ─────────────────────────────────────────────────────────
function _injectMobileNav(currentPage) {
  if (document.getElementById('mobileBottomNav')) return; // already exists

  const nav = document.createElement('nav');
  nav.id = 'mobileBottomNav';
  nav.className = 'mobile-nav-shell md:hidden';

  const items = [
    { route: 'index.html', icon: 'home', label: 'Home' },
    { route: 'subjects.html', icon: 'menu_book', label: 'Subjects' },
    { route: 'quiz.html', icon: 'quiz', label: 'Quiz' },
    { route: 'about-us.html', icon: 'groups', label: 'Team' },
  ];

  nav.innerHTML = `
      <div class="mobile-nav-grid">
        ${items.map(item => `
          <a href="${item.route}" data-route="${item.route}"
             class="mobile-nav-item ${currentPage === item.route ? 'active' : ''}"
             aria-label="Go to ${item.label}">
            <span class="material-symbols-outlined"
              style="${currentPage === item.route ? "font-variation-settings:'FILL' 1" : ''}">${item.icon}</span>
            <span class="label">${item.label}</span>
          </a>
        `).join('')}
      </div>
    `;
  document.body.appendChild(nav);
}

// ── Wire Nav Auth Button ──────────────────────────────────────────────────────
function _wireNavButton(session, userName) {
  const btn = document.getElementById('open-auth-modal');
  if (!btn) return;

  if (session) {
    btn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });
  } else {
    btn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  }
}

// ── Swipe Navigation ──────────────────────────────────────────────────────────
function _initSwipeNav(currentPage) {
  const main = document.querySelector('main');
  if (!main) return;

  let touchStartX = 0;
  let touchStartY = 0;

  main.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; if (!t) return;
    touchStartX = t.clientX; touchStartY = t.clientY;
  }, { passive: true });

  main.addEventListener('touchend', e => {
    const t = e.changedTouches[0]; if (!t) return;
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) < 58 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;

    const idx = ROUTES.findIndex(r => r.toLowerCase() === currentPage);
    const safeIdx = Math.max(0, Math.min((idx < 0 ? 0 : idx) + (dx < 0 ? 1 : -1), ROUTES.length - 1));
    if (safeIdx !== idx) window.location.href = ROUTES[safeIdx];
  }, { passive: true });
}

// ── Scroll Hide/Show Mobile Nav ───────────────────────────────────────────────
function _initScrollHideNav() {
  let lastScrollY = window.scrollY;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    window.requestAnimationFrame(() => {
      const nav = document.getElementById('mobileBottomNav');
      const header = document.querySelector('header');
      const curr = window.scrollY;

      // Only act if there is a real change in scroll position
      if (Math.abs(curr - lastScrollY) <= 5) {
        ticking = false;
        return;
      }

      // Hide/Show Mobile Nav
      if (nav) {
        if (curr > lastScrollY && curr > 60) {
          nav.classList.add('nav-hidden');
        } else if (curr < lastScrollY) {
          nav.classList.remove('nav-hidden');
        }
      }

      // Hide/Show Top Header
      if (header) {
        if (curr > lastScrollY && curr > 80) {
          header.classList.add('header-hidden');
        } else if (curr < lastScrollY) {
          header.classList.remove('header-hidden');
        }
      }

      lastScrollY = curr;
      ticking = false;
    });
    ticking = true;
  }, { passive: true });
}

// ── AOS Init ──────────────────────────────────────────────────────────────────
function _initAOS() {
  if (window.AOS) AOS.init({ once: true, offset: 50, duration: 750, easing: 'ease-out-cubic' });
}
