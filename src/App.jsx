import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import AuthModal from './components/AuthModal/AuthModal';

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

import { supabase } from './services/supabase';
import './App.css';

export default function App() {
  const [activePath, setActivePath] = useState('home');
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [aiQuizParams, setAiQuizParams] = useState(null);

  // Initialize Dark Mode & Supabase User Session
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

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
            onFinish={() => handleNavigate('dashboard')}
          />
        );
      case 'dashboard':
        return <Dashboard user={user || undefined} />;
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

  return (
    <div className="app-container">
      <Navbar
        activePath={activePath}
        onNavigate={handleNavigate}
        isDark={isDark}
        onToggleDarkMode={() => setIsDark(!isDark)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <main className="main-content">
        {renderCurrentPage()}
      </main>

      <Footer onNavigate={handleNavigate} />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(u) => setUser(u)}
      />
    </div>
  );
}
