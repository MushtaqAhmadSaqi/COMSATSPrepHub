import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DEFAULT_SUBJECTS } from '../../constants/subjects';
import PageHeader from '../../components/PageHeader/PageHeader';
import './AiQuizGenerator.css';

/* ── Pre-configured quick presets ── */
const PRESETS = [
  {
    id: 'exam',
    label: 'Exam Prep',
    badge: 'Popular',
    icon: 'school',
    desc: '10 Standard MCQs · Medium',
    time: '~8 min',
    numQuestions: 10,
    difficulty: 'Medium',
    questionType: 'mcq'
  },
  {
    id: 'sprint',
    label: 'Quick Sprint',
    badge: 'Fast',
    icon: 'bolt',
    desc: '5 Warmup MCQs · Easy',
    time: '~4 min',
    numQuestions: 5,
    difficulty: 'Easy',
    questionType: 'mcq'
  },
  {
    id: 'challenge',
    label: 'Deep Drill',
    badge: 'Challenging',
    icon: 'psychology',
    desc: '10 Conceptual Qs · Hard',
    time: '~12 min',
    numQuestions: 10,
    difficulty: 'Hard',
    questionType: 'conceptual'
  }
];

/* ── Course-specific high-yield syllabus topics (All COMSATS Courses) ── */
const COURSE_TOPICS_MAP = {
  // CS & IT Core
  CSC101: [
    'Hardware Architecture & CPU Components',
    'Binary, Hexadecimal & Number Systems',
    'Internet Protocols & Cloud Concepts',
    'Network Topologies & Devices',
    'Cyber Hygiene & Information Security',
    'Spreadsheets & Database Fundamentals'
  ],
  CSC102: [
    'Loops (For, While) & Conditional Logic',
    'Pointers & Memory Addresses in C/C++',
    '1D & 2D Arrays Dynamic Allocation',
    'Functions & Call-by-Reference',
    'Strings & Character Manipulation',
    'Structures, Unions & File Handling'
  ],
  CSC211: [
    'Binary Search Trees & AVL Rotations',
    'Graph Traversal (BFS & DFS)',
    'Linked Lists (Singly, Doubly, Circular)',
    'Time Complexity & Big-O Analysis',
    'Stacks, Queues & Recursion',
    'Hash Tables & Collision Resolution'
  ],
  CSC241: [
    'Inheritance & Method Overriding',
    'Constructors, Destructors & Copying',
    'Operator Overloading & Friend Functions',
    'Virtual Functions & Polymorphism',
    'Abstract Classes & Interfaces',
    'Templates & Exception Handling'
  ],
  CSC301: [
    'Dynamic Programming (Knapsack & LCS)',
    'Greedy Algorithms (Huffman & Kruskal)',
    'Divide and Conquer (Merge & Quick Sort)',
    'Shortest Path (Dijkstra & Bellman-Ford)',
    'Recurrence Relations & Master Theorem',
    'P vs NP & NP-Completeness'
  ],
  CSC311: [
    'OSI 7-Layer vs TCP/IP Protocol Stack',
    'Subnetting & IPv4/IPv6 Addressing',
    'TCP 3-Way Handshake & Flow Control',
    'Routing Algorithms (Dijkstra, Distance Vector)',
    'DNS, HTTP, DHCP & Application Layer',
    'Error Detection (CRC & Parity Checks)'
  ],
  CSC322: [
    'Deadlocks & Banker’s Algorithm',
    'CPU Scheduling (FCFS, SJF, Round Robin)',
    'Process Synchronization, Mutex & Semaphores',
    'Paging, Segmentation & Virtual Memory',
    'File Systems & Disk Scheduling (SCAN, SSTF)',
    'Threads & Inter-Process Communication (IPC)'
  ],
  CSC339: [
    'MIPS / x86 Assembly Instructions & Addressing',
    'CPU Pipelining & Branch Hazards',
    'Cache Memory & Set-Associative Mapping',
    'Instruction Cycle & Interrupts',
    'Registers, ALU Operations & Stack Frames',
    'Bus Architectures & DMA Transfers'
  ],
  CSC354: [
    'Nielsen’s 10 Usability Heuristics',
    'Fitts’s Law & Hick’s Law in UI Design',
    'User Personas & Journey Mapping',
    'Wireframing & Interactive Prototyping',
    'Usability Testing & Qualitative Metrics',
    'Accessibility Guidelines (WCAG)'
  ],
  CSC371: [
    'SQL Joins, Aggregations & Subqueries',
    'Database Normalization (1NF to BCNF)',
    'ACID Properties & Transaction Management',
    'ER Diagrams & Relational Mapping',
    'Indexing (B-Trees) & Query Optimization',
    'Concurrency Control & Deadlock Prevention'
  ],
  CSC441: [
    'Heuristic Search (A*, BFS & DFS)',
    'Game Playing (Minimax & Alpha-Beta Pruning)',
    'Constraint Satisfaction Problems (CSP)',
    'Propositional & First-Order Logic',
    'Bayesian Networks & Probability Inference',
    'Perceptrons & Neural Network Basics'
  ],
  CSC455: [
    'Cryptography (RSA, AES, DES & Hashing)',
    'Network Attacks (DoS, DDoS & MitM)',
    'Web Vulnerabilities (SQL Injection & XSS)',
    'Firewalls, IDS & IPS Architectures',
    'Authentication Protocols & Kerberos',
    'CIA Triad & Risk Assessment Frameworks'
  ],
  CSC461: [
    'Android Activity Lifecycle & Intents',
    'UI Layouts & Jetpack Compose Components',
    'Room Database & SQLite Data Persistence',
    'REST APIs, Retrofit & Coroutines',
    'Fragments & Modern Navigation Graph',
    'Background Services & WorkManager'
  ],
  CSC471: [
    'Modern ES6+ JavaScript & Async/Await',
    'React Hooks (useState, useEffect, useMemo)',
    'RESTful APIs & Client-Server Architecture',
    'Responsive Design with Flexbox & CSS Grid',
    'Authentication with JWT & Cookies',
    'Web Security (CORS, CSRF & XSS Prevention)'
  ],
  CSC481: [
    'Supervised vs Unsupervised Learning',
    'Linear & Logistic Regression Models',
    'Decision Trees & Random Forests',
    'K-Means & Hierarchical Clustering',
    'Overfitting, Underfitting & Regularization',
    'Evaluation Metrics (Confusion Matrix, ROC-AUC)'
  ],

  // Software Engineering
  SWE301: [
    'SDLC Models (Waterfall, Agile, Scrum)',
    'Requirement Elicitation & SRS Standards',
    'UML Class, Sequence & Use Case Diagrams',
    'Design Patterns (Singleton, Factory, Observer)',
    'Software Testing (Black Box vs White Box)',
    'Refactoring & Code Smells'
  ],
  SWE302: [
    'Functional vs Non-Functional Requirements',
    'Requirements Elicitation & JAD Sessions',
    'SRS Documentation (IEEE 830 Standards)',
    'Use Case Modeling & Agile User Stories',
    'Requirements Prioritization (MoSCoW Method)',
    'Requirements Traceability Matrix (RTM)'
  ],
  SWE401: [
    'Quality Assurance (SQA) vs Software Testing',
    'Boundary Value Analysis & Equivalence Partitioning',
    'Cyclomatic Complexity & Basis Path Testing',
    'Unit, Integration, System & Acceptance Testing',
    'Code Reviews, Inspections & Quality Metrics',
    'Defect Tracking & Bug Life Cycle Management'
  ],

  // Mathematics & Statistics
  MTH104: [
    'Limits, Continuity & Squeeze Theorem',
    'Derivatives & Chain Rule Applications',
    'Maxima, Minima & Optimization Problems',
    'Definite & Indefinite Integrals',
    'Integration Techniques (Parts & Substitution)',
    'Area Under Curve & Solids of Revolution'
  ],
  MTH105: [
    'Partial Derivatives & Clairaut’s Theorem',
    'Gradient Vectors & Directional Derivatives',
    'Double & Triple Integrals (Polar/Spherical)',
    'Vector Fields, Curl & Divergence',
    "Green's Theorem & Stokes' Theorem",
    'Lagrange Multipliers for Extreme Values'
  ],
  MTH231: [
    'Gaussian Elimination & Row Echelon Form',
    'Matrix Inverses & Determinants',
    'Eigenvalues & Eigenvectors',
    'Vector Spaces, Subspaces & Basis',
    'Linear Transformations & Rank-Nullity',
    'Orthogonality & Gram-Schmidt Process'
  ],
  MTH242: [
    'First-Order Separable & Linear ODEs',
    'Exact Differential Equations & Integrating Factors',
    'Second-Order Homogeneous Linear ODEs',
    'Undetermined Coefficients & Variation of Parameters',
    'Laplace Transforms & Inverse Transforms',
    'Applications to Oscillations & Circuits'
  ],
  MTH375: [
    'Root Finding (Bisection & Newton-Raphson)',
    'Gauss Elimination & Gauss-Seidel Iteration',
    'Interpolation (Lagrange & Newton Divided Differences)',
    'Numerical Integration (Trapezoidal, Simpson’s 1/3)',
    'Runge-Kutta 2nd & 4th Order (RK-4) Methods',
    'Error Analysis & Floating-Point Arithmetic'
  ],

  // Electrical & Physics
  EEE241: [
    'Boolean Algebra & DeMorgan’s Laws',
    'Karnaugh Maps (K-Maps) 3 & 4 Variable Minimization',
    'Combinational Logic (Adders, Multiplexers, Decoders)',
    'Latches & Flip-Flops (SR, D, JK, T)',
    'Synchronous & Asynchronous Counters',
    'Finite State Machines (Moore & Mealy)'
  ],
  PHY120: [
    'Electric Fields, Coulomb’s Law & Gauss’s Law',
    'Capacitors & Dielectric Materials',
    'Magnetic Fields & Ampere’s Law',
    'Faraday’s Law of Electromagnetic Induction',
    'Wave Optics (Interference & Diffraction)',
    'Semiconductors & P-N Junction Physics'
  ],

  // Humanities & Management
  HUM100: [
    'Reading Comprehension & Critical Analysis',
    'Academic Essay & Paragraph Structure',
    'Subject-Verb Agreement & Sentence Corrections',
    'Précis Writing & Text Summarization',
    'Contextual Vocabulary & Idioms',
    'Formal Email & Report Writing'
  ],
  MGT101: [
    'Four Functions of Management (POLC)',
    'Organizational Structure & Culture',
    'Strategic Planning & SWOT Analysis',
    'Leadership Styles & Contingency Theories',
    'Motivation Theories (Maslow & Herzberg)',
    'Managerial Decision-Making & Ethics'
  ]
};

const DEFAULT_POPULAR_TOPICS = [
  'Data Structures & Algorithms',
  'Object-Oriented Programming',
  'Database Systems & SQL Normalization',
  'Operating Systems & Process Synchronization',
  'Computer Networks & Protocols',
  'Linear Algebra & Calculus'
];

const QUESTION_STYLES = [
  {
    id: 'mcq',
    icon: 'format_list_bulleted',
    title: 'Standard Exam MCQs',
    subtitle: 'COMSATS Midterm & Terminal style'
  },
  {
    id: 'conceptual',
    icon: 'lightbulb',
    title: 'Conceptual & "Why"',
    subtitle: 'Core theory & logic breakdown'
  },
  {
    id: 'mixed',
    icon: 'extension',
    title: 'Scenario & Applied',
    subtitle: 'Code dry-runs & problem solving'
  }
];

const DIFFICULTIES = [
  { id: 'Easy', label: 'Easy', color: '#10b981', icon: 'check_circle', desc: 'Warmup & basics' },
  { id: 'Medium', label: 'Medium', color: '#f59e0b', icon: 'bolt', desc: 'Standard exam level' },
  { id: 'Hard', label: 'Hard', color: '#ef4444', icon: 'local_fire_department', desc: 'A-grade challenge' }
];

const QUESTION_COUNTS = [
  { count: 5, time: '~4 min' },
  { count: 10, time: '~8 min', popular: true },
  { count: 15, time: '~12 min' },
  { count: 20, time: '~16 min' }
];

export default function AiQuizGenerator({ onStartAiQuiz = () => {} }) {
  const [selectedCourseCode, setSelectedCourseCode] = useState('CSC211');
  const [topic, setTopic] = useState('Binary Search Trees & AVL Rotations');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(10);
  const [questionType, setQuestionType] = useState('mcq');
  const [activePreset, setActivePreset] = useState('exam');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [honeypot, setHoneypot] = useState('');
  const [topicError, setTopicError] = useState('');

  // Course topics dynamic list
  const suggestedTopics = useMemo(() => {
    if (selectedCourseCode && COURSE_TOPICS_MAP[selectedCourseCode]) {
      return COURSE_TOPICS_MAP[selectedCourseCode];
    }
    return DEFAULT_POPULAR_TOPICS;
  }, [selectedCourseCode]);

  const handleApplyPreset = (p) => {
    setActivePreset(p.id);
    setDifficulty(p.difficulty);
    setNumQuestions(p.numQuestions);
    setQuestionType(p.questionType);
  };

  const handleCourseChange = (code) => {
    setSelectedCourseCode(code);
    const match = DEFAULT_SUBJECTS.find((s) => s.code === code);
    if (match) {
      const courseTopics = COURSE_TOPICS_MAP[code];
      if (courseTopics && courseTopics.length > 0) {
        setTopic(courseTopics[0]);
      } else {
        setTopic(match.name);
      }
      setTopicError('');
    } else {
      setTopic('');
    }
  };

  const handleSurpriseMe = () => {
    const list = suggestedTopics.length > 0 ? suggestedTopics : DEFAULT_POPULAR_TOPICS;
    const random = list[Math.floor(Math.random() * list.length)];
    setTopic(random);
    setTopicError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (honeypot) return;

    const cleaned = topic.trim();
    if (!cleaned) {
      setTopicError('Please enter or select a topic to practice.');
      return;
    }
    if (cleaned.length > 120) {
      setTopicError('Topic must be 120 characters or fewer.');
      return;
    }
    setTopicError('');
    onStartAiQuiz({
      topic: cleaned,
      subjectCode: selectedCourseCode,
      difficulty,
      numQuestions,
      questionType
    });
  };

  const selectedCourse = useMemo(() => {
    return DEFAULT_SUBJECTS.find((s) => s.code === selectedCourseCode);
  }, [selectedCourseCode]);

  const estimatedTime = useMemo(() => {
    const found = QUESTION_COUNTS.find((q) => q.count === numQuestions);
    return found ? found.time : `~${Math.round(numQuestions * 0.8)} min`;
  }, [numQuestions]);

  return (
    <div className="ai-gen-container">
      <PageHeader
        badge="AI Exam Studio"
        title="Custom AI Practice Quiz"
        subtitle="Generate personalized practice tests tailored to your COMSATS courses with instant smart feedback."
      />

      {/* ── Quick Presets Bar (1-Click Start) ── */}
      <section className="ai-presets-section" aria-label="Quick quiz presets">
        <div className="ai-presets-header">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand)' }}>
            flash_on
          </span>
          <span className="ai-presets-title">Quick 1-Tap Presets</span>
        </div>
        <div className="ai-presets-grid">
          {PRESETS.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`ai-preset-card ${isSelected ? 'selected' : ''}`}
                aria-pressed={isSelected}
              >
                <div className="ai-preset-top">
                  <span className="material-symbols-outlined ai-preset-icon">{p.icon}</span>
                  <span className="ai-preset-badge">{p.badge}</span>
                </div>
                <div className="ai-preset-name">{p.label}</div>
                <div className="ai-preset-desc">{p.desc}</div>
                <div className="ai-preset-time">⏱️ {p.time}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Main Generator Studio Card ── */}
      <form className="ai-gen-card" onSubmit={handleSubmit} noValidate>
        {/* Anti-bot honeypot */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
        />

        {/* Step 1: Select Course */}
        <div className="ai-field-block">
          <div className="ai-field-header">
            <span className="ai-step-indicator">1</span>
            <label className="ai-field-label" htmlFor="ai-course-select">
              Choose COMSATS Course
            </label>
          </div>
          <div className="ai-select-wrapper">
            <select
              id="ai-course-select"
              className="ai-modern-select"
              value={selectedCourseCode}
              onChange={(e) => handleCourseChange(e.target.value)}
            >
              <option value="">Custom Topic / General Computer Science</option>
              {DEFAULT_SUBJECTS.map((subj) => (
                <option key={subj.code} value={subj.code}>
                  {subj.code} — {subj.name} ({subj.department})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined ai-select-arrow" aria-hidden="true">
              expand_more
            </span>
          </div>
          {selectedCourse && (
            <p className="ai-field-hint">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>verified</span>
              Aligned with COMSATS {selectedCourse.code} curriculum
            </p>
          )}
        </div>

        {/* Step 2: Specific Topic */}
        <div className="ai-field-block">
          <div className="ai-field-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="ai-step-indicator">2</span>
              <label className="ai-field-label" htmlFor="ai-topic-input">
                Topic or Chapter
              </label>
            </div>
            <button
              type="button"
              onClick={handleSurpriseMe}
              className="btn-surprise-me"
              title="Pick a random high-yield exam topic"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>casino</span>
              <span>Random Topic</span>
            </button>
          </div>

          <div className="ai-topic-input-wrapper">
            <span className="material-symbols-outlined ai-input-icon">topic</span>
            <input
              id="ai-topic-input"
              type="text"
              className={`ai-modern-input ${topicError ? 'has-error' : ''}`}
              value={topic}
              maxLength={120}
              aria-invalid={Boolean(topicError)}
              aria-describedby={topicError ? 'ai-topic-error' : undefined}
              onChange={(e) => {
                setTopic(e.target.value);
                if (topicError) setTopicError('');
              }}
              placeholder="e.g. AVL Tree Rotations, SQL Normalization, Deadlocks..."
              required
            />
            {topic && (
              <button
                type="button"
                onClick={() => setTopic('')}
                className="ai-input-clear-btn"
                aria-label="Clear topic"
                title="Clear"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
              </button>
            )}
          </div>

          {topicError && (
            <p id="ai-topic-error" className="ai-error-text" role="alert">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>error</span>
              {topicError}
            </p>
          )}

          {/* Quick-pick topic chips (Dynamic per COMSATS course) */}
          {suggestedTopics.length > 0 && (
            <div className="ai-topic-chips-wrapper">
              <div className="ai-chips-header-row">
                <span className="ai-chips-label">
                  {selectedCourse
                    ? `Syllabus topics for ${selectedCourse.code}:`
                    : 'Recommended topics:'}
                </span>
                <button
                  type="button"
                  className="btn-toggle-chips"
                  onClick={() => setShowSuggestions((prev) => !prev)}
                  title={showSuggestions ? 'Hide suggested topic chips' : 'Show suggested topic chips'}
                >
                  {showSuggestions ? 'Hide topics' : 'Show suggested topics'}
                </button>
              </div>

              {showSuggestions && (
                <div className="ai-chips-list" role="group" aria-label="Suggested syllabus topics">
                  {suggestedTopics.map((item) => {
                    const isActive = topic.toLowerCase() === item.toLowerCase();
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setTopic(item);
                          if (topicError) setTopicError('');
                        }}
                        className={`ai-topic-chip ${isActive ? 'active' : ''}`}
                        aria-pressed={isActive}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Question Style Tiles */}
        <div className="ai-field-block">
          <div className="ai-field-header">
            <span className="ai-step-indicator">3</span>
            <span className="ai-field-label">Question Style</span>
          </div>
          <div className="ai-style-grid" role="radiogroup" aria-label="Question Style">
            {QUESTION_STYLES.map((st) => {
              const isSelected = questionType === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setQuestionType(st.id);
                    setActivePreset(null);
                  }}
                  className={`ai-style-tile ${isSelected ? 'selected' : ''}`}
                >
                  <div className="ai-style-icon-box">
                    <span className="material-symbols-outlined">{st.icon}</span>
                  </div>
                  <div className="ai-style-content">
                    <div className="ai-style-title">{st.title}</div>
                    <div className="ai-style-sub">{st.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Difficulty Level & Question Count (Side-by-Side) */}
        <div className="ai-options-dual-grid">
          {/* Difficulty */}
          <div className="ai-field-block">
            <div className="ai-field-header">
              <span className="ai-step-indicator">4</span>
              <span className="ai-field-label">Difficulty</span>
            </div>
            <div className="ai-difficulty-pills" role="radiogroup" aria-label="Difficulty Level">
              {DIFFICULTIES.map((d) => {
                const isSelected = difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setDifficulty(d.id);
                      setActivePreset(null);
                    }}
                    className={`ai-diff-pill ${isSelected ? 'selected' : ''}`}
                    style={{ '--diff-color': d.color }}
                  >
                    <span className="diff-indicator" />
                    <span className="diff-name">{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number of Questions */}
          <div className="ai-field-block">
            <div className="ai-field-header">
              <span className="ai-step-indicator">5</span>
              <span className="ai-field-label">Number of Questions</span>
            </div>
            <div className="ai-count-pills" role="radiogroup" aria-label="Number of Questions">
              {QUESTION_COUNTS.map((qc) => {
                const isSelected = numQuestions === qc.count;
                return (
                  <button
                    key={qc.count}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setNumQuestions(qc.count);
                      setActivePreset(null);
                    }}
                    className={`ai-count-pill ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="count-num">{qc.count} Qs</span>
                    <span className="count-time">{qc.time}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Live Quiz Summary Preview Bar ── */}
        <div className="ai-summary-bar">
          <div className="ai-summary-left">
            <span className="ai-summary-icon-wrap">
              <span className="material-symbols-outlined">auto_awesome</span>
            </span>
            <div className="ai-summary-text">
              <div className="ai-summary-title">
                {numQuestions} {difficulty} Questions on{' '}
                <strong>{topic || 'Custom Topic'}</strong>
              </div>
              <div className="ai-summary-meta">
                <span>⏱️ {estimatedTime}</span>
                <span>•</span>
                <span>{QUESTION_STYLES.find((s) => s.id === questionType)?.title}</span>
                <span>•</span>
                <span className="ai-badge-gemini">Gemini AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Launch Action Button ── */}
        <motion.button
          type="submit"
          className="btn-generate-ai"
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">rocket_launch</span>
          <span>Generate Practice Quiz</span>
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </motion.button>
      </form>
    </div>
  );
}
