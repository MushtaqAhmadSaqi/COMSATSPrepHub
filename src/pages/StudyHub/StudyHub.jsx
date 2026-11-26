import React, { useEffect, useRef, useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import {
  getDailyChallengeStatus,
  recordDailyChallengeCompletion,
  getFlashcardsQueue,
  getDueFlashcards,
  reviewFlashcard,
  addCustomFlashcard,
  getRevisionDeckIds,
  toggleRevisionCard
} from '../../utils/studyTracker';
import { toast } from '../../utils/toast';
import AppIcon from '../../components/ui/AppIcon';
import './StudyHub.css';

const SAMPLE_DAILY_QUESTIONS = [
  {
    q: 'In OOP, which principle promotes code reuse and hierarchical classification?',
    options: ['Polymorphism', 'Encapsulation', 'Inheritance', 'Abstraction'],
    answer: 2,
    explanation: 'Inheritance allows a new class to inherit attributes and methods from an existing class.'
  },
  {
    q: 'What is the time complexity of searching in a balanced Binary Search Tree (AVL)?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    answer: 1,
    explanation: 'Balanced BST operations take logarithmic time O(log n).'
  },
  {
    q: 'Which layer of the OSI model is responsible for routing packets across networks?',
    options: ['Data Link', 'Transport', 'Network', 'Session'],
    answer: 2,
    explanation: 'The Network layer (Layer 3) handles packet forwarding and routing (e.g. IP).'
  },
  {
    q: 'In Database Management Systems, what does ACID stand for?',
    options: [
      'Atomicity, Consistency, Isolation, Durability',
      'Accuracy, Concurrency, Integrity, Durability',
      'Atomicity, Concurrency, Isolation, Dependency',
      'Access, Consistency, Indexing, Durability'
    ],
    answer: 0,
    explanation: 'ACID guarantees database transaction reliability.'
  },
  {
    q: 'What is the standard format for representing worst-case upper bound time complexities?',
    options: ['Omega Notation', 'Big-O Notation', 'Theta Notation', 'Alpha Notation'],
    answer: 1,
    explanation: 'Big-O notation describes the asymptotic upper bound of an algorithm.'
  }
];

const HIGH_YIELD_CHEATSHEETS = [
  {
    code: 'CSC211',
    title: 'Data Structures & Algorithms',
    points: [
      'AVL Tree Balance Factor: BF = height(left) - height(right) ∈ {-1, 0, +1}',
      'QuickSort: Avg O(n log n), Worst O(n²) on sorted pivot; MergeSort: Guaranteed O(n log n)',
      'BFS uses a Queue (Level-order); DFS uses a Stack / Recursion',
      'Hash Table Open Addressing: Linear Probing (primary clustering) vs Double Hashing'
    ]
  },
  {
    code: 'CSC371',
    title: 'Database Systems (SQL & Normalization)',
    points: [
      '1NF: Atomic values; 2NF: No partial dependency on composite PK',
      '3NF: No transitive dependency (non-key → non-key); BCNF: Every determinant is a candidate key',
      'SQL Execution Order: FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY',
      'ACID: Atomicity (all/nothing), Consistency, Isolation, Durability'
    ]
  },
  {
    code: 'CSC322',
    title: 'Operating Systems',
    points: [
      '4 Coffman Deadlock Conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait',
      'SJF / SRTF minimizes average waiting time; Round Robin optimizes response time',
      'Paging eliminates external fragmentation; Segmentation matches logical user view',
      'Banker’s Algorithm checks if a safe sequence exists before granting resource requests'
    ]
  },
  {
    code: 'MTH104',
    title: 'Calculus & Analytical Geometry',
    points: [
      'Fundamental Limit: lim(x→0) [sin(x)/x] = 1; lim(x→0) [(1-cos x)/x] = 0',
      'Integration by Parts: ∫ u dv = u·v - ∫ v du (LIATE rule for choosing u)',
      'Critical Points: f′(c) = 0 or undefined; f″(c) > 0 → Local Min, f″(c) < 0 → Local Max',
      'L’Hôpital’s Rule applies strictly to 0/0 or ∞/∞ indeterminate forms'
    ]
  }
];

export default function StudyHub() {
  const [activeTab, setActiveTab] = useState('daily');
  const [challengeStatus, setChallengeStatus] = useState(() => getDailyChallengeStatus());
  const [qIndex, setQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Flashcards state
  const [cards, setCards] = useState(() => getFlashcardsQueue());
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [newCourse, setNewCourse] = useState('CSC211');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [revisionIds, setRevisionIds] = useState(() => getRevisionDeckIds());
  const [ratings, setRatings] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const swipeStartRef = useRef(null);
  const swipedRef = useRef(false);

  useEffect(() => {
    setCardIndex(0);
    setFlipped(false);
    setRatings({ again: 0, hard: 0, good: 0, easy: 0 });
  }, [activeTab]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOwnerChange = () => {
      setCards(getFlashcardsQueue());
      setRevisionIds(getRevisionDeckIds());
      setRatings({ again: 0, hard: 0, good: 0, easy: 0 });
      setChallengeStatus(getDailyChallengeStatus());
      setCardIndex(0);
      setFlipped(false);
    };

    window.addEventListener('pph:workspace-owner-changed', handleOwnerChange);
    return () => window.removeEventListener('pph:workspace-owner-changed', handleOwnerChange);
  }, []);

  const dueCards = getDueFlashcards(cards, now);
  const revisionCards = cards.filter((card) => revisionIds.includes(card.id));
  const reviewCards = activeTab === 'revision' ? getDueFlashcards(revisionCards, now) : dueCards;
  const safeCardIndex = reviewCards.length > 0 ? Math.min(cardIndex, reviewCards.length - 1) : 0;
  const reviewed = Object.values(ratings).reduce((sum, count) => sum + count, 0);

  const currentQ = SAMPLE_DAILY_QUESTIONS[qIndex];
  const currentCard = reviewCards[safeCardIndex] || null;

  const handleOptionSelect = (idx) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    const isCorrect = idx === currentQ.answer;
    if (isCorrect) setScore((s) => s + 1);

    setTimeout(() => {
      if (qIndex + 1 < SAMPLE_DAILY_QUESTIONS.length) {
        setQIndex((i) => i + 1);
        setSelectedOpt(null);
      } else {
        const finalScore = score + (isCorrect ? 1 : 0);
        setIsFinished(true);
        recordDailyChallengeCompletion(finalScore, SAMPLE_DAILY_QUESTIONS.length);
        setChallengeStatus(getDailyChallengeStatus());
        toast.success(`Daily challenge completed! Score: ${finalScore}/${SAMPLE_DAILY_QUESTIONS.length}`);
      }
    }, 1100);
  };

  const handleFlashcardRating = (rating) => {
    if (!currentCard || !flipped) return;
    const updated = reviewFlashcard(currentCard.id, rating);
    setCards(updated);
    setRatings((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
    setNow(Date.now());
    setFlipped(false);

    const remainingDue = activeTab === 'revision'
      ? getDueFlashcards(updated.filter((card) => revisionIds.includes(card.id)), Date.now())
      : getDueFlashcards(updated, Date.now());
    if (remainingDue.length === 0) {
      setCardIndex(0);
      toast.success('All caught up! No flashcards are due right now.');
    } else {
      setCardIndex((i) => Math.min(i, remainingDue.length - 1));
    }
  };

  const handleStarCard = (card) => {
    setRevisionIds(toggleRevisionCard(card));
    setCards(getFlashcardsQueue());
  };

  useEffect(() => {
    if (!['flashcards', 'revision'].includes(activeTab) || !currentCard) return undefined;
    const handleFlashcardKeyDown = (event) => {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const active = document.activeElement;
      if (active?.isContentEditable || active?.closest('input, textarea, select, [role="dialog"], [role="tab"]')) return;
      if (event.key === ' ') {
        if (active?.closest('button, a[href], [role="button"]') && !active?.closest('.flashcard-box')) return;
        event.preventDefault();
        setFlipped((value) => !value);
      } else if (flipped && ['1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        handleFlashcardRating({ 1: 'hard', 2: 'good', 3: 'easy' }[event.key]);
      }
    };
    window.addEventListener('keydown', handleFlashcardKeyDown);
    return () => window.removeEventListener('keydown', handleFlashcardKeyDown);
  });

  const handleSwipeEnd = (event) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swipedRef.current = true;
      setFlipped((value) => !value);
    }
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) {
      toast.error('Please enter both a question (front) and answer (back).');
      return;
    }
    const updated = addCustomFlashcard({
      subjectCode: newCourse,
      front: newFront,
      back: newBack
    });
    setCards(updated);
    setCardIndex(0);
    setNow(Date.now());
    setFlipped(false);
    setNewFront('');
    setNewBack('');
    toast.success('Added custom flashcard to Box 1!');
  };

  const handleTabKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'));
    const current = tabs.indexOf(e.target.closest('[role="tab"]'));
    const direction = e.key === 'ArrowLeft' ? -1 : 1;
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (current + direction + tabs.length) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
  };

  return (
    <div className="study-hub-container">
      <PageHeader
        badge="Active Recall Workspace"
        title="Student Study Hub"
        subtitle="Build daily consistency with the 5-Question Challenge, Leitner spaced-repetition flashcards, and high-yield COMSATS course cheat-sheets."
        align="center"
      />

      <div className="study-hub-tabs" role="tablist" aria-label="Study Hub sections" onKeyDown={handleTabKeyDown}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'daily'}
          id="study-tab-daily"
          aria-controls="study-hub-panel"
          tabIndex={activeTab === 'daily' ? 0 : -1}
          onClick={() => setActiveTab('daily')}
          className={`study-hub-tab ${activeTab === 'daily' ? 'active' : ''}`}
        >
          <AppIcon name="local_fire_department" size={18} />
          Daily 5-Q Challenge
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'flashcards'}
          id="study-tab-flashcards"
          aria-controls="study-hub-panel"
          tabIndex={activeTab === 'flashcards' ? 0 : -1}
          onClick={() => setActiveTab('flashcards')}
          className={`study-hub-tab ${activeTab === 'flashcards' ? 'active' : ''}`}
        >
          <AppIcon name="style" size={18} />
          Leitner Flashcards ({dueCards.length} due)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cheatsheets'}
          id="study-tab-cheatsheets"
          aria-controls="study-hub-panel"
          tabIndex={activeTab === 'cheatsheets' ? 0 : -1}
          onClick={() => setActiveTab('cheatsheets')}
          className={`study-hub-tab ${activeTab === 'cheatsheets' ? 'active' : ''}`}
        >
          <AppIcon name="menu_book" size={18} />
          Course Cheat-Sheets
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'revision'}
          id="study-tab-revision"
          aria-controls="study-hub-panel"
          tabIndex={activeTab === 'revision' ? 0 : -1}
          onClick={() => setActiveTab('revision')}
          className={`study-hub-tab ${activeTab === 'revision' ? 'active' : ''}`}
        >
          <AppIcon name="star" size={18} filled={activeTab === 'revision'} />
          Revision Deck ({revisionCards.length})
        </button>
      </div>

      {activeTab === 'daily' && (
        <div className="study-hub-card" id="study-hub-panel" role="tabpanel" aria-labelledby={`study-tab-${activeTab}`} tabIndex={0}>
          {challengeStatus.completedToday && !isFinished ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--success)' }}>
                <AppIcon name="check_circle" size={52} />
              </div>
              <h2 style={{ margin: '1rem 0 0.5rem', fontSize: '1.5rem', fontWeight: 800 }}>You completed today&apos;s challenge!</h2>
              <p className="tabular-nums" style={{ color: 'var(--text-subtle)' }}>
                Today&apos;s Score: <strong>{challengeStatus.todayScore}</strong> · Current Streak: <strong>{challengeStatus.dailyStreak || 1} days</strong>
              </p>
            </div>
          ) : isFinished ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--success)' }}>
                <AppIcon name="emoji_events" size={52} />
              </div>
              <h2 style={{ margin: '1rem 0 0.5rem', fontSize: '1.5rem', fontWeight: 800 }}>Challenge Finished!</h2>
              <p className="tabular-nums" style={{ color: 'var(--text-subtle)', marginBottom: '1rem' }}>
                You scored <strong>{score}</strong> out of {SAMPLE_DAILY_QUESTIONS.length}. Come back tomorrow to grow your streak!
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span className="leitner-badge">
                  Question {qIndex + 1} of {SAMPLE_DAILY_QUESTIONS.length}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-subtle)' }}>
                  Score: {score}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>{currentQ.q}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentQ.options.map((opt, idx) => {
                  let bg = 'var(--surface-2)';
                  let color = 'var(--text)';
                  let borderColor = 'var(--border)';
                  if (selectedOpt !== null) {
                    if (idx === currentQ.answer) {
                      bg = 'var(--success)';
                      color = '#ffffff';
                      borderColor = 'var(--success)';
                    } else if (idx === selectedOpt) {
                      bg = 'var(--danger)';
                      color = '#ffffff';
                      borderColor = 'var(--danger)';
                    }
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={selectedOpt !== null}
                      onClick={() => handleOptionSelect(idx)}
                      style={{
                        minHeight: '48px',
                        padding: '0.875rem 1.125rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${borderColor}`,
                        background: bg,
                        color,
                        textAlign: 'left',
                        cursor: selectedOpt !== null ? 'default' : 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {selectedOpt !== null && (
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }} role="status">
                  💡 {currentQ.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {['flashcards', 'revision'].includes(activeTab) && (
        <div className="study-hub-card" id="study-hub-panel" role="tabpanel" aria-labelledby={`study-tab-${activeTab}`} tabIndex={0}>
          <div className="flashcard-session" aria-live="polite">
            <div><strong>{reviewed} reviewed</strong><span>{reviewCards.length} remaining</span></div>
            <progress value={reviewed} max={Math.max(1, reviewed + reviewCards.length)} aria-label="Flashcard session progress" />
            <p>Again {ratings.again} · Hard {ratings.hard} · Good {ratings.good} · Easy {ratings.easy}</p>
          </div>
          {currentCard ? (
            <div>
              <div className="flashcard-meta-row">
                <span className="leitner-badge tabular-nums">
                  <span className="mono-code" translate="no">{currentCard.subjectCode}</span>
                  {' · Card '}
                  {safeCardIndex + 1} of {reviewCards.length}
                </span>
                <span className="leitner-badge tabular-nums">
                  <AppIcon name="inventory_2" size={15} />
                  Leitner Box {currentCard.box || 1} / 5
                </span>
              </div>

              <div className="flashcard-stage">
                <button
                  type="button"
                  aria-pressed={flipped}
                  aria-label={flipped ? 'Flashcard answer shown. Activate to flip to question.' : 'Flashcard question shown. Activate to reveal answer.'}
                  aria-describedby={flipped ? 'flashcard-answer' : 'flashcard-prompt'}
                  onClick={() => {
                    if (swipedRef.current) { swipedRef.current = false; return; }
                    setFlipped((value) => !value);
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType === 'mouse') return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    swipedRef.current = false;
                    swipeStartRef.current = { x: event.clientX, y: event.clientY };
                  }}
                  onPointerUp={handleSwipeEnd}
                  onPointerCancel={() => { swipeStartRef.current = null; }}
                  className={`flashcard-box ${flipped ? 'is-flipped' : ''}`}
                >
                  <div id="flashcard-prompt" className="flashcard-face flashcard-face--front" aria-hidden={flipped}>
                    <span>Prompt</span>
                    <p>{currentCard.front}</p>
                  </div>
                  <div id="flashcard-answer" className="flashcard-face flashcard-face--back" aria-hidden={!flipped}>
                    <span>Model Answer</span>
                    <p>{currentCard.back}</p>
                  </div>
                </button>
              </div>
              <div className="flashcard-actions">
                <button type="button" className="flashcard-rate-btn" onClick={() => setFlipped((value) => !value)}>
                  <AppIcon name="flip" size={18} />
                  {flipped ? 'Show Question' : 'Reveal Answer'}
                </button>
                <button type="button" className="revision-star-btn" aria-pressed={revisionIds.includes(currentCard.id)} onClick={() => handleStarCard(currentCard)}>
                  <AppIcon name={revisionIds.includes(currentCard.id) ? 'star' : 'star_border'} filled={revisionIds.includes(currentCard.id)} size={18} />
                  {revisionIds.includes(currentCard.id) ? 'Saved to Revision Deck' : 'Star for Revision'}
                </button>
              </div>
              <p className="flashcard-shortcuts">Space flips · 1 Hard · 2 Good · 3 Easy · Swipe left or right to flip</p>
              <div className="flashcard-rating-row" role="group" aria-label="Rate flashcard recall difficulty">
                {[
                  ['again', 'Again · 1m'], ['hard', '1 · Hard · 10m'],
                  ['good', '2 · Good · 1d'], ['easy', '3 · Easy · 3d']
                ].map(([rating, label]) => (
                  <button
                    key={rating}
                    type="button"
                    disabled={!flipped}
                    className={`flashcard-rate-btn flashcard-rate-btn--${rating}`}
                    onClick={() => handleFlashcardRating(rating)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {!flipped && <p className="flashcard-shortcuts">Reveal the answer before rating your recall.</p>}
            </div>
          ) : (
            <div className="flashcard-empty">
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--brand)' }}>
                <AppIcon name={activeTab === 'revision' && revisionCards.length === 0 ? 'star_border' : 'task_alt'} size={42} />
              </div>
              <h2>{activeTab === 'revision' && revisionCards.length === 0 ? 'Build your Revision Deck' : 'All caught up!'}</h2>
              <p>{activeTab === 'revision' && revisionCards.length === 0
                ? 'Star a flashcard or a question in a quiz summary. Your deck stays saved on this device — no account needed.'
                : 'No cards are due right now. They return when the existing review interval elapses.'}</p>
              {activeTab === 'revision' && revisionCards.length === 0 && (
                <button type="button" className="flashcard-rate-btn" onClick={() => setActiveTab('flashcards')}>Browse Flashcards</button>
              )}
            </div>
          )}

          {activeTab === 'revision' && revisionCards.length > 0 && (
            <div className="revision-card-list">
              <h3>Saved Cards ({revisionCards.length})</h3>
              {revisionCards.map((card) => (
                <article key={card.id}>
                  <details>
                    <summary><span className="mono-code" translate="no">{card.subjectCode}</span> · {card.front}</summary>
                    <p>{card.back}</p>
                    <small>{card.nextReview > now ? `Next review: ${new Date(card.nextReview).toLocaleString()}` : 'Due now'}</small>
                  </details>
                  <button type="button" className="revision-star-btn" aria-label={`Remove ${card.front} from Revision Deck`} onClick={() => handleStarCard(card)}>
                    <AppIcon name="star" filled size={18} />
                  </button>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'flashcards' && <>
          {/* Create Custom Flashcard */}
          <form onSubmit={handleAddCard} style={{ marginTop: '2.25rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.875rem' }}>
              + Add Your Own Study Flashcard
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                spellCheck={false}
                className="ai-input"
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                placeholder="Course code (e.g. CSC211)"
                aria-label="Flashcard course code"
                maxLength={12}
              />
              <input
                type="text"
                className="ai-input"
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder="Front: Question or theorem…"
                aria-label="Flashcard front question"
                maxLength={300}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="ai-input"
                style={{ flex: 1, minWidth: '220px' }}
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder="Back: Concise answer or formula…"
                aria-label="Flashcard back answer"
                maxLength={600}
              />
              <button
                type="submit"
                style={{
                  minHeight: '44px',
                  padding: '0.65rem 1.35rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand)',
                  color: 'var(--on-brand)',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Add Flashcard
              </button>
            </div>
          </form>
          </>}
        </div>
      )}

      {activeTab === 'cheatsheets' && (
        <div className="study-hub-card" id="study-hub-panel" role="tabpanel" aria-labelledby={`study-tab-${activeTab}`} tabIndex={0}>
          <div className="cheatsheet-grid">
            {HIGH_YIELD_CHEATSHEETS.map((sheet) => (
              <article key={sheet.code} className="cheatsheet-item">
                <span className="leitner-badge mono-code" translate="no">{sheet.code}</span>
                <h3>{sheet.title}</h3>
                <ul>
                  {sheet.points.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
