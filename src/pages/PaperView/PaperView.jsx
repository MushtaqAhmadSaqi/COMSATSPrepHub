import React, { useState, useEffect } from 'react';
import { generateExamPaperQuestions } from '../../services/geminiService';
import './PaperView.css';

export default function PaperView({
  paper = { title: 'Terminal Examination — Fall 2023', term: 'Terminal', year: '2023', file_url: null, subjectName: '', subjectCode: '' },
  onBack = () => {}
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadPaperQuestions() {
      setLoading(true);
      try {
        const generated = await generateExamPaperQuestions({
          subjectName: paper.subjectName || paper.title || 'Course Exam',
          subjectCode: paper.subjectCode || '',
          paperTitle: paper.title || '',
          term: paper.term || 'Terminal',
          year: paper.year || '2023'
        });
        if (isMounted) {
          setQuestions(generated || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load paper questions:', err);
        if (isMounted) setLoading(false);
      }
    }
    loadPaperQuestions();
    return () => { isMounted = false; };
  }, [paper.title, paper.subjectName, paper.subjectCode, paper.term, paper.year]);

  const toggleAnswer = (id) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    const nextState = !showAllAnswers;
    setShowAllAnswers(nextState);
    const newExpanded = {};
    questions.forEach((q) => {
      newExpanded[q.id] = nextState;
    });
    setExpandedAnswers(newExpanded);
  };

  const handleDownload = () => {
    if (paper.file_url) {
      window.open(paper.file_url, '_blank');
    } else {
      window.print();
    }
  };

  const displaySubject = paper.subjectName || (paper.title ? paper.title.split('—')[0] : 'Subject Exam');

  return (
    <div className="paperview-container">
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button type="button" className="btn-back" onClick={onBack} style={{ marginBottom: 0 }}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Papers
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="paperview-btn-secondary" onClick={toggleAll}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {showAllAnswers ? 'visibility_off' : 'visibility'}
            </span>
            {showAllAnswers ? 'Hide All Solutions' : 'Show All Solutions'}
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
            <div><strong>Total Marks:</strong> 50 Marks</div>
            <div><strong>Time Allowed:</strong> 3 Hours</div>
            <div><strong>Semester:</strong> {paper.year || '2023'}</div>
          </div>
        </div>

        {/* PDF Viewer Embed if URL exists */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text)' }}>
              Examination Questions & Solutions
            </h3>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand)', background: 'var(--brand-soft)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
              Verified Solution Key
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-subtle)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', animation: 'spin 1s linear infinite' }}>
                progress_activity
              </span>
              <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Generating questions & verified solutions for {displaySubject}...</p>
            </div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-subtle)' }}>
              <p>No questions generated for this paper.</p>
            </div>
          ) : (
            questions.map((q) => {
              const isExpanded = showAllAnswers || expandedAnswers[q.id];
              return (
                <div key={q.id} className="paperview-question-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="paperview-q-badge">{q.number}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-subtle)' }}>{q.marks}</span>
                  </div>

                  <div className="paperview-q-section">{q.section}</div>
                  <div className="paperview-q-text">{q.questionText}</div>

                  {/* Solution Toggle */}
                  <button
                    type="button"
                    className="paperview-toggle-sol-btn"
                    onClick={() => toggleAnswer(q.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {isExpanded ? 'expand_less' : 'key'}
                    </span>
                    {isExpanded ? 'Hide Solution' : 'View Verified Solution Key'}
                  </button>

                  {/* Solution Content */}
                  {isExpanded && (
                    <div className="paperview-answer-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#10b981', fontWeight: 800, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                        Model Answer & Marking Scheme:
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
