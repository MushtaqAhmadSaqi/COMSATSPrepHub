import React, { useState, useEffect } from 'react';
import { generateExamPaperQuestions } from '../../services/geminiService';
import { fetchQuestionsForPaperFromSupabase } from '../../services/papersService';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import './PaperView.css';

export default function PaperView({
  paper = { title: 'Terminal Examination — Fall 2023', term: 'Terminal', year: '2023', file_url: null, subjectName: '', subjectCode: '' },
  onBack = () => {}
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionSource, setQuestionSource] = useState('supabase');
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [readProgress, setReadProgress] = useState(0);

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) { setReadProgress(0); return; }
      const progress = Math.min(1, Math.max(0, window.scrollY / totalHeight));
      setReadProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load questions: Supabase first, AI fallback
  useEffect(() => {
    let isMounted = true;
    async function loadPaperQuestions() {
      setLoading(true);
      setExpandedAnswers({});
      try {
        if (paper.id) {
          const dbQuestions = await fetchQuestionsForPaperFromSupabase(paper.id);
          if (isMounted && dbQuestions.length > 0) {
            setQuestions(dbQuestions);
            setQuestionSource('supabase');
            setLoading(false);
            return;
          }
        }

        // Fallback: AI-generated questions
        const generated = await generateExamPaperQuestions({
          subjectName: paper.subjectName || paper.title || 'Course Exam',
          subjectCode: paper.subjectCode || '',
          paperTitle: paper.title || '',
          term: paper.term || 'Terminal',
          year: paper.year || '2023'
        });
        if (isMounted) {
          setQuestions(generated || []);
          setQuestionSource('ai');
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load paper questions:', err);
        if (isMounted) setLoading(false);
      }
    }
    loadPaperQuestions();
    return () => { isMounted = false; };
  }, [paper.id, paper.title, paper.subjectName, paper.subjectCode, paper.term, paper.year]);

  const toggleAnswer = (id) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded =
    questions.length > 0 && questions.every((q) => Boolean(expandedAnswers[q.id]));

  const toggleAll = () => {
    const nextState = !allExpanded;
    const newExpanded = {};
    questions.forEach((q) => { newExpanded[q.id] = nextState; });
    setExpandedAnswers(newExpanded);
  };

  const handleDownload = () => {
    if (paper.file_url) {
      window.open(paper.file_url, '_blank');
    } else {
      window.print();
    }
  };

  const displaySubject = paper.subjectName || (paper.title ? paper.title.split('—')[0].trim() : 'Subject Exam');
  const totalMarks = paper.totalMarks ? `${paper.totalMarks} Marks` : '50 Marks';
  const isSupabaseSource = questionSource === 'supabase';

  const breadcrumbItems = [
    { label: 'Subjects', onClick: () => { window.location.hash = 'subjects'; } },
    { label: displaySubject, onClick: onBack },
    { label: paper.title || 'Paper View' }
  ];

  return (
    <div className="paperview-container">
      {/* Reading progress bar */}
      <div
        className="paperview-progress-bar"
        style={{ transform: `scaleX(${readProgress})` }}
        aria-hidden="true"
      />

      {/* Top Action Bar */}
      <div className="paperview-top-actions">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="paperview-action-group">
          <button
            type="button"
            className="paperview-btn-secondary"
            onClick={toggleAll}
            disabled={loading || questions.length === 0}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {allExpanded ? 'visibility_off' : 'visibility'}
            </span>
            {allExpanded ? 'Hide All Solutions' : 'Show All Solutions'}
          </button>
          <button type="button" className="btn-download" onClick={handleDownload}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
            Download PDF / Print
          </button>
        </div>
      </div>

      {/* COMSATS Official Exam Paper Header */}
      <div className="paperview-exam-sheet">
        <div className="paperview-sheet-header">
          <div className="paperview-univ-title">COMSATS UNIVERSITY ISLAMABAD</div>
          <div className="paperview-exam-term">{paper.term || 'Terminal'} Examination — {paper.year || '2023'}</div>
          <div className="paperview-meta-grid">
            <div><strong>Subject:</strong> {displaySubject} {paper.subjectCode ? `(${paper.subjectCode})` : ''}</div>
            <div><strong>Total Marks:</strong> {totalMarks}</div>
            <div><strong>Time Allowed:</strong> 3 Hours</div>
            <div><strong>Semester:</strong> {paper.semester || paper.year || '2023'}</div>
          </div>
        </div>

        {/* PDF Viewer Embed — only shown when a real file URL exists */}
        {paper.file_url && (
          <div style={{ margin: '1.5rem 0', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <iframe
              src={paper.file_url}
              title={paper.title}
              width="100%"
              height="500px"
              style={{ border: 'none' }}
            />
          </div>
        )}

        {/* Questions & Answers Section */}
        <div className="paperview-questions-section">
          <div className="paperview-questions-header">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text)' }}>
              {isSupabaseSource ? 'Past paper questions & solutions' : 'AI practice questions & solutions'}
            </h3>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand)', background: 'var(--brand-soft)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>
              {isSupabaseSource ? 'Loaded from database' : 'AI-generated fallback'}
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-subtle)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', animation: 'spin 1s linear infinite' }}>
                progress_activity
              </span>
              <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Loading paper questions…</p>
            </div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-subtle)' }}>
              <p>No questions found for this paper.</p>
            </div>
          ) : (
            questions.map((q) => {
              const isExpanded = Boolean(expandedAnswers[q.id]);
              return (
                <div key={q.id} className="paperview-question-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="paperview-q-badge">{q.number}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-subtle)' }}>{q.marks}</span>
                  </div>

                  <div className="paperview-q-section">{q.section}</div>
                  <div className="paperview-q-text">{q.questionText}</div>

                  {Array.isArray(q.subParts) && q.subParts.length > 0 && (
                    <ul className="paperview-subparts-list">
                      {q.subParts.map((part, partIdx) => (
                        <li key={partIdx}>{String(part)}</li>
                      ))}
                    </ul>
                  )}

                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <ol className="paperview-options-list" type="A">
                      {q.options.map((option, optionIdx) => (
                        <li key={optionIdx}>{String(option)}</li>
                      ))}
                    </ol>
                  )}

                  {/* Solution Toggle */}
                  <button
                    type="button"
                    className="paperview-toggle-sol-btn"
                    onClick={() => toggleAnswer(q.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {isExpanded ? 'expand_less' : 'key'}
                    </span>
                    {isExpanded ? 'Hide suggested solution' : 'View suggested solution'}
                  </button>

                  {/* Solution Content */}
                  {isExpanded && (
                    <div className="paperview-answer-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#10b981', fontWeight: 800, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                        Suggested answer:
                      </div>
                      <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.9375rem', lineHeight: '1.65' }}>
                        {q.answerText}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Download Footer Section */}
        <div className="paperview-download-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontWeight: 800, fontSize: '1.0625rem', marginBottom: '0.25rem' }}>Need Offline PDF Copy?</h4>
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem' }}>Download or print this full examination paper with solutions for offline study.</p>
            </div>
            <button type="button" className="btn-download" onClick={handleDownload}>
              <span className="material-symbols-outlined">download</span>
              Download PDF / Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
