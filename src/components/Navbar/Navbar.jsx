import React, { useState, useEffect, useCallback } from 'react';
import './Navbar.css';

// Defined at module scope so the array is created once, not on every render
const navItems = [
  { id: 'home',     label: 'Home',    icon: 'home' },
  { id: 'subjects', label: 'Subjects', icon: 'menu_book' },
  { id: 'quiz',     label: 'Quiz',     icon: 'quiz' },
  { id: 'gpa',      label: 'GPA Calc', icon: 'calculate' },
  { id: 'about',    label: 'Team',     icon: 'groups' }
];

export default function Navbar({
  activePath = 'home',
  onNavigate = () => {},
  isDark = false,
  onToggleDarkMode = () => {},
  user = null,
  onOpenAuth = () => {}
}) {
  const [scrolled, setScrolled] = useState(false);

  /* Scroll shadow effect */
  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 12);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              <img src="/logo.png" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
              <div>
                <span className="brand-title">COMSATS</span>
                <span className="brand-highlight">PrepHub</span>
              </div>
            </button>

            {/* Desktop Pill Navigation */}
            <nav className="desktop-nav-links">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`nav-link-btn${activePath === item.id ? ' active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right Side Controls */}
            <div className="nav-right-actions">
              {/* Dark Mode Toggle */}
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="icon-circle-btn"
                aria-label="Toggle dark mode"
              >
                <span className="material-symbols-outlined">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>

              {/* User / Sign In Button */}
              {user ? (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="signin-gradient-btn btn-shimmer"
                >
                  <span className="material-symbols-outlined">account_circle</span>
                  <span>Dashboard</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="signin-gradient-btn btn-shimmer"
                >
                  <span className="material-symbols-outlined">person</span>
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar — shows all 5 items */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-grid">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`mobile-nav-item${activePath === item.id ? ' active' : ''}`}
              aria-label={item.label}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
