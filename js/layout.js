/**
 * js/layout.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Injects the shared Header and Footer into every page.
 * Handles: mobile responsive menu, session-aware buttons, 
 * dark mode sync, and scroll transitions.
 */

import { auth, supabase } from './core.js';
import { initAuthModal, openModal } from './auth-ui.js';

// ── Entry Point ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const session = await auth.getSession();
  const userName = session ? auth.getUserName(session.user) : null;
  const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  _injectHeader(currentPage, session, userName);
  _injectFooter();
  _wireNavButton(session, userName);
  
  // Initialization
  _initHeaderToggles();
  _initAOS();
  initAuthModal();
  
  _initSwipeNav(currentPage);
  _initScrollHideNav();

  // Mobile Menu Toggle (from user)
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
});

// ── AOS (Animate On Scroll) ──────────────────────────────────────────────────
function _initAOS() {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 50,
      disable: false // Ensure content reveals on mobile as well
    });
  }
}

// ── Header ────────────────────────────────────────────────────────────────────
function _injectHeader(currentPage, session, userName) {
  if (document.querySelector('header')) return;

  const isLoggedIn = !!session;

  const header = document.createElement('header');
  header.className = 'sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-white/10';
  header.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-3">
      <div class="flex items-center justify-between">
        
        <!-- Logo -->
        <a href="index.html" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-[#2563eb] flex items-center justify-center">
            <span class="text-white font-black text-xl">C</span>
          </div>
          <span class="font-black text-lg tracking-tight text-[#1e293b] dark:text-white hidden sm:block">COMSATSPrepHub</span>
          <span class="font-black text-lg tracking-tight text-[#1e293b] dark:text-white sm:hidden">COMSATS</span>
        </a>

        <!-- Desktop Nav -->
        <nav class="hidden md:flex items-center bg-[#f8fafc] dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-3xl p-1">
          <a href="index.html" class="px-4 py-1.5 text-sm font-semibold rounded-3xl transition-all ${currentPage === 'index.html' ? 'active-pill' : 'text-gray-600 dark:text-gray-300 hover:text-[#1e293b] dark:hover:text-white hover:bg-white dark:hover:bg-white/10'}">Home</a>
          <a href="subjects.html" class="px-4 py-1.5 text-sm font-semibold rounded-3xl transition-all ${currentPage === 'subjects.html' ? 'active-pill' : 'text-gray-600 dark:text-gray-300 hover:text-[#1e293b] dark:hover:text-white hover:bg-white dark:hover:bg-white/10'}">Subjects</a>
          <a href="quiz.html" class="px-4 py-1.5 text-sm font-semibold rounded-3xl transition-all ${currentPage === 'quiz.html' ? 'active-pill' : 'text-gray-600 dark:text-gray-300 hover:text-[#1e293b] dark:hover:text-white hover:bg-white dark:hover:bg-white/10'}">Quiz</a>
          <a href="dashboard.html" class="px-4 py-1.5 text-sm font-semibold rounded-3xl transition-all ${currentPage === 'dashboard.html' ? 'active-pill' : 'text-gray-600 dark:text-gray-300 hover:text-[#1e293b] dark:hover:text-white hover:bg-white dark:hover:bg-white/10'}">Dashboard</a>
        </nav>

        <!-- Right Side -->
        <div class="flex items-center gap-2">
          
          <!-- Dark Mode Toggle -->
          <button id="dark-mode-toggle" class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300">
            <span id="dark-mode-icon" class="block w-5 h-5 flex items-center justify-center"></span>
          </button>

          <!-- Sign In (Desktop) -->
          <button id="open-auth-modal" class="hidden md:flex items-center gap-1.5 bg-[#1e293b] dark:bg-white text-white dark:text-[#1e293b] px-4 py-2 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-sm">
            ${isLoggedIn ? 'Dashboard' : 'Sign In'}
          </button>

          <!-- Mobile Menu Button -->
          <button id="mobile-menu-btn" class="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <div id="mobile-menu" class="hidden md:hidden mt-3 pb-3 border-t border-gray-200 dark:border-white/10 pt-3">
        <div class="flex flex-col gap-1">
          <a href="index.html" class="px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${currentPage === 'index.html' ? 'bg-[#f1f5f9] dark:bg-white/10 text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}">Home</a>
          <a href="subjects.html" class="px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${currentPage === 'subjects.html' ? 'bg-[#f1f5f9] dark:bg-white/10 text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}">Subjects</a>
          <a href="quiz.html" class="px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${currentPage === 'quiz.html' ? 'bg-[#f1f5f9] dark:bg-white/10 text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}">Quiz</a>
          <a href="dashboard.html" class="px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${currentPage === 'dashboard.html' ? 'bg-[#f1f5f9] dark:bg-white/10 text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}">Dashboard</a>
          
          <button id="mobile-signin-btn" class="mt-2 px-4 py-2.5 text-sm font-bold bg-[#1e293b] dark:bg-white text-white dark:text-[#1e293b] rounded-2xl text-center">
            ${isLoggedIn ? 'Dashboard' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.prepend(header);
}

// ── Header Controls (Dark Mode Sync) ──────────────────────────────────────────
function _initHeaderToggles() {
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (window.toggleDarkMode) window.toggleDarkMode();
    });
  }
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

// ── Wire Nav Auth Button ──────────────────────────────────────────────────────
function _wireNavButton(session, userName) {
  const desktopBtn = document.getElementById('open-auth-modal');
  const mobileBtn = document.getElementById('mobile-signin-btn');
  
  [desktopBtn, mobileBtn].forEach(btn => {
    if (!btn) return;
    if (session) {
      btn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    } else {
      btn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    }
  });
}

// ── Swipe Navigation ──────────────────────────────────────────────────────────
function _initSwipeNav(currentPage) {
  const ROUTES = ['index.html', 'subjects.html', 'quiz.html', 'dashboard.html'];
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

    const idx = ROUTES.findIndex(r => r === currentPage);
    const safeIdx = Math.max(0, Math.min((idx < 0 ? 0 : idx) + (dx < 0 ? 1 : -1), ROUTES.length - 1));
    if (safeIdx !== idx) window.location.href = ROUTES[safeIdx];
  }, { passive: true });
}

// ── Scroll Hide/Show Header ───────────────────────────────────────────────────
function _initScrollHideNav() {
  let lastScrollY = window.scrollY;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    window.requestAnimationFrame(() => {
      const header = document.querySelector('header');
      const curr = window.scrollY;

      if (Math.abs(curr - lastScrollY) <= 5) { ticking = false; return; }

      if (header) {
        if (curr > lastScrollY && curr > 80) {
          header.classList.add('header-hidden');
          document.getElementById('mobile-menu')?.classList.add('hidden');
        } else if (curr < lastScrollY) {
          header.classList.remove('header-hidden');
        }
      }

      lastScrollY = curr;
      ticking = false;
    });
  }, { passive: true });
}
