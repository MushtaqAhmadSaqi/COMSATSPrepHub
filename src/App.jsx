import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import AuthModal from './components/AuthModal/AuthModal';
import ScrollTop from './components/ScrollTop/ScrollTop';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt/InstallPrompt';
import CommandPalette from './components/CommandPalette/CommandPalette';
import EmptyState from './components/ui/EmptyState';
import { ToastProvider } from './utils/toast';
import { isAdminUser } from './utils/adminGuard';
import { supabase } from './services/supabase';

import Home from './pages/Home/Home';
import './App.css';

// Route-based code splitting for secondary pages to optimize initial bundle load
const About = lazy(() => import('./pages/About/About'));
const Subjects = lazy(() => import('./pages/Subjects/Subjects'));
const SubjectPapers = lazy(() => import('./pages/SubjectPapers/SubjectPapers'));
const PaperView = lazy(() => import('./pages/PaperView/PaperView'));
const Quiz = lazy(() => import('./pages/Quiz/Quiz'));
const AiQuizGenerator = lazy(() => import('./pages/AiQuizGenerator/AiQuizGenerator'));
const TakeAiQuiz = lazy(() => import('./pages/TakeAiQuiz/TakeAiQuiz'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Upload = lazy(() => import('./pages/Upload/Upload'));
const Auth = lazy(() => import('./pages/Auth/Auth'));
const Terms = lazy(() => import('./pages/Terms/Terms'));
const AdminGenerateQuizzes = lazy(() => import('./pages/AdminGenerateQuizzes/AdminGenerateQuizzes'));
const AdminPaste = lazy(() => import('./pages/AdminPaste/AdminPaste'));
const GpaCalculator = lazy(() => import('./pages/GpaCalculator/GpaCalculator'));

const PAGE_TITLES = {
  home: 'COMSATSPrepHub — Prepare Smarter for COMSATS Exams',
  about: 'Meet the Team — COMSATSPrepHub',
  subjects: 'Browse Subjects & Past Papers — COMSATSPrepHub',
  'subject-papers': 'Subject Past Papers — COMSATSPrepHub',
  'paper-view': 'Exam Paper & Solutions — COMSATSPrepHub',
  quiz: 'Practice Quizzes — COMSATSPrepHub',
  'ai-quiz-generator': 'AI Quiz Generator — COMSATSPrepHub',
  'take-ai-quiz': 'AI Practice Quiz — COMSATSPrepHub',
  dashboard: 'Student Dashboard — COMSATSPrepHub',
  upload: 'Upload Past Paper — COMSATSPrepHub',
  auth: 'Sign In — COMSATSPrepHub',
  terms: 'Terms of Service — COMSATSPrepHub',
  'admin-generate': 'Admin Quiz Generator — COMSATSPrepHub',
  'admin-paste': 'Admin Paper Parser — COMSATSPrepHub',
  gpa: 'COMSATS GPA & CGPA Calculator — COMSATSPrepHub'
};

function RouteLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: '0.75rem',
        color: 'var(--text-subtle)'
      }}
      role="status"
      aria-live="polite"
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '2.25rem', color: 'var(--brand)', animation: 'spin 1s linear infinite' }}
        aria-hidden="true"
      >
        progress_activity
      </span>
      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Loading workspace…</span>
    </div>
  );
}

function AdminGuardView({ user, onOpenAuth, onNavigate, children }) {
  if (!user) {
    return (
      <div style={{ maxWidth: '40rem', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <EmptyState
            icon="lock"
            title="Authentication Required"
            description="Please sign in with an authorized administrator account to access this tool."
            actionLabel="Sign In"
            onAction={onOpenAuth}
          />
        </div>
      </div>
    );
  }

  if (!isAdminUser(user)) {
    return (
      <div style={{ maxWidth: '40rem', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <EmptyState
            icon="admin_panel_settings"
            title="Admin Access Restricted"
            description="Your account does not have administrator permissions for this page. Note: Backend Row-Level Security (RLS) also enforces write permissions."
            actionLabel="Return Home"
            onAction={() => onNavigate('home')}
          />
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  const [activePath, setActivePath] = useState('home');
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('pph_dark') === 'true'; } catch { return false; }
  });
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState(() => {
    try {
      const raw = sessionStorage.getItem('pph_selectedSubject');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [selectedPaper, setSelectedPaper] = useState(() => {
    try {
      const raw = sessionStorage.getItem('pph_selectedPaper');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [aiQuizParams, setAiQuizParams] = useState(() => {
    try {
      const raw = sessionStorage.getItem('pph_aiQuizParams');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCmdPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Update document title on route changes for SEO and screen-reader announcements
  useEffect(() => {
    let title = PAGE_TITLES[activePath] || 'Page Not Found — COMSATSPrepHub';
    if (activePath === 'subject-papers' && selectedSubject?.code) {
      title = `${selectedSubject.code} — ${selectedSubject.name} Past Papers | COMSATSPrepHub`;
    } else if (activePath === 'paper-view' && selectedPaper?.title) {
      title = `${selectedPaper.title} | COMSATSPrepHub`;
    }
    document.title = title;
  }, [activePath, selectedSubject, selectedPaper]);

  // Initialize Dark Mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('pph_dark', isDark); } catch { /* quota exceeded */ }
  }, [isDark]);

  // Body scroll lock when auth modal is open
  useEffect(() => {
    document.body.style.overflow = isAuthOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isAuthOpen]);

  // Persist sub-page navigation state across refreshes within the same tab
  useEffect(() => {
    try {
      if (selectedSubject) sessionStorage.setItem('pph_selectedSubject', JSON.stringify(selectedSubject));
      else sessionStorage.removeItem('pph_selectedSubject');
    } catch { /* fail silently */ }
  }, [selectedSubject]);

  useEffect(() => {
    try {
      if (selectedPaper) sessionStorage.setItem('pph_selectedPaper', JSON.stringify(selectedPaper));
      else sessionStorage.removeItem('pph_selectedPaper');
    } catch { /* fail silently */ }
  }, [selectedPaper]);

  useEffect(() => {
    try {
      if (aiQuizParams) sessionStorage.setItem('pph_aiQuizParams', JSON.stringify(aiQuizParams));
      else sessionStorage.removeItem('pph_aiQuizParams');
    } catch { /* fail silently */ }
  }, [aiQuizParams]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setUser(data.session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Listen to Browser Back / Forward & Hash changes
  useEffect(() => {
    const syncRouteFromLocation = (e) => {
      const pathFromState = e?.state?.path;
      const pathFromHash = window.location.hash.replace(/^#/, '');
      const targetPath = pathFromState || pathFromHash || 'home';
      // Normalize legacy 'ai-quiz' alias to 'ai-quiz-generator'
      setActivePath(targetPath === 'ai-quiz' ? 'ai-quiz-generator' : targetPath);
    };

    const initialHash = window.location.hash.replace(/^#/, '');
    if (initialHash) {
      setActivePath(initialHash === 'ai-quiz' ? 'ai-quiz-generator' : initialHash);
    } else {
      window.history.replaceState({ path: 'home' }, '', '/');
    }

    window.addEventListener('popstate', syncRouteFromLocation);
    window.addEventListener('hashchange', syncRouteFromLocation);
    return () => {
      window.removeEventListener('popstate', syncRouteFromLocation);
      window.removeEventListener('hashchange', syncRouteFromLocation);
    };
  }, []);

  const handleNavigate = (path) => {
    const normalized = path === 'ai-quiz' ? 'ai-quiz-generator' : path;
    setActivePath(normalized);
    const newUrl = normalized === 'home' ? '/' : `#${normalized}`;
    window.history.pushState({ path: normalized }, '', newUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSubject = (subj) => {
    setSelectedSubject(subj);
    handleNavigate('subject-papers');
  };

  const renderCurrentPage = () => {
    switch (activePath) {
      case 'home':
        return <Home onNavigate={handleNavigate} />;
      case 'about':
        return <About />;
      case 'subjects':
        return <Subjects onSelectSubject={handleSelectSubject} />;
      case 'subject-papers':
        return (
          <SubjectPapers
            subject={selectedSubject || undefined}
            onBack={() => handleNavigate('subjects')}
            onNavigate={handleNavigate}
            onViewPaper={(paper) => {
              setSelectedPaper(paper);
              handleNavigate('paper-view');
            }}
          />
        );
      case 'paper-view':
        return (
          <PaperView
            paper={selectedPaper || undefined}
            onBack={() => handleNavigate('subject-papers')}
            onNavigate={handleNavigate}
          />
        );
      case 'quiz':
        return <Quiz />;
      case 'ai-quiz-generator':
        return (
          <AiQuizGenerator
            onStartAiQuiz={(params) => {
              setAiQuizParams(params);
              handleNavigate('take-ai-quiz');
            }}
          />
        );
      case 'take-ai-quiz':
        return (
          <TakeAiQuiz
            quizParams={aiQuizParams || undefined}
            onFinish={() => handleNavigate('ai-quiz-generator')}
          />
        );
      case 'dashboard':
        return (
          <Dashboard
            user={user || undefined}
            onNavigate={handleNavigate}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        );
      case 'upload':
        return <Upload />;
      case 'auth':
        return (
          <Auth
            onLoginSuccess={(u) => {
              setUser(u);
              handleNavigate('dashboard');
            }}
          />
        );
      case 'terms':
        return <Terms />;
      case 'admin-generate':
        return (
          <AdminGuardView
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            onNavigate={handleNavigate}
          >
            <AdminGenerateQuizzes />
          </AdminGuardView>
        );
      case 'admin-paste':
        return (
          <AdminGuardView
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            onNavigate={handleNavigate}
          >
            <AdminPaste />
          </AdminGuardView>
        );
      case 'gpa':
        return <GpaCalculator />;
      default:
        return (
          <div style={{ maxWidth: '40rem', margin: '4rem auto', padding: '0 1.5rem' }}>
            <div className="card" style={{ padding: '2.5rem 1.5rem' }}>
              <EmptyState
                icon="explore_off"
                title="Page Not Found (404)"
                description={`The page "#${activePath}" could not be found. Use the navigation bar or return to the home workspace.`}
                actionLabel="Back to Home"
                onAction={() => handleNavigate('home')}
              />
            </div>
          </div>
        );
    }
  };

  const handleExecuteCmdAction = async (actionId) => {
    if (actionId === 'toggle_dark_mode') {
      setIsDark(!isDark);
    } else if (actionId === 'open_auth') {
      setIsAuthOpen(true);
    } else if (actionId === 'sign_out') {
      await supabase.auth.signOut();
      handleNavigate('home');
    }
  };

  const reduceMotion = useReducedMotion();

  const [routeDuration] = useState(() => {
    if (typeof window === 'undefined') return 0.24;
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--dur-base')
      .trim();
    if (!value) return 0.24;
    return parseFloat(value) / (value.endsWith('ms') ? 1000 : 1);
  });

  const pageVariants = {
    initial: { opacity: reduceMotion ? 1 : 0 },
    animate: { opacity: 1 },
    exit: { opacity: reduceMotion ? 1 : 0 }
  };

  const pageTransition = {
    duration: reduceMotion ? 0 : routeDuration,
    ease: [0.4, 0, 0.2, 1]
  };

  return (
    <ToastProvider>
      <div className="app-container">
        {/* Accessibility: skip-to-content link */}
        <a href="#main-content" className="skip-link">Skip to content</a>

        <Navbar
          activePath={activePath}
          onNavigate={handleNavigate}
          isDark={isDark}
          onToggleDarkMode={() => setIsDark(!isDark)}
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenCommandPalette={() => setIsCmdPaletteOpen(true)}
        />

        <main className="main-content" id="main-content">
          <ErrorBoundary>
            <Suspense fallback={<RouteLoadingFallback />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePath}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                  style={{ width: '100%' }}
                >
                  {renderCurrentPage()}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>

        <Footer onNavigate={handleNavigate} />

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={(u) => setUser(u)}
        />

        <CommandPalette
          isOpen={isCmdPaletteOpen}
          onClose={() => setIsCmdPaletteOpen(false)}
          onNavigate={handleNavigate}
          onSelectSubject={handleSelectSubject}
          onExecuteAction={handleExecuteCmdAction}
          isLoggedIn={!!user}
        />

        <ScrollTop />
        <InstallPrompt />
      </div>
    </ToastProvider>
  );
}
