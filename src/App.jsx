import React, { useState, useEffect, Suspense, lazy } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import AuthModal from './components/AuthModal/AuthModal';
import ScrollTop from './components/ScrollTop/ScrollTop';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt/InstallPrompt';
import CommandPalette from './components/CommandPalette/CommandPalette';
import CookieNotice from './components/CookieNotice/CookieNotice';
import OfflineBanner from './components/ui/OfflineBanner';
import EmptyState from './components/ui/EmptyState';
import { SkeletonCard } from './components/ui/Skeleton';
import { ToastProvider } from './utils/toast';
import { isAdminUser } from './utils/adminGuard';
import { updatePageSeo } from './utils/seo';
import { getStudentPrefs, saveStudentPrefs, setStudentWorkspaceOwner } from './utils/studyTracker';
import { DEFAULT_SUBJECTS } from './constants/subjects';
import { resolveSubjectFromRoute, getRouteSubjectCode, isPasswordRecoveryUrl } from './utils/routeState';
import { recordRecentCourse } from './utils/fuzzySearch';
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
const StudyHub = lazy(() => import('./pages/StudyHub/StudyHub'));
const FaqContact = lazy(() => import('./pages/FaqContact/FaqContact'));
const Account = lazy(() => import('./pages/Account/Account'));

const ROUTE_ALIASES = {
  'ai-quiz': 'ai-quiz-generator',
  'daily-challenge': 'study-hub',
  flashcards: 'study-hub',
  'study-helper': 'study-hub',
  team: 'about'
};

function normalizeRoute(path = 'home') {
  const withoutHash = String(path || 'home').replace(/^[#/]+/, '').split('?')[0].trim();
  return ROUTE_ALIASES[withoutHash] || withoutHash || 'home';
}

function getCourseCodeFromLocation() {
  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('code')) return searchParams.get('code').toUpperCase();
  const hashQuery = window.location.hash.split('?')[1];
  if (hashQuery) {
    const hashParams = new URLSearchParams(hashQuery);
    if (hashParams.get('code')) return hashParams.get('code').toUpperCase();
  }
  return null;
}

function RouteLoadingFallback() {
  return (
    <div
      className="route-loading-grid"
      role="status"
      aria-live="polite"
      aria-label="Loading page content"
    >
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

function AdminGuardView({ user, onOpenAuth, onNavigate, children }) {
  if (!user) {
    return (
      <div className="guard-shell">
        <div className="card guard-card">
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
      <div className="guard-shell">
        <div className="card guard-card">
          <EmptyState
            icon="admin_panel_settings"
            title="Admin Access Restricted"
            description={`Signed in as "${user.email}". This email is not in the administrator allowlist (VITE_ADMIN_EMAILS) or Supabase admin role.`}
            actionLabel="Switch Account"
            onAction={onOpenAuth}
          />
          <div className="guard-return-row">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="guard-return-btn"
            >
              Return Home
            </button>
          </div>
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
  const [lang, setLang] = useState(() => getStudentPrefs().lang || 'en');
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const [examActive, setExamActive] = useState(false);
  const [pendingPaper, setPendingPaper] = useState(null);
  const [passwordRecovery, setPasswordRecovery] = useState(() => (
    typeof window !== 'undefined' && isPasswordRecoveryUrl(window.location.hash, window.location.search)
  ));

  const [selectedSubject, setSelectedSubject] = useState(() => {
    try {
      const match = resolveSubjectFromRoute(getCourseCodeFromLocation(), DEFAULT_SUBJECTS);
      if (match) return match;
      const raw = sessionStorage.getItem('pph_selectedSubject');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' && parsed.code ? parsed : null;
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

  // Update document title, meta description, canonical URL, and Open Graph tags on route changes
  useEffect(() => {
    updatePageSeo(activePath, { selectedSubject, selectedPaper });
  }, [activePath, selectedSubject, selectedPaper]);

  // Initialize Dark Mode + sync document color-scheme & browser theme-color
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#090e1a' : '#f7f8fa');
    }
    try { localStorage.setItem('pph_dark', isDark); } catch { /* quota exceeded */ }
  }, [isDark]);

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
      setStudentWorkspaceOwner(data?.session?.user?.id || null);
      setUser(data?.session?.user ?? null);
      setAuthReady(true);
      if (data?.session?.user && sessionStorage.getItem('pph_pendingPaper') === 'true') {
        setActivePath('paper-view');
        window.history.replaceState({ path: 'paper-view' }, '', '#paper-view');
      }
    }).catch(() => {
      setStudentWorkspaceOwner(null);
      setAuthReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setStudentWorkspaceOwner(session?.user?.id || null);
      setUser(session?.user ?? null);
      setAuthReady(true);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setActivePath('account');
      }
      if (session?.user && sessionStorage.getItem('pph_pendingPaper') === 'true') {
        setActivePath('paper-view');
        window.history.replaceState({ path: 'paper-view' }, '', '#paper-view');
      }
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
      const code = getRouteSubjectCode(e, getCourseCodeFromLocation());
      const matched = resolveSubjectFromRoute(code, DEFAULT_SUBJECTS);
      if (matched) setSelectedSubject(matched);
      setActivePath(normalizeRoute(targetPath));
    };

    const initialCode = getCourseCodeFromLocation();
    const initialSubject = resolveSubjectFromRoute(initialCode, DEFAULT_SUBJECTS);
    if (initialSubject) setSelectedSubject(initialSubject);

    const initialHash = window.location.hash.replace(/^#/, '');
    const initialPathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (isPasswordRecoveryUrl(window.location.hash, window.location.search)) {
      setPasswordRecovery(true);
      setActivePath('account');
    } else if (initialHash) {
      setActivePath(normalizeRoute(initialHash));
    } else if (initialPathname) {
      setActivePath(normalizeRoute(initialPathname));
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

  const reduceMotion = useReducedMotion();

  const runViewTransition = (updateFn) => {
    if (
      typeof document !== 'undefined' &&
      typeof document.startViewTransition === 'function' &&
      !reduceMotion
    ) {
      document.startViewTransition(() => {
        flushSync(updateFn);
      });
    } else {
      updateFn();
    }
  };

  const handleNavigate = (path) => {
    const [rawPath, rawQuery] = String(path).split('?');
    const normalized = normalizeRoute(rawPath);
    runViewTransition(() => {
      setActivePath(normalized);
    });
    const querySuffix = rawQuery ? `?${rawQuery}` : '';
    const newUrl = normalized === 'home' ? '/' : `#${normalized}${querySuffix}`;
    window.history.pushState({ path: normalized }, '', newUrl);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
  };

  const handleSelectSubject = (subj) => {
    recordRecentCourse(subj);
    runViewTransition(() => {
      setSelectedSubject(subj);
      setActivePath('subject-papers');
    });
    const codeParam = subj?.code ? `?code=${encodeURIComponent(subj.code)}` : '';
    window.history.pushState({ path: 'subject-papers', code: subj?.code }, '', `#subject-papers${codeParam}`);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
  };

  const handleToggleLanguage = () => {
    const next = lang === 'en' ? 'ur' : 'en';
    setLang(next);
    saveStudentPrefs({ lang: next });
  };

  const renderCurrentPage = () => {
    switch (activePath) {
      case 'home':
        return (
          <Home
            onNavigate={handleNavigate}
            onSelectSubject={handleSelectSubject}
            onOpenCommandPalette={() => setIsCmdPaletteOpen(true)}
            user={user}
            isDark={isDark}
          />
        );
      case 'about':
      case 'team':
        return <About />;
      case 'subjects':
        return (
          <Subjects
            onSelectSubject={handleSelectSubject}
            onNavigate={handleNavigate}
            onViewPaper={(paper) => {
              setSelectedPaper(paper);
              handleNavigate('paper-view');
            }}
          />
        );
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
            onStartPaperQuiz={(params) => {
              setAiQuizParams(params);
              handleNavigate('take-ai-quiz');
            }}
            user={user}
            authReady={authReady}
            onRequireAuth={() => {
              setPendingPaper(selectedPaper);
              sessionStorage.setItem('pph_pendingPaper', 'true');
              setIsAuthOpen(true);
            }}
          />
        );
      case 'quiz':
        return <Quiz onExamActiveChange={setExamActive} />;
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
      case 'study-hub':
        return <StudyHub />;
      case 'dashboard':
        return (
          <Dashboard
            user={user || undefined}
            onNavigate={handleNavigate}
            onOpenAuth={() => setIsAuthOpen(true)}
            onStartTargetedDrill={(params) => {
              setAiQuizParams(params);
              handleNavigate('take-ai-quiz');
            }}
          />
        );
      case 'account':
        return (
          <Account
            user={user}
            onNavigate={handleNavigate}
            onOpenAuth={() => setIsAuthOpen(true)}
            passwordRecovery={passwordRecovery}
            onPasswordUpdated={() => {
              setPasswordRecovery(false);
              window.history.replaceState({ path: 'account' }, '', '#account');
            }}
          />
        );
      case 'upload':
        return <Upload />;
      case 'faq':
      case 'contact':
        return <FaqContact />;
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
        return <Terms section="terms" />;
      case 'privacy':
        return <Terms section="privacy" />;
      case 'disclaimer':
        return <Terms section="disclaimer" />;
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
            <AdminPaste user={user} onNavigate={handleNavigate} onSelectSubject={handleSelectSubject} onSelectPaper={setSelectedPaper} />
          </AdminGuardView>
        );
      case 'gpa':
        return <GpaCalculator />;
      default:
        return (
          <div className="notfound-shell">
            <div className="card notfound-card">
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
    } else if (actionId === 'toggle_language') {
      handleToggleLanguage();
    } else if (actionId === 'open_auth') {
      setIsAuthOpen(true);
    } else if (actionId === 'sign_out') {
      await supabase.auth.signOut();
      handleNavigate('home');
    }
  };

  const routeDuration = 0.22;

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
      <div className={`app-container${examActive ? ' app-container--exam' : ''}`}>
        {/* Accessibility: skip-to-content link */}
        <a
          href="#main-content"
          className="skip-link"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
        >
          Skip to content
        </a>

        <OfflineBanner />

        {!examActive && (
          <Navbar
            activePath={activePath}
            onNavigate={handleNavigate}
            isDark={isDark}
            onToggleDarkMode={() => setIsDark(!isDark)}
            lang={lang}
            onToggleLanguage={handleToggleLanguage}
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenCommandPalette={() => setIsCmdPaletteOpen(true)}
          />
        )}

        <main className="main-content" id="main-content" tabIndex={-1}>
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
                  className="main-motion-shell"
                >
                  {renderCurrentPage()}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>

        {!examActive && <Footer onNavigate={handleNavigate} />}

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={(u) => {
            setUser(u);
            if (pendingPaper) {
              setPendingPaper(null);
              sessionStorage.removeItem('pph_pendingPaper');
              setIsAuthOpen(false);
              handleNavigate('paper-view');
            }
          }}
        />

        <CommandPalette
          isOpen={isCmdPaletteOpen}
          onClose={() => setIsCmdPaletteOpen(false)}
          onNavigate={handleNavigate}
          onSelectSubject={handleSelectSubject}
          onSelectPaper={(paper) => {
            setSelectedPaper(paper);
            handleNavigate('paper-view');
          }}
          onExecuteAction={handleExecuteCmdAction}
          isLoggedIn={!!user}
        />

        {!examActive && (
          <>
            <CookieNotice onNavigate={handleNavigate} />
            <ScrollTop />
            <InstallPrompt />
          </>
        )}
      </div>
    </ToastProvider>
  );
}
