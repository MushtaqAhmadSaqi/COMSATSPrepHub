import React, { useState, useEffect } from 'react';
import {
  fetchQuestionsForPaperFromSupabase
} from '../../services/papersService';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import './PaperView.css';

/* ── Question text renderer ─────────────────────────────── */

function QuestionText({ text }) {
  const original = String(text ?? '').replace(/\r\n?/g, '\n');

  // Add paragraph breaks before explicit Task labels, unless code blocks present
  const formatted = original.includes('```')
    ? original
    : original.replace(
        /([^\n])[ \t]+(?=Task\s*[-–]?\s*\d+\s*:)/gi,
        '$1\n\n'
      );

  const paragraphs = formatted
    .split(/\n[ \t]*\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  return (
    <div className="paperview-question-content">
      {paragraphs.map((paragraph, index) => {
        const task = paragraph.match(
          /^(Task\s*[-–]?\s*\d+\s*:)\s*([\s\S]*)$/i
        );

        if (task) {
          return (
            <div className="paperview-task" key={index}>
              <strong className="paperview-task-label">{task[1]}</strong>
              <p>{task[2]}</p>
            </div>
          );
        }

        return <p key={index}>{paragraph}</p>;
      })}
    </div>
  );
}

function getPartText(part) {
  if (part == null) return '';
  if (typeof part !== 'object') return String(part);

  const text =
    part.text ??
    part.question_text ??
    part.questionText ??
    part.question;

  if (text != null) {
    return [part.label, text].filter(Boolean).join(' ');
  }

  return JSON.stringify(part, null, 2);
}

/* ── Lightweight markdown renderer ──────────────────────── */
// Handles: headings (###), **bold**, *italic*, `code`,
// - / * bullet lists, numbered lists, blank line paragraphs,
// and horizontal rules. No external dependency needed.

function renderInline(text) {
  // We process inline patterns: **bold**, *italic*, `code`
  const parts = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      parts.push(<code key={match.index} className="paperview-inline-code">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function MarkdownAnswer({ text }) {
  const raw = String(text ?? '').replace(/\r\n?/g, '\n');
  const lines = raw.split('\n');

  const elements = [];
  let i = 0;
  let listBuffer = null; // { type: 'ul'|'ol', items: [jsx] }

  const flushList = () => {
    if (!listBuffer) return;
    const Tag = listBuffer.type;
    elements.push(
      <Tag key={`list-${i}`} className="paperview-md-list">
        {listBuffer.items}
      </Tag>
    );
    listBuffer = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    const heading = line.match(/^(#{1,4})\s+(.+)/);
    if (heading) {
      flushList();
      const level = Math.min(heading[1].length, 4);
      const Tag = `h${level}`;
      elements.push(
        <Tag key={i} className={`paperview-md-h${level}`}>
          {renderInline(heading[2])}
        </Tag>
      );
      i++; continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      flushList();
      elements.push(<hr key={i} className="paperview-md-hr" />);
      i++; continue;
    }

    // Unordered list item
    const ulItem = line.match(/^[\s]*[-*+]\s+(.*)/);
    if (ulItem) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(
        <li key={i}>{renderInline(ulItem[1])}</li>
      );
      i++; continue;
    }

    // Ordered list item
    const olItem = line.match(/^[\s]*\d+\.\s+(.*)/);
    if (olItem) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(
        <li key={i}>{renderInline(olItem[1])}</li>
      );
      i++; continue;
    }

    // Blank line
    if (line.trim() === '') {
      flushList();
      i++; continue;
    }

    // Plain paragraph
    flushList();
    elements.push(
      <p key={i} className="paperview-md-p">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  flushList();

  return <div className="paperview-md-body">{elements}</div>;
}

/* ── Component ──────────────────────────────────────────── */

export default function PaperView({
  paper = {
    title: 'Terminal Examination — Fall 2023',
    term: 'Terminal',
    year: '2023',
    file_url: null,
    subjectName: '',
    subjectCode: ''
  },
  onBack = () => {}
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [readProgress, setReadProgress] = useState(0);

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) { setReadProgress(0); return; }
      setReadProgress(Math.min(1, Math.max(0, window.scrollY / totalHeight)));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load questions
  useEffect(() => {
    let cancelled = false;

    async function loadStoredQuestions() {
      setLoading(true);
      setError(null);
      setQuestions([]);
      setExpandedAnswers({});

      try {
        const rows = await fetchQuestionsForPaperFromSupabase(paper?.id);
        if (!cancelled) setQuestions(rows);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to retrieve this paper.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStoredQuestions();
    return () => { cancelled = true; };
  }, [paper?.id, reloadKey]);

  const toggleAnswer = (id) => {
    setExpandedAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded =
    questions.length > 0 && questions.every(q => Boolean(expandedAnswers[q.id]));

  const toggleAll = () => {
    const nextState = !allExpanded;
    const next = {};
    questions.forEach(q => { next[q.id] = nextState; });
    setExpandedAnswers(next);
  };

  const handleDownload = () => {
    if (paper.file_url) {
      window.open(paper.file_url, '_blank');
    } else {
      window.print();
    }
  };

  // Metadata — no invented defaults
  const displaySubject =
    paper.subjectName || paper.subjectCode || 'Past paper';

  const totalMarks =
    paper.totalMarks !== null &&
    paper.totalMarks !== undefined &&
    paper.totalMarks !== ''
      ? `${paper.totalMarks} Marks`
      : 'Not specified';

  const breadcrumbItems = [
    { label: 'Subjects', onClick: () => { window.location.hash = 'subjects'; } },
    { label: displaySubject, onClick: onBack },
    { label: paper.title || 'Paper View' }
  ];

  return (
    <div className="paperview-container">
      {/* Reading progress */}
      <div
        className="paperview-progress-bar"
        style={{ transform: `scaleX(${readProgress})` }}
        aria-hidden="true"
      />

      {/* Toolbar */}
      <div className="paperview-top-actions">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="paperview-action-group">
          <button
            type="button"
            className="paperview-btn-secondary"
            onClick={toggleAll}
            disabled={loading || questions.length === 0}
          >
            <span className="material-symbols-outlined">
              {allExpanded ? 'visibility_off' : 'visibility'}
            </span>
            {allExpanded ? 'Hide all answers' : 'Show all answers'}
          </button>

          <button
            type="button"
            className="btn-download"
            onClick={handleDownload}
          >
            <span className="material-symbols-outlined">download</span>
            Download / Print
          </button>
        </div>
      </div>

      {/* Exam sheet */}
      <div className="paperview-exam-sheet">
        <div className="paperview-sheet-header">
          <div className="paperview-univ-title">
            COMSATS UNIVERSITY ISLAMABAD
          </div>

          <div className="paperview-exam-term">
            {paper.title || 'Past examination paper'}
          </div>

          <div className="paperview-meta-grid">
            <div>
              <strong>Subject</strong>
              <span>
                {displaySubject}
                {paper.subjectCode && paper.subjectName
                  ? ` (${paper.subjectCode})`
                  : ''}
              </span>
            </div>

            <div>
              <strong>Total marks</strong>
              <span>{totalMarks}</span>
            </div>

            <div>
              <strong>Year</strong>
              <span>{paper.year || 'Not specified'}</span>
            </div>

            <div>
              <strong>Semester</strong>
              <span>{paper.semester || 'Not specified'}</span>
            </div>
          </div>
        </div>

        {/* PDF embed */}
        {paper.file_url && (
          <div style={{
            margin: '1.5rem 0',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}>
            <iframe
              src={paper.file_url}
              title={paper.title}
              width="100%"
              height="500px"
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        )}

        {/* Questions */}
        <div className="paperview-questions-section">
          <div className="paperview-questions-header">
            <div>
              <h2>Questions & model answers</h2>
              <p>Work through each question at your own pace.</p>
            </div>

            {!loading && !error && questions.length > 0 && (
              <span className="paperview-question-count">
                {questions.length}{' '}
                {questions.length === 1 ? 'question' : 'questions'}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '2.5rem', animation: 'spin 1s linear infinite', display: 'block' }}
              >
                progress_activity
              </span>
              <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>
                Loading saved questions…
              </p>
            </div>
          ) : error ? (
            <div role="alert" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <p>{error}</p>
              <button
                type="button"
                className="paperview-btn-secondary"
                style={{ marginTop: '1rem' }}
                onClick={() => setReloadKey(v => v + 1)}
              >
                Try again
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <p>No saved questions were found for this paper.</p>
            </div>
          ) : (
            questions.map((q, index) => {
              const isExpanded = Boolean(expandedAnswers[q.id]);
              const answerId = `paper-answer-${q.id}`;
              const headingId = `paper-question-${q.id}`;

              return (
                <article
                  key={q.id}
                  className="paperview-question-card"
                  aria-labelledby={headingId}
                >
                  <header className="paperview-question-top">
                    <div className="paperview-question-identity">
                      <span className="paperview-question-index" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div>
                        <h3 className="paperview-question-title" id={headingId}>
                          {q.number || `Question ${index + 1}`}
                        </h3>

                        {q.section && (
                          <p className="paperview-q-section">{q.section}</p>
                        )}
                      </div>
                    </div>

                    {q.marks && (
                      <span className="paperview-marks">{q.marks}</span>
                    )}
                  </header>

                  <div className="paperview-question-body">
                    <QuestionText text={q.questionText} />

                    {Array.isArray(q.subParts) && q.subParts.length > 0 && (
                      <section className="paperview-subparts" aria-label="Question subparts">
                        <h4 className="paperview-small-heading">Subparts</h4>
                        <ol className="paperview-subparts-list" type="a">
                          {q.subParts.map((part, partIndex) => (
                            <li key={partIndex}>
                              <QuestionText text={getPartText(part)} />
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}

                    {Array.isArray(q.options) && q.options.length > 0 && (
                      <section className="paperview-options" aria-label="Answer options">
                        <h4 className="paperview-small-heading">Choose an answer</h4>
                        <ol className="paperview-options-list" type="A">
                          {q.options.map((option, optionIndex) => (
                            <li key={optionIndex}>{getPartText(option)}</li>
                          ))}
                        </ol>
                      </section>
                    )}
                  </div>

                  <footer className="paperview-question-footer">
                    <button
                      type="button"
                      className="paperview-toggle-sol-btn"
                      onClick={() => toggleAnswer(q.id)}
                      aria-expanded={isExpanded}
                      aria-controls={answerId}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {isExpanded ? 'expand_less' : 'lightbulb'}
                      </span>
                      {isExpanded ? 'Hide model answer' : 'View model answer'}
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {isExpanded ? 'remove' : 'add'}
                      </span>
                    </button>

                    <span className="paperview-answer-tip">
                      Try solving it before revealing the answer.
                    </span>
                  </footer>

                  <section
                    id={answerId}
                    className="paperview-answer-box"
                    hidden={!isExpanded}
                    aria-label={`Model answer for ${q.number || `Question ${index + 1}`}`}
                  >
                    <div className="paperview-answer-heading">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        school
                      </span>
                      <h4>Model answer</h4>
                    </div>

                    <MarkdownAnswer
                      text={q.answerText || 'No model answer is available yet.'}
                    />
                  </section>
                </article>
              );
            })
          )}
        </div>

        {/* Download footer */}
        <div className="paperview-download-footer">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ fontWeight: 800, fontSize: '1.0625rem', marginBottom: '0.25rem' }}>
                Need an offline copy?
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                Download or print this paper with its model answers for offline study.
              </p>
            </div>

            <button type="button" className="btn-download" onClick={handleDownload}>
              <span className="material-symbols-outlined">download</span>
              Download / Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
