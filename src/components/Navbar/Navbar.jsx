import React, { useState, useEffect, useCallback } from 'react';
import './Navbar.css';

// Desktop navigation items
const desktopNavItems = [
  { id: 'home',      label: 'Home',      icon: 'home' },
  { id: 'subjects',  label: 'Papers',    icon: 'menu_book' },
  { id: 'quiz',      label: 'Quizzes',   icon: 'quiz' },
  { id: 'ai-quiz-generator', label: 'AI Quiz', icon: 'auto_awesome' },
  { id: 'study-hub', label: 'Study Hub', icon: 'psychology' },
  { id: 'gpa',       label: 'GPA Calc',  icon: 'calculate' }
];

// Mobile bottom navigation bar — exact 5 student tabs requested: Papers, Quizzes, AI Quiz, GPA, Profile
const mobileNavItems = [
  { id: 'subjects',          label: 'Papers',   icon: 'menu_book' },
  { id: 'quiz',              label: 'Quizzes',  icon: 'quiz' },
  { id: 'ai-quiz-generator', label: 'AI Quiz',  icon: 'auto_awesome' },
  { id: 'gpa',               label: 'GPA',      icon: 'calculate' },
  { id: 'dashboard',         label: 'Profile',  icon: 'person' }
];

export default function Navbar({
  activePath = 'home',
  onNavigate = () => {},
  isDark = false,
  onToggleDarkMode = () => {},
  lang = 'en',
  onToggleLanguage = () => {},
  user = null,
  onOpenAuth = () => {},
  onOpenCommandPalette = () => {}
}) {
  const [scrolled, setScrolled] = useState(false);
  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    null;

  /* Scroll shadow effect */
  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 12);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const isNavItemActive = (itemId) => {
    if (itemId === 'subjects' && (activePath === 'subjects' || activePath === 'subject-papers' || activePath === 'paper-view')) {
      return true;
    }
    if (itemId === 'ai-quiz-generator' && (activePath === 'ai-quiz-generator' || activePath === 'take-ai-quiz')) {
      return true;
    }
    if (itemId === 'dashboard' && (activePath === 'dashboard' || activePath === 'account')) {
      return true;
    }
    return activePath === itemId;
  };

  return (
    <>
      <header className={`header-sticky${scrolled ? ' header-scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-glass-pill">
            {/* Brand Logo */}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="brand-logo"
              aria-label="COMSATS Prep Hub home"
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              <img
                src="/logo.png"
                alt="COMSATS Prep Hub logo"
                width="32"
                height="32"
                decoding="async"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <span className="brand-title">COMSATS</span>
                <span className="brand-highlight">PrepHub</span>
              </div>
            </button>

            {/* Desktop Pill Navigation */}
            <nav className="desktop-nav-links" aria-label="Primary">
              {desktopNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`nav-link-btn${isNavItemActive(item.id) ? ' active' : ''}`}
                  aria-label={item.label}
                  aria-current={isNavItemActive(item.id) ? 'page' : undefined}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right Side Controls */}
            <div className="nav-right-actions">
              {/* Command Palette Trigger (Ctrl/Cmd+K hint) */}
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="cmd-trigger-btn"
                aria-label="Search papers, subjects, pages (Ctrl+K or Cmd+K)"
                title="Quick search (Ctrl+K / ⌘K)"
              >
                <span className="material-symbols-outlined" aria-hidden="true">search</span>
                <span className="cmd-trigger-text">Search</span>
                <kbd className="cmd-trigger-kbd">Ctrl K</kbd>
              </button>

              {/* Language Toggle (EN / اردو) */}
              <button
                type="button"
                onClick={onToggleLanguage}
                className="icon-circle-btn"
                aria-label={lang === 'ur' ? 'Switch explanations to English' : 'Switch explanations to Urdu'}
                title={lang === 'ur' ? 'Language: اردو (Click for EN)' : 'Language: EN (Click for اردو)'}
                style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0 0.5rem', width: 'auto', minWidth: '2.25rem' }}
              >
                {lang === 'ur' ? 'اردو' : 'EN'}
              </button>

              {/* Dark Mode Toggle */}
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="icon-circle-btn"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={isDark}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>

              {/* User / Sign In Button */}
              {user ? (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="signin-gradient-btn btn-shimmer"
                  aria-label="Go to student dashboard"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">account_circle</span>
                  <span>{firstName || 'Dashboard'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="signin-gradient-btn btn-shimmer"
                  aria-label="Sign in to your account"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">person</span>
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar — Papers, Quizzes, AI Quiz, GPA, Profile */}
      <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
        <div className="mobile-grid">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`mobile-nav-item${isNavItemActive(item.id) ? ' active' : ''}`}
              aria-label={item.label}
              aria-current={isNavItemActive(item.id) ? 'page' : undefined}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              <span className="text-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
