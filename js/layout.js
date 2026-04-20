/**
 * js/layout.js
 * Shared Header, Footer, Mobile Nav, and auth modal boot.
 * Mobile-first performance mode:
 * - no VanillaTilt
 * - no AOS on small screens / reduced motion / save-data
 * - no scroll-hide nav animation on mobile
 * - solid surfaces on mobile instead of blur-heavy glass
 */

import { auth } from './core.js';
import { initAuthModal, openModal } from './auth-ui.js';

const MOBILE_BREAKPOINT = 768;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function saveDataEnabled() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return !!connection?.saveData;
}

function slowConnection() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return /(^|-)2g$/.test(connection?.effectiveType || '');
}

function isMobilePerfMode() {
  return window.innerWidth <= MOBILE_BREAKPOINT || prefersReducedMotion() || saveDataEnabled() || slowConnection();
}

function runIdle(callback, timeout = 1200) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    window.setTimeout(callback, 180);
  }
}

function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    if (id) script.id = id;
    script.src = src;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function stripAOSAttributes() {
  document.querySelectorAll('[data-aos]').forEach(el => {
    el.removeAttribute('data-aos');
    el.removeAttribute('data-aos-delay');
    el.removeAttribute('data-aos-duration');
    el.removeAttribute('data-aos-offset');
    el.removeAttribute('data-aos-anchor');
    el.removeAttribute('data-aos-anchor-placement');
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  // Static UI first
  _injectFooter();
  _injectMobileNav(currentPage);

  // Auth-dependent header
  const session = await auth.getSession();
  const userName = session ? auth.getUserName(session.user) : null;

  _injectHeader(currentPage, session, userName);
  _wireNavButton(session);

  if (window.refreshThemeIcons) window.refreshThemeIcons();
  initAuthModal();
  _initAOS();

  // Init behaviors AFTER header/nav exist
  _initScrollHideNav();
  _initSwipeNav(currentPage);
});

function _initAOS() {
  if (isMobilePerfMode()) {
    stripAOSAttributes();
    return;
  }

  if (!document.querySelector('[data-aos]')) return;

  const startAOS = () => {
    if (typeof window.AOS === 'undefined') return;
    window.AOS.init({
      duration: 650,
      easing: 'ease-out-cubic',
      once: true,
      offset: 36,
      disable: false
    });
  };

  if (typeof window.AOS !== 'undefined') {
    startAOS();
    return;
  }

  runIdle(async () => {
    try {
      await loadScript('https://unpkg.com/aos@next/dist/aos.js', 'aos-script');
      startAOS();
    } catch (error) {
      console.warn('AOS failed to load:', error);
      stripAOSAttributes();
    }
  });
}

function _injectHeader(currentPage, session, userName) {
  if (document.querySelector('header')) return;

  const isLoggedIn = !!session;
  const initial = userName ? userName.charAt(0).toUpperCase() : '?';

  const header = document.createElement('header');
  header.className = 'sticky top-0 z-50 w-full';
  header.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      <div class="bg-white dark:bg-slate-900 md:bg-white/90 md:dark:bg-slate-900/90 md:backdrop-blur-2xl border border-gray-200/70 dark:border-white/10 rounded-[2rem] shadow-lg md:shadow-xl px-4 sm:px-8 py-3 flex items-center justify-between gap-3 transition-all duration-300">
        <a href="index.html" class="flex items-center gap-3 group" aria-label="Go to home page">
          <div class="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1e40af] flex items-center justify-center text-white font-black text-xl shadow-md ring-1 ring-white/20">C</div>
          <span class="font-black text-xl tracking-tighter text-[#1a1a2e] dark:text-white hidden sm:block">COMSATSPrepHub</span>
          <span class="font-black text-xl tracking-tighter text-[#1a1a2e] dark:text-white sm:hidden">COMSATS</span>
        </a>

        <nav class="hidden md:flex items-center bg-gray-100/60 dark:bg-black/20 rounded-full p-1 border border-gray-200/50 dark:border-white/5" aria-label="Primary">
          <a href="index.html" class="nav-link-premium px-5 py-2 text-sm font-semibold rounded-full transition-all ${currentPage === 'index.html' ? 'bg-white dark:bg-white/20 text-primary dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}">Home</a>
          <a href="subjects.html" class="nav-link-premium px-5 py-2 text-sm font-semibold rounded-full transition-all ${currentPage === 'subjects.html' ? 'bg-white dark:bg-white/20 text-primary dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}">Subjects</a>
          <a href="quiz.html" class="nav-link-premium px-5 py-2 text-sm font-semibold rounded-full transition-all ${currentPage === 'quiz.html' ? 'bg-white dark:bg-white/20 text-primary dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}">Quiz</a>
          <a href="about-us.html" class="nav-link-premium px-5 py-2 text-sm font-semibold rounded-full transition-all ${currentPage === 'about-us.html' ? 'bg-white dark:bg-white/20 text-primary dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}">Team</a>
        </nav>

        <div class="flex items-center gap-2 sm:gap-3">
          <button id="dark-mode-toggle"
                  class="p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-gray-600 dark:text-gray-300"
                  type="button"
                  aria-label="Toggle dark mode">
            <span class="dark-mode-icon block w-5 h-5 flex items-center justify-center" aria-hidden="true"></span>
          </button>

          <button id="open-auth-modal"
                  class="flex items-center gap-2 bg-[#1e1e2e] dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-[#1e1e2e] px-5 py-3 rounded-full text-xs font-bold transition-all active:scale-95 shadow-md"
                  type="button"
                  aria-label="${isLoggedIn ? 'Open dashboard' : 'Open sign in dialog'}">
            ${isLoggedIn ? `
              <div class="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] text-white hidden sm:flex font-black" aria-hidden="true">${initial}</div>
              <span>Dashboard</span>
            ` : `
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">person</span>
              <span>Sign In</span>
            `}
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.prepend(header);
}

function _injectMobileNav(currentPage) {
  if (window.innerWidth > 1024) return;
  if (document.getElementById('mobileBottomNav')) return;

  const nav = document.createElement('nav');
  nav.id = 'mobileBottomNav';
  nav.className = 'fixed bottom-4 left-4 right-4 z-[60] lg:hidden';
  nav.setAttribute('aria-label', 'Bottom navigation');

  const items = [
    { id: 'index.html', label: 'Home', icon: 'home' },
    { id: 'subjects.html', label: 'Subjects', icon: 'menu_book' },
    { id: 'quiz.html', label: 'Quiz', icon: 'quiz' },
    { id: 'about-us.html', label: 'Team', icon: 'groups' }
  ];

  nav.innerHTML = `
    <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-xl px-2 py-2">
      <div class="grid grid-cols-4 items-stretch gap-1">
        ${items.map(item => {
          const isActive = currentPage === item.id;
          return `
            <a href="${item.id}"
               aria-label="Open ${item.label}"
               title="${item.label}"
               class="min-h-12 flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-2xl transition-colors ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}">
              <span class="material-symbols-outlined text-[24px]" aria-hidden="true" style="${isActive ? "font-variation-settings:'FILL' 1" : ''}">${item.icon}</span>
              <span class="text-[10px] font-bold leading-none">${item.label}</span>
            </a>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(nav);
}

function _injectFooter() {
  if (document.querySelector('footer')) return;
  const footer = document.createElement('footer');
  footer.className = 'bg-white dark:bg-slate-900 md:bg-white/80 md:dark:bg-slate-900/80 md:backdrop-blur-xl border-t border-gray-100 dark:border-white/5 py-6 px-6 transition-colors duration-300 rounded-t-[2rem] mt-auto pb-24 lg:pb-6';
  footer.innerHTML = `
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
      <div class="space-y-0.5">
        <div class="font-black text-base tracking-tight text-[#1a1a2e] dark:text-white">COMSATSPrepHub</div>
        <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Verified academic resources for success.</p>
      </div>
      <div class="flex items-center justify-center gap-6">
        <a href="about-us.html" class="nav-link-premium text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">About</a>
        <a href="terms.html" class="nav-link-premium text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">Terms</a>
        <a href="https://github.com/MushtaqAhmadSaqi" target="_blank" rel="noopener noreferrer" class="nav-link-premium text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">Github</a>
      </div>
      <div class="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest opacity-60">
        © 2026 Mushtaq Ahmad Saqi
      </div>
    </div>
  `;
  document.body.appendChild(footer);
}

function _wireNavButton(session) {
  const btn = document.getElementById('open-auth-modal');
  if (!btn) return;

  if (session) {
    btn.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  } else {
    btn.addEventListener('click', event => {
      event.preventDefault();
      openModal();
    });
  }
}

function _initSwipeNav(currentPage) {
  const ROUTES = ['index.html', 'subjects.html', 'quiz.html', 'dashboard.html'];
  const main = document.querySelector('main');
  if (!main || isMobilePerfMode()) return;

  let touchStartX = 0;

  main.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  main.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 80) return;

    const idx = ROUTES.findIndex(route => route === currentPage);
    if (idx === -1) return;

    const nextIdx = Math.max(0, Math.min(idx + (dx < 0 ? 1 : -1), ROUTES.length - 1));
    if (nextIdx !== idx) {
      window.location.href = ROUTES[nextIdx];
    }
  }, { passive: true });
}

function _initScrollHideNav() {
  let lastY = Math.max(window.pageYOffset, window.scrollY || 0);
  let ticking = false;

  const TOP_SHOW = 20;
  const HIDE_AFTER = 90;
  const MIN_DELTA = 6;

  function getHeader() {
    return document.querySelector('body > header') || document.querySelector('header');
  }

  function getBottomNav() {
    return document.getElementById('mobileBottomNav');
  }

  function prepareElement(el, isBottom = false) {
    if (!el) return;
    el.style.willChange = 'transform';
    el.style.transition = 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)';
    if (!el.dataset.navPrepared) {
      el.style.transform = isBottom ? 'translate3d(0,0,0)' : 'translate3d(0,0,0)';
      el.dataset.navPrepared = 'true';
    }
  }

  function showBars() {
    const header = getHeader();
    const bottomNav = getBottomNav();

    prepareElement(header, false);
    prepareElement(bottomNav, true);

    if (header) header.style.transform = 'translate3d(0,0,0)';
    if (bottomNav) bottomNav.style.transform = 'translate3d(0,0,0)';
  }

  function hideBars() {
    const header = getHeader();
    const bottomNav = getBottomNav();

    prepareElement(header, false);
    prepareElement(bottomNav, true);

    if (header) header.style.transform = 'translate3d(0,-120%,0)';
    if (bottomNav) bottomNav.style.transform = 'translate3d(0,calc(100% + 20px),0)';
  }

  function onFrame() {
    const currentY = Math.max(window.pageYOffset, window.scrollY || 0);
    const delta = currentY - lastY;

    if (currentY <= TOP_SHOW) {
      showBars();
      lastY = currentY;
      ticking = false;
      return;
    }

    if (Math.abs(delta) < MIN_DELTA) {
      ticking = false;
      return;
    }

    if (delta > 0 && currentY > HIDE_AFTER) {
      hideBars();
    } else if (delta < 0) {
      showBars();
    }

    lastY = currentY;
    ticking = false;
  }

  function requestTick() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onFrame);
  }

  showBars();

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('touchmove', requestTick, { passive: true });
  window.addEventListener('resize', () => {
    showBars();
    lastY = Math.max(window.pageYOffset, window.scrollY || 0);
  }, { passive: true });
}
