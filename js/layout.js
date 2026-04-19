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
  // Don't inject if page already has a header (e.g. quiz.html uses its own minimal nav)
  if (document.querySelector('header')) return;

  const isLoggedIn = !!session;
  const btnLabel = isLoggedIn ? `<span class="material-symbols-outlined" style="font-size:17px;">dashboard</span>${userName}'s Dashboard` : '<span class="material-symbols-outlined" style="font-size:17px;">person</span>Sign In';

  const header = document.createElement('header');
  header.className = 'navbar navbar-dark';
  header.innerHTML = `
      <a href="index.html" class="navbar-brand flex items-center gap-2.5">
        <span class="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-sm">C</span>
        COMSATSPrepHub
      </a>
      <nav class="nav-links hidden md:flex">
        <a href="index.html"   class="nav-link ${currentPage === 'index.html' ? 'active' : ''}">Home</a>
        <a href="subjects.html" class="nav-link ${currentPage === 'subjects.html' ? 'active' : ''}">Subjects</a>
        <a href="quiz.html"    class="nav-link ${currentPage === 'quiz.html' ? 'active' : ''}">Quiz</a>
        <a href="about-us.html" class="nav-link ${currentPage === 'about-us.html' ? 'active' : ''}">Team</a>
      </nav>
      ${currentPage === 'index.html' ? `
      <div class="nav-actions">
        <button class="btn-signin-nav" id="open-auth-modal" aria-label="Open sign in or dashboard">
          ${btnLabel}
        </button>
      </div>
      ` : ''}
    `;
  document.body.prepend(header);
}

// ── Footer ────────────────────────────────────────────────────────────────────
function _injectFooter() {
  if (document.querySelector('footer')) return; // page has its own footer

  const footer = document.createElement('footer');
  footer.className = 'bg-[#1a1a2e] text-white py-4 px-6 md:px-10';
  footer.innerHTML = `
      <div class="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
        <div class="font-extrabold text-sm tracking-widest uppercase text-white">COMSATSPrepHub</div>
        <div class="flex flex-wrap justify-center gap-5 md:gap-7">
          <a href="about-us.html" class="footer-link text-sm text-white/60 hover:text-white transition-colors duration-200 no-underline">About Us</a>
          <a href="terms.html"    class="footer-link text-sm text-white/60 hover:text-white transition-colors duration-200 no-underline">Terms</a>
        </div>
        <div class="text-xs text-white/40 italic">Made with care by Mushtaq Ahmad Saqi</div>
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

      // Hide/Show Mobile Nav
      if (nav) {
        nav.classList.toggle('nav-hidden', curr > lastScrollY && curr > 60);
      }

      // Hide/Show Top Header
      if (header) {
        header.classList.toggle('header-hidden', curr > lastScrollY && curr > 80);
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
