import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import AuthModal from './components/AuthModal/AuthModal';
import ScrollTop from './components/ScrollTop/ScrollTop';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt/InstallPrompt';
import { ToastProvider } from './utils/toast';

import Home from './pages/Home/Home';
import About from './pages/About/About';
import Subjects from './pages/Subjects/Subjects';
import SubjectPapers from './pages/SubjectPapers/SubjectPapers';
import PaperView from './pages/PaperView/PaperView';
import Quiz from './pages/Quiz/Quiz';
import AiQuizGenerator from './pages/AiQuizGenerator/AiQuizGenerator';
import TakeAiQuiz from './pages/TakeAiQuiz/TakeAiQuiz';
import Dashboard from './pages/Dashboard/Dashboard';
import Upload from './pages/Upload/Upload';
import Auth from './pages/Auth/Auth';
import Terms from './pages/Terms/Terms';
import AdminGenerateQuizzes from './pages/AdminGenerateQuizzes/AdminGenerateQuizzes';
import AdminPaste from './pages/AdminPaste/AdminPaste';
import GpaCalculator from './pages/GpaCalculator/GpaCalculator';

import CommandPalette from './components/CommandPalette/CommandPalette';
import { supabase } from './services/supabase';
import './App.css';

export default function App() {
  const [activePath, setActivePath] = useState('home');
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('pph_dark') === 'true'; } catch { return false; }
  });
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

  // Lazy initialisers — restore from sessionStorage so sub-page navigation
  // survives a page refresh or browser-back within the same tab session.
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

  // Initialize Dark Mode & Supabase User Session
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
    } catch { /* quota exceeded or private-mode restriction — fail silently */ }
  }, [selectedSubject]);

  useEffect(() => {
    try {
      if (selectedPaper) sessionStorage.setItem('pph_selectedPaper', JSON.stringify(selectedPaper));
      else sessionStorage.removeItem('pph_selectedPaper');
    } catch { /* quota exceeded or private-mode restriction — fail silently */ }
  }, [selectedPaper]);

  useEffect(() => {
    try {
      if (aiQuizParams) sessionStorage.setItem('pph_aiQuizParams', JSON.stringify(aiQuizParams));
      else sessionStorage.removeItem('pph_aiQuizParams');
    } catch { /* quota exceeded or private-mode restriction — fail silently */ }
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

  // Listen to Browser Back / Forward & Mouse Back buttons
  useEffect(() => {
    const handlePopState = (e) => {
      const pathFromState = e.state?.path;
      const pathFromHash = window.location.hash.replace('#', '');
      const targetPath = pathFromState || pathFromHash || 'home';
      setActivePath(targetPath);
    };

    // Read initial route on page load
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash) {
      setActivePath(initialHash);
    } else {
      window.history.replaceState({ path: 'home' }, '', '/');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path) => {
    setActivePath(path);
    const newUrl = path === 'home' ? '/' : `#${path}`;
    window.history.pushState({ path }, '', newUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentPage = () => {
    switch (activePath) {
      case 'home':
        return <Home onNavigate={handleNavigate} />;
      case 'about':
        return <About />;
      case 'subjects':
        return (
          <Subjects
            onSelectSubject={(subj) => {
              setSelectedSubject(subj);
              handleNavigate('subject-papers');
            }}
          />
        );
      case 'subject-papers':
        return (
          <SubjectPapers
            subject={selectedSubject || undefined}
            onBack={() => handleNavigate('subjects')}
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
        return <Dashboard user={user || undefined} onNavigate={handleNavigate} />;
      case 'upload':
        return <Upload />;
      case 'auth':
        return <Auth onLoginSuccess={(u) => { setUser(u); handleNavigate('dashboard'); }} />;
      case 'terms':
        return <Terms />;
      case 'admin-generate':
        return <AdminGenerateQuizzes />;
      case 'admin-paste':
        return <AdminPaste />;
      case 'gpa':
        return <GpaCalculator />;
      default:
        return <Home onNavigate={handleNavigate} />;
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

  // Page transition animation settings — tuned specs with explicit reduced-motion handling
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
          onExecuteAction={handleExecuteCmdAction}
          isLoggedIn={!!user}
        />

        <ScrollTop />
        <InstallPrompt />
      </div>
    </ToastProvider>
  );
}
