/**
 * js/layout.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Injects the shared Header, Footer, and Mobile Bottom Nav into every page.
 * Handles: premium glassmorphism pill, session-aware buttons, 
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
  _injectMobileNav(currentPage);
  _wireNavButton(session, userName);
  
  // Initialization
  _initHeaderToggles();
  _initAOS();
  _initVanillaTilt();
  initAuthModal();
  
  _initSwipeNav(currentPage);
  _initScrollHideNav();
});

// ── AOS (Animate On Scroll) ──────────────────────────────────────────────────
function _initAOS() {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 50,
      disable: false
    });
  }
}

// ── Header (Premium Pill Style) ───────────────────────────────────────────────
function _injectHeader(currentPage, session, userName) {
  if (document.querySelector('header')) return;

  const isLoggedIn = !!session;
  const initial = userName ? userName.charAt(0).toUpperCase() : '?';

  const header = document.createElement('header');
  header.className = 'sticky top-0 z-50 transition-all duration-300 w-full';
  header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <!-- Glassmorphism Navbar Pill -->
        <div class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-gray-200/50 dark:border-white/10 rounded-[2rem] shadow-xl px-4 sm:px-8 py-3 flex items-center justify-between transition-all duration-300">
          
          <!-- Left: Logo -->
          <a href="index.html" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1e40af] flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform ring-1 ring-white/20">C</div>
            <span class="font-black text-xl tracking-tighter text-[#1a1a2e] dark:text-white hidden sm:block">COMSATSPrepHub</span>
            <span class="font-black text-xl tracking-tighter text-[#1a1a2e] dark:text-white sm:hidden">COMSATS</span>
          </a>

          <!-- Center: Pill Navigation (Desktop Only) -->
          <nav class="hidden md:flex items-center bg-gray-100/50 dark:bg-black/20 rounded-full p-1 border border-gray-200/50 dark:border-white/5">
            <a href="index.html" class="px-5 py-1.5 text-sm font-semibold rounded-full transition-all ${currentPage === 'index.html' ? 'bg-white dark:bg-white/20 text-primary dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}">Home</a>
            <a href="subjects.html" class="px-5 py-1.5 text-sm font-semibold rounded-full transition-all ${currentPage === 'subjects.html' ? 'bg-white dark:bg-white/20 text-primary dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}">Subjects</a>
            <a href="quiz.html" class="px-5 py-1.5 text-sm font-semibold rounded-full transition-all ${currentPage === 'quiz.html' ? 'bg-white dark:bg-white/20 text-primary dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}">Quiz</a>
            <a href="about-us.html" class="px-5 py-1.5 text-sm font-semibold rounded-full transition-all ${currentPage === 'about-us.html' ? 'bg-white dark:bg-white/20 text-primary dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}">Team</a>
          </nav>

          <!-- Right Side: Actions -->
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Dark Mode Toggle -->
            <button id="dark-mode-toggle"
                    class="p-2.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-gray-600 dark:text-gray-300"
                    aria-label="Toggle dark mode">
              <span id="dark-mode-icon" class="block w-5 h-5 flex items-center justify-center"></span>
            </button>

            <!-- Auth Section -->
            <button id="open-auth-modal" 
                    class="flex items-center gap-2 bg-[#1e1e2e] dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-[#1e1e2e] px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 shadow-md">
              ${isLoggedIn ? `
                <div class="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] text-white hidden sm:flex font-black">${initial}</div>
                <span>Dashboard</span>
              ` : `
                <span class="material-symbols-outlined text-[18px]">person</span>
                <span>Sign In</span>
              `}
            </button>
          </div>
        </div>
      </div>
    `;
  document.body.prepend(header);
}

// ── Mobile Bottom Navigation ──────────────────────────────────────────────────
function _injectMobileNav(currentPage) {
  if (window.innerWidth > 1024) return;
  if (document.getElementById('mobileBottomNav')) return;

  const nav = document.createElement('nav');
  nav.id = 'mobileBottomNav';
  nav.className = 'fixed bottom-4 left-4 right-4 z-[60] lg:hidden transition-transform duration-300';
  
  const items = [
    { id: 'index.html', label: 'Home', icon: 'home' },
    { id: 'subjects.html', label: 'Subjects', icon: 'menu_book' },
    { id: 'quiz.html', label: 'Quiz', icon: 'quiz' },
    { id: 'about-us.html', label: 'Team', icon: 'groups' }
  ];

  nav.innerHTML = `
    <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl px-2 py-2">
      <div class="flex items-center justify-around">
        ${items.map(item => {
          const isActive = currentPage === item.id;
          return `
            <a href="${item.id}" class="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}">
              <span class="material-symbols-outlined text-[24px]" style="${isActive ? "font-variation-settings:'FILL' 1" : ''}">${item.icon}</span>
              <span class="text-[10px] font-bold">${item.label}</span>
            </a>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(nav);
}

// ── Footer ────────────────────────────────────────────────────────────────────
function _injectFooter() {
  if (document.querySelector('footer')) return;
  const footer = document.createElement('footer');
  footer.className = 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 py-6 px-6 transition-colors duration-300 rounded-t-[2rem] mt-auto pb-24 lg:pb-6';
  footer.innerHTML = `
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div class="space-y-0.5">
          <div class="font-black text-base tracking-tight text-[#1a1a2e] dark:text-white">COMSATSPrepHub</div>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Verified academic resources for success.</p>
        </div>
        <div class="flex items-center justify-center gap-6">
          <a href="about-us.html" class="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">About</a>
          <a href="terms.html"    class="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">Terms</a>
          <a href="https://github.com/MushtaqAhmadSaqi" target="_blank" class="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">Github</a>
        </div>
        <div class="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest opacity-60">
          © 2026 Mushtaq Ahmad Saqi
        </div>
      </div>
    `;
  document.body.appendChild(footer);
}

// ── Shared Logic ──────────────────────────────────────────────────────────────
function _initHeaderToggles() {
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (window.toggleDarkMode) window.toggleDarkMode();
    });
  }
}

function _wireNavButton(session, userName) {
  const btn = document.getElementById('open-auth-modal');
  if (!btn) return;
  if (session) {
    btn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });
  } else {
    btn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  }
}

function _initSwipeNav(currentPage) {
  const ROUTES = ['index.html', 'subjects.html', 'quiz.html', 'dashboard.html'];
  const main = document.querySelector('main');
  if (!main) return;
  let touchStartX = 0;
  main.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  main.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 80) return;
    const idx = ROUTES.findIndex(r => r === currentPage);
    const nextIdx = Math.max(0, Math.min(idx + (dx < 0 ? 1 : -1), ROUTES.length - 1));
    if (nextIdx !== idx) window.location.href = ROUTES[nextIdx];
  }, { passive: true });
}

function _initScrollHideNav() {
  let lastScrollY = window.scrollY;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    window.requestAnimationFrame(() => {
      const header = document.querySelector('header');
      const bottomNav = document.getElementById('mobileBottomNav');
      const curr = window.scrollY;
      if (Math.abs(curr - lastScrollY) <= 10) { ticking = false; return; }
      
      if (curr > lastScrollY && curr > 100) {
        if (header) header.classList.add('header-hidden');
        if (bottomNav) bottomNav.style.transform = 'translateY(120%)';
      } else {
        if (header) header.classList.remove('header-hidden');
        if (bottomNav) bottomNav.style.transform = 'translateY(0)';
      }
      lastScrollY = curr;
      ticking = false;
    });
  }, { passive: true });
}

// ── 3D Effects (Vanilla Tilt) ────────────────────────────────────────────────
function _initVanillaTilt() {
  // Inject script if not present
  if (!document.getElementById('vanilla-tilt-script')) {
    const script = document.createElement('script');
    script.id = 'vanilla-tilt-script';
    script.src = 'https://cdn.jsdelivr.net/npm/vanilla-tilt@1.7.2/dist/vanilla-tilt.min.js';
    script.onload = () => _applyVanillaTilt();
    document.head.appendChild(script);
  } else {
    _applyVanillaTilt();
  }
}

function _applyVanillaTilt() {
  if (typeof VanillaTilt !== 'undefined') {
    VanillaTilt.init(document.querySelectorAll(".card-hover"), {
      max: 12,
      speed: 400,
      glare: true,
      "max-glare": 0.2,
      scale: 1.02
    });
  }
}

// Expose re-init for dynamic content
window.reinitVanillaTilt = _applyVanillaTilt;
