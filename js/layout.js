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
  const initial = userName ? userName.charAt(0).toUpperCase() : '?';

  const header = document.createElement('header');
  header.className = 'sticky top-0 z-50 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 transition-all duration-300';
  header.innerHTML = `
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          
          <!-- Logo -->
          <a href="index.html" class="flex items-center gap-3 group">
            <div class="w-10 h-10 rounded-2xl bg-[#2563eb] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <span class="text-white font-black text-2xl">C</span>
            </div>
            <span class="font-black text-2xl tracking-tighter text-[#1e293b] dark:text-white">COMSATSPrepHub</span>
          </a>

          <!-- Center: Pill Navigation -->
          <nav class="hidden md:flex items-center bg-[#f8fafc] dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-1 shadow-inner">
            <a href="index.html" class="px-6 py-2 text-sm font-semibold rounded-3xl transition-all ${currentPage === 'index.html' ? 'active-pill shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-[#1e293b] dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}">
              Home
            </a>
            <a href="subjects.html" class="px-6 py-2 text-sm font-semibold rounded-3xl transition-all ${currentPage === 'subjects.html' ? 'active-pill shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-[#1e293b] dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}">
              Subjects
            </a>
            <a href="quiz.html" class="px-6 py-2 text-sm font-semibold rounded-3xl transition-all ${currentPage === 'quiz.html' ? 'active-pill shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-[#1e293b] dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}">
              Quiz
            </a>
            <a href="about-us.html" class="px-6 py-2 text-sm font-semibold rounded-3xl transition-all ${currentPage === 'about-us.html' ? 'active-pill shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-[#1e293b] dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}">
              Team
            </a>
          </nav>

          <!-- Right Side -->
          <div class="flex items-center gap-3">
            
            <!-- Dark Mode Toggle -->
            <button id="dark-mode-toggle"
                    class="p-2.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-gray-600 dark:text-gray-400 hover:text-[#1e293b] dark:hover:text-white"
                    aria-label="Toggle dark mode">
              <span id="dark-mode-icon" class="block w-5 h-5 flex items-center justify-center"></span>
            </button>

            <!-- Auth Section -->
            <button id="open-auth-modal" 
                    class="flex items-center gap-2 bg-[#1e293b] dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-[#1e293b] px-6 py-2.5 rounded-3xl text-sm font-bold transition-all active:scale-95 shadow-sm">
              ${isLoggedIn ? `
                <div class="w-6 h-6 rounded-lg bg-[#2563eb] flex items-center justify-center text-[10px] text-white ring-1 ring-white/30 hidden sm:flex">${initial}</div>
                <span>Dashboard</span>
              ` : `
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Sign In</span>
              `}
            </button>

            <!-- Mobile Menu -->
            <button class="md:hidden p-2 text-gray-600 dark:text-gray-400" aria-label="Menu">
              <span class="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </div>
    `;
  document.body.prepend(header);
}

// ── Footer ────────────────────────────────────────────────────────────────────
function _injectFooter() {
  if (document.querySelector('footer')) return;

  const footer = document.createElement('footer');
  footer.className = 'bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-white/5 py-8 px-6 transition-colors duration-300 rounded-t-[3rem] mt-auto';
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
