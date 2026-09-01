import React, { useState } from 'react';
import './PaperView.css';

const DEFAULT_QUESTIONS = [
  {
    id: 1,
    number: 'Question 1',
    section: 'Section A — Short Conceptual Questions',
    marks: '5 Marks',
    questionText: 'Differentiate between linear and non-linear data structures with two examples of each.',
    answerText: `Linear Data Structures: Elements are arranged sequentially or linearly (e.g., Arrays, Linked Lists, Stacks, Queues). Each element has a unique predecessor and successor except the first and last.
Non-Linear Data Structures: Elements are not arranged in a sequence; instead, they form a hierarchical structure (e.g., Trees, Graphs).`
  },
  {
    id: 2,
    number: 'Question 2',
    section: 'Section A — Short Conceptual Questions',
    marks: '5 Marks',
    questionText: 'What is the time complexity of insertion at the beginning vs. insertion at the end of a Singly Linked List?',
    answerText: `Insertion at Beginning: O(1) time complexity, because we only need to update the head pointer.
Insertion at End: O(n) time complexity without a tail pointer (since we must traverse the entire list to find the last node). If a tail pointer is maintained, it is O(1).`
  },
  {
    id: 3,
    number: 'Question 3',
    section: 'Section B — Problem Solving & Algorithm Analysis',
    marks: '10 Marks',
    questionText: 'Given an array of integers, write an algorithm or C++ function to detect if a cycle exists in a linked list using Floyd’s Cycle Detection (Tortoise and Hare approach).',
    answerText: `C++ Implementation:
bool hasCycle(ListNode* head) {
    if (!head || !head->next) return false;
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true; // Cycle detected
    }
    return false;
}`
  },
  {
    id: 4,
    number: 'Question 4',
    section: 'Section B — Problem Solving & Algorithm Analysis',
    marks: '10 Marks',
    questionText: 'Construct an AVL tree by inserting the following sequence of keys: 10, 20, 30, 40, 50, 25. Show the rotations performed at each step.',
    answerText: `Step 1: Insert 10, 20, 30 -> Right-Right (RR) imbalance at node 10. Perform Left Rotation at 10. Root becomes 20.
Step 2: Insert 40, 50 -> RR imbalance at node 30. Perform Left Rotation at 30.
Step 3: Insert 25 -> RL (Right-Left) imbalance at node 20. Perform Right Rotation on node 40, then Left Rotation on node 20.
Final Balanced AVL Tree Root: 30.`
  }
];

export default function PaperView({
  paper = { title: 'Terminal Examination — Fall 2023', term: 'Terminal', year: '2023', file_url: null },
  onBack = () => {}
}) {
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  const toggleAnswer = (id) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    const nextState = !showAllAnswers;
    setShowAllAnswers(nextState);
    const newExpanded = {};
    DEFAULT_QUESTIONS.forEach((q) => {
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
            <div><strong>Subject:</strong> {paper.title.split('—')[0] || 'Data Structures'}</div>
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

          {DEFAULT_QUESTIONS.map((q) => {
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
          })}
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
