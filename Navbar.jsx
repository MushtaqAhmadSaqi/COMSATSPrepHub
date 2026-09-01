import React, { useState, useEffect } from 'react';

/**
 * Simple & Modern React Navbar Component
 * Supports: Desktop Floating Navigation, Mobile Bottom Navigation, Dark Mode Toggle, Auth State.
 */
export default function Navbar({
  user = null, // e.g. { name: 'Moeed', email: 'moeed@example.com' }
  activePath = 'home', // 'home' | 'subjects' | 'quiz' | 'team'
  onSignIn = () => {},
  onSignOut = () => {}
}) {
  const [isDark, setIsDark] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Sync dark mode state with document class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const navLinks = [
    { id: 'home', label: 'Home', href: 'index.html', icon: 'home' },
    { id: 'subjects', label: 'Subjects', href: 'subjects.html', icon: 'menu_book' },
    { id: 'quiz', label: 'Quiz', href: 'quiz.html', icon: 'quiz' },
    { id: 'team', label: 'Team', href: 'about-us.html', icon: 'groups' }
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <>
      {/* ═════════════════════════ DESKTOP & TOP HEADER ═════════════════════════ */}
      <header className="sticky top-0 z-50 w-full transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-gray-200/50 dark:border-white/10 rounded-[1.5rem] shadow-xl px-4 sm:px-8 py-3 flex items-center justify-between gap-3">

            {/* Logo & Brand */}
            <a href="index.html" className="flex items-center gap-2 text-decoration-none flex-shrink-0">
              <img src="logo.png" alt="Logo" className="w-10 h-10 object-contain" />
              <div className="hidden sm:flex items-baseline">
                <span className="font-black text-xl tracking-tighter text-[#1a1a2e] dark:text-white">COMSATS</span>
                <span class="font-bold text-xl tracking-tighter text-blue-600 dark:text-blue-400">PrepHub</span>
              </div>
              <span className="sm:hidden font-black text-lg text-[#1a1a2e] dark:text-white">COMSATS</span>
            </a>

            {/* Centered Floating Pill Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-1 bg-gray-100/70 dark:bg-slate-800/60 border border-gray-200/75 dark:border-slate-700/50 rounded-full p-1 shadow-inner">
              {navLinks.map((link) => {
                const isActive = activePath === link.id;
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-white dark:bg-blue-600/30 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-400/30 shadow-md font-extrabold'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-slate-700/50 hover:text-blue-900 dark:hover:text-white'
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>

            {/* Right Actions: Dark Mode Toggle & Auth */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                type="button"
                aria-label="Toggle dark mode"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>

              {/* User Profile / Sign In */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    type="button"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 dark:bg-white text-white dark:text-[#1e1e2e] font-black text-sm shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    {userInitial}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-3 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 py-2 z-50">
                      <a
                        href="dashboard.html"
                        className="px-4 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">dashboard</span>
                        Dashboard
                      </a>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onSignOut();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onSignIn}
                  type="button"
                  className="px-4 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  <span>Sign In</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ═════════════════════════ MOBILE BOTTOM NAVIGATION ═════════════════════════ */}
      <nav className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-md z-50 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full p-1.5 shadow-2xl">
        <div className="grid grid-cols-4 gap-1">
          {navLinks.map((link) => {
            const isActive = activePath === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-full transition-all ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] mb-0.5">{link.icon}</span>
                <span className="text-[10px] font-bold tracking-tight">{link.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
