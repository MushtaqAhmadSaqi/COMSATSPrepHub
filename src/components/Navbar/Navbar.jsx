import React, { useState, useEffect, useCallback } from 'react';
import AppIcon from '../ui/AppIcon';
import './Navbar.css';

// Desktop navigation items (6 core student destinations — single-tier)
const desktopNavItems = [
  { id: 'home',              label: 'Home',      icon: 'home' },
  { id: 'subjects',          label: 'Papers',    icon: 'menu_book' },
  { id: 'ai-quiz-generator', label: 'AI Quiz',   icon: 'auto_awesome' },
  { id: 'study-hub',         label: 'Study Hub', icon: 'psychology' },
  { id: 'gpa',               label: 'GPA Calc',  icon: 'calculate' },
  { id: 'dashboard',         label: 'Dashboard', icon: 'dashboard' }
];

// Mobile bottom navigation bar — core student study tabs plus one-hand Dashboard access
const mobileNavItems = [
  { id: 'subjects',          label: 'Papers',    icon: 'menu_book' },
  { id: 'ai-quiz-generator', label: 'AI Quiz',   icon: 'auto_awesome' },
  { id: 'study-hub',         label: 'Study Hub', icon: 'psychology' },
  { id: 'gpa',               label: 'GPA',       icon: 'calculate' },
  { id: 'dashboard',         label: 'Dashboard', icon: 'dashboard' }
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
    if (itemId === 'about' && (activePath === 'about' || activePath === 'team')) {
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
              aria-label="COMSATSPrepHub home"
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              <img
                src="/logo.png"
                alt="COMSATSPrepHub logo"
                width="32"
                height="32"
                decoding="async"
                fetchPriority="high"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div translate="no">
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
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="cmd-trigger-btn"
                aria-label="Search papers, courses, exam types, and pages (Ctrl+K or Cmd+K)"
                title="Quick search (Ctrl+K / ⌘K)"
              >
                <AppIcon name="search" size={18} />
                <span className="cmd-trigger-text">Search</span>
                <kbd className="cmd-trigger-kbd">Ctrl K</kbd>
              </button>

              <button
                type="button"
                onClick={onToggleLanguage}
                className="icon-circle-btn lang-toggle-btn"
                aria-label={lang === 'ur' ? 'Switch explanations to English' : 'Switch explanations to Urdu'}
                title={lang === 'ur' ? 'Language: اردو (Click for EN)' : 'Language: EN (Click for اردو)'}
              >
                <span translate="no">{lang === 'ur' ? 'اردو' : 'EN'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className="icon-circle-btn"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={isDark}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <AppIcon name={isDark ? 'light_mode' : 'dark_mode'} size={18} />
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="signin-gradient-btn btn-shimmer"
                  aria-label="Go to student dashboard"
                  title={firstName || 'Dashboard'}
                >
                  <AppIcon name="account_circle" size={19} />
                  <span className="signin-btn-text">{firstName || 'Dashboard'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="signin-gradient-btn btn-shimmer"
                  aria-label="Sign in to your account"
                  title="Sign In"
                >
                  <AppIcon name="person" size={19} />
                  <span className="signin-btn-text">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar — Papers, AI Quiz, Study Hub, GPA, Dashboard */}
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
              <AppIcon name={item.icon} size={22} />
              <span className="text-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
