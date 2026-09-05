/**
 * Groq AI & COMSATS Quiz Service
 * Generates COMSATS-style MCQ quizzes via Groq AI (Llama 3.3 70B)
 * with robust subject-aware offline fallbacks.
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Subject-specific question banks for COMSATS University courses.
 */
const SUBJECT_QUESTION_BANKS = {
  // CSC101: Introduction to ICT
  'csc101': [
    {
      question: 'What is the primary function of the CPU in a computer system?',
      options: ['Store permanent data', 'Perform arithmetic & logic processing', 'Display graphics', 'Manage network connections'],
      correct: 1,
      hint: 'The CPU acts as the brain of the computer executing instructions.',
    },
    {
      question: 'Which type of memory is volatile and loses contents when power is turned off?',
      options: ['ROM', 'SSD', 'RAM', 'Hard Disk'],
      correct: 2,
      hint: 'Random Access Memory is temporary working memory.',
    },
    {
      question: 'How many bits make up one Byte?',
      options: ['4 bits', '8 bits', '16 bits', '32 bits'],
      correct: 1,
      hint: '1 Byte = 8 bits.',
    },
  ],

  // CSC102: Programming Fundamentals
  'csc102': [
    {
      question: 'Which of the following is a primitive data type in C++?',
      options: ['string', 'int', 'vector', 'fstream'],
      correct: 1,
      hint: 'int, float, char, and double are built-in primitive data types.',
    },
    {
      question: 'What will be the output of 7 % 3 in C++?',
      options: ['2', '1', '2.33', '0'],
      correct: 1,
      hint: 'The modulo operator % returns the remainder of integer division.',
    },
    {
      question: 'Which loop is guaranteed to execute its body at least once?',
      options: ['for loop', 'while loop', 'do-while loop', 'foreach loop'],
      correct: 2,
      hint: 'The condition is evaluated AFTER executing the body.',
    },
  ],

  // CSC211: Data Structures & Algorithms
  'csc211': [
    {
      question: 'Which data structure uses LIFO (Last In, First Out) principle?',
      options: ['Queue', 'Stack', 'Array', 'Linked List'],
      correct: 1,
      hint: 'Think about stacking plates — the last one placed is the first one removed.',
    },
    {
      question: 'What is the average time complexity of QuickSort?',
      options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
      correct: 1,
      hint: 'QuickSort divides the array into sub-arrays around a pivot element.',
    },
    {
      question: 'Which traversal technique processes tree nodes level by level?',
      options: ['Preorder', 'Inorder', 'Postorder', 'Level Order (BFS)'],
      correct: 3,
      hint: 'Breadth-First Search uses a Queue to visit nodes level by level.',
    },
  ],

  // MTH104: Calculus & Analytical Geometry
  'mth104': [
    {
      question: 'What is the derivative of f(x) = x³ with respect to x?',
      options: ['3x²', 'x²/3', '3x', 'x⁴/4'],
      correct: 0,
      hint: 'Apply Power Rule: d/dx [x^n] = n * x^(n-1).',
    },
    {
      question: 'What is the integral ∫ cos(x) dx?',
      options: ['-sin(x) + C', 'sin(x) + C', 'tan(x) + C', '-cos(x) + C'],
      correct: 1,
      hint: 'The derivative of sin(x) is cos(x).',
    },
  ],

  // CSC322: Operating Systems
  'csc322': [
    {
      question: 'What is a deadlock in Operating Systems?',
      options: ['A crash in user space', 'A situation where two or more processes are blocked waiting for each other', 'A hardware memory error', 'An infinite loop in a thread'],
      correct: 1,
      hint: 'Deadlock occurs when processes hold resources while waiting for resources held by others.',
    },
    {
      question: 'Which CPU scheduling algorithm gives smallest average waiting time?',
      options: ['FCFS', 'Round Robin', 'Shortest Job First (SJF)', 'Priority Scheduling'],
      correct: 2,
      hint: 'SJF is provably optimal for minimizing average waiting time.',
    },
  ],

  // CSC241: Object Oriented Programming
  'csc241': [
    {
      question: 'Which OOP principle allows a child class to inherit properties from a parent class?',
      options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Abstraction'],
      correct: 2,
      hint: 'Inheritance allows child classes to reuse code from parent classes.',
    },
    {
      question: 'What is a constructor in OOP?',
      options: ['Function to destroy objects', 'Special method called automatically upon object creation', 'Static helper function', 'Access modifier'],
      correct: 1,
      hint: 'Constructors initialize member variables when an object is instantiated.',
    },
  ],

  // CSC371: Database Systems
  'csc371': [
    {
      question: 'Which SQL command is used to retrieve data from a database table?',
      options: ['GET', 'FETCH', 'SELECT', 'EXTRACT'],
      correct: 2,
      hint: 'The standard SQL query command begins with SELECT.',
    },
    {
      question: 'What does ACID stand for in database transaction management?',
      options: [
        'Atomicity, Consistency, Isolation, Durability',
        'Access, Control, Integration, Data',
        'Accuracy, Concurrency, Indexing, Distribution',
        'Array, Column, Index, Domain'
      ],
      correct: 0,
      hint: 'Guarantees reliable transaction processing in DBMS.',
    },
  ],

  // MTH231: Linear Algebra
  'mth231': [
    {
      question: 'What is the determinant of a 2x2 matrix [[a, b], [c, d]]?',
      options: ['ad + bc', 'ad - bc', 'ab - cd', 'ac - bd'],
      correct: 1,
      hint: 'det(A) = ad - bc for a 2x2 matrix.',
    },
  ],

  // CSC311: Computer Networks
  'csc311': [
    {
      question: 'How many layers are in the OSI reference model?',
      options: ['4', '5', '7', '9'],
      correct: 2,
      hint: 'Application, Presentation, Session, Transport, Network, Data Link, Physical.',
    },
  ],

  // CSC441: Artificial Intelligence
  'csc441': [
    {
      question: 'Which search algorithm is guaranteed to find the shortest path on an unweighted graph?',
      options: ['Depth First Search (DFS)', 'Breadth First Search (BFS)', 'Greedy Best First Search', 'Hill Climbing'],
      correct: 1,
      hint: 'BFS expands node by node level-wise.',
    },
  ],

  // EEE241: Digital Logic Design
  'eee241': [
    {
      question: 'What is the output of an AND gate when inputs are A=1 and B=0?',
      options: ['0', '1', 'High impedance', 'Undefined'],
      correct: 0,
      hint: 'AND gate outputs 1 only when BOTH inputs are 1.',
    },
  ],

  // SWE301: Software Engineering Concepts
  'swe301': [
    {
      question: 'Which software development model follows a sequential step-by-step linear flow?',
      options: ['Agile', 'Scrum', 'Waterfall', 'Spiral'],
      correct: 2,
      hint: 'Waterfall flows downwards through Requirements, Design, Implementation, Verification, Maintenance.',
    },
  ]
};

/**
 * Generate MCQ questions for a given subject using Groq AI with automatic fallbacks.
 */
export async function generateQuizWithGemini({ subject, subjectCode, numQuestions = 10, difficulty = 'Medium' }) {
  if (GROQ_API_KEY && GROQ_API_KEY.trim().startsWith('gsk_')) {
    try {
      const prompt = buildPrompt(subject, subjectCode, numQuestions, difficulty);
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert university professor. You always respond with valid JSON only — no markdown formatting, no explanations, just the raw JSON array.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || '';
        const parsedQuestions = parseQuizFromResponse(text, numQuestions);
        if (parsedQuestions && parsedQuestions.length > 0) {
          return parsedQuestions;
        }
      }
    } catch (err) {
      console.warn('Groq AI API fetch failed:', err.message);
    }
  }

  return getOfflineQuestions(subject, subjectCode, numQuestions, difficulty);
}

/**
 * Generate paper-specific examination questions & model solution keys.
 * Matches paper subject (Calculus, Database, Networks, OOP, etc.)
 */
export async function generateExamPaperQuestions({ subjectName = '', subjectCode = '', paperTitle = '', term = 'Terminal', year = '2023' }) {
  if (GROQ_API_KEY && GROQ_API_KEY.trim().startsWith('gsk_')) {
    try {
      const prompt = `You are a senior professor at COMSATS University Islamabad. Generate a realistic 4-question official examination paper with complete verified solution keys for "${subjectName || paperTitle}" (${subjectCode || 'COMSATS'}), Exam: ${term} ${year}.
Requirements:
1. Two short conceptual questions (5 Marks each) for Section A.
2. Two detailed problem-solving/analytical questions (10 Marks each) for Section B.
3. Include accurate, complete verified step-by-step solution keys.
4. Respond ONLY with a valid JSON array format.

JSON Structure:
[
  {
    "id": 1,
    "number": "Question 1",
    "section": "Section A — Short Conceptual Questions",
    "marks": "5 Marks",
    "questionText": "Question text here",
    "answerText": "Step-by-step solution model answer here"
  }
]`;
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: 'Respond with valid JSON array only — no markdown.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6,
          max_tokens: 3500
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || '';
        const parsed = parseExamQuestions(text);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn('AI Exam paper fetch failed:', err.message);
    }
  }

  return getOfflineExamQuestions(subjectName, subjectCode, paperTitle, term, year);
}

function parseExamQuestions(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/g, '');
  }
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return null;
  try {
    const parsed = JSON.parse(arrayMatch[0]);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => ({
        id: item.id || idx + 1,
        number: item.number || `Question ${idx + 1}`,
        section: item.section || (idx < 2 ? 'Section A — Short Conceptual Questions' : 'Section B — Problem Solving & Analysis'),
        marks: item.marks || (idx < 2 ? '5 Marks' : '10 Marks'),
        questionText: String(item.questionText || item.question || '').trim(),
        answerText: String(item.answerText || item.answer || '').trim()
      }));
    }
  } catch { return null; }
  return null;
}

/**
 * Subject-specific exam paper questions bank fallback.
 */
function getOfflineExamQuestions(subjectName = '', subjectCode = '', paperTitle = '', term = 'Terminal', year = '2023') {
  const text = `${subjectName} ${subjectCode} ${paperTitle}`.toLowerCase();

  // Calculus & Math
  if (text.includes('math') || text.includes('calculus') || text.includes('mth104') || text.includes('mth105') || text.includes('linear')) {
    return [
      {
        id: 1,
        number: 'Question 1',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'Explain the difference between local extrema and absolute extrema of a function f(x). State the First Derivative Test conditions.',
        answerText: 'Local Extrema: A point x=c is a local maximum if f(c) >= f(x) for all x in an open interval around c. It is a local minimum if f(c) <= f(x).\nAbsolute Extrema: The highest or lowest value that a function takes over its entire domain.\nFirst Derivative Test: If f\'(x) changes sign from positive to negative at critical point c, then f(c) is a local maximum. If f\'(x) changes from negative to positive, f(c) is a local minimum.'
      },
      {
        id: 2,
        number: 'Question 2',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'State L\'Hôpital\'s Rule and use it to evaluate the limit: lim (x→0) [ (sin 5x) / (2x) ].',
        answerText: 'L\'Hôpital\'s Rule: If lim f(x)/g(x) results in an indeterminate form 0/0 or ∞/∞, then lim f(x)/g(x) = lim f\'(x)/g\'(x).\nEvaluation:\n1. Direct substitution: sin(0)/0 = 0/0 (Indeterminate).\n2. Apply L\'Hôpital\'s Rule: d/dx[sin 5x] = 5 cos 5x, d/dx[2x] = 2.\n3. Evaluate limit: lim (x→0) [ (5 cos 5x) / 2 ] = (5 * 1) / 2 = 5/2.'
      },
      {
        id: 3,
        number: 'Question 3',
        section: 'Section B — Problem Solving & Analytical Evaluation',
        marks: '10 Marks',
        questionText: 'Evaluate the definite integral ∫ (from 0 to 2) [ 3x² + 2x - 5 ] dx. Show step-by-step antiderivative calculation.',
        answerText: 'Step 1: Find antiderivative F(x):\n∫ (3x² + 2x - 5) dx = 3*(x³/3) + 2*(x²/2) - 5x = x³ + x² - 5x\n\nStep 2: Evaluate F(2) - F(0):\nF(2) = (2)³ + (2)² - 5(2) = 8 + 4 - 10 = 2\nF(0) = 0³ + 0² - 5(0) = 0\n\nStep 3: Result = F(2) - F(0) = 2 - 0 = 2.'
      },
      {
        id: 4,
        number: 'Question 4',
        section: 'Section B — Problem Solving & Analytical Evaluation',
        marks: '10 Marks',
        questionText: 'Given the matrix A = [[4, 1], [2, 3]], find the eigenvalues and corresponding eigenvectors.',
        answerText: 'Step 1: Characteristic Equation det(A - λI) = 0:\n|[4-λ, 1], [2, 3-λ]| = (4-λ)(3-λ) - (1)(2) = λ² - 7λ + 12 - 2 = λ² - 7λ + 10 = 0\n\nStep 2: Solve for λ:\n(λ - 5)(λ - 2) = 0 => Eigenvalues: λ1 = 5, λ2 = 2.\n\nStep 3: Eigenvectors:\nFor λ1 = 5: [-1x + y = 0] => y = x => Eigenvector v1 = [1, 1]^T\nFor λ2 = 2: [2x + y = 0] => y = -2x => Eigenvector v2 = [1, -2]^T.'
      }
    ];
  }

  // Database Systems
  if (text.includes('database') || text.includes('sql') || text.includes('csc371') || text.includes('db')) {
    return [
      {
        id: 1,
        number: 'Question 1',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'Differentiate between 2NF (Second Normal Form) and 3NF (Third Normal Form) with suitable schema examples.',
        answerText: '2NF: Requires relation to be in 1NF and eliminates partial dependencies (non-prime attributes must depend on the FULL primary key).\n3NF: Requires relation to be in 2NF and eliminates transitive dependencies (non-prime attributes must not depend on other non-prime attributes).'
      },
      {
        id: 2,
        number: 'Question 2',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'What is Referential Integrity? How does a Foreign Key constraint enforce entity relationship rules in SQL?',
        answerText: 'Referential Integrity ensures that relationships between tables remain consistent. A foreign key in a child table references the primary key of a parent table. SQL prevents inserting child records without matching parent records and blocks deleting parent records referenced by child rows (CASCADE/RESTRICT).'
      },
      {
        id: 3,
        number: 'Question 3',
        section: 'Section B — SQL Queries & Database Design',
        marks: '10 Marks',
        questionText: 'Write SQL queries for an Employee(EmpID, Name, Salary, DeptID) table:\na) Find top 3 highest paid employees.\nb) Find average salary of each department having more than 5 employees.',
        answerText: 'Query a:\nSELECT EmpID, Name, Salary\nFROM Employee\nORDER BY Salary DESC\nLIMIT 3;\n\nQuery b:\nSELECT DeptID, AVG(Salary) AS AvgSalary\nFROM Employee\nGROUP BY DeptID\nHAVING COUNT(EmpID) > 5;'
      },
      {
        id: 4,
        number: 'Question 4',
        section: 'Section B — SQL Queries & Database Design',
        marks: '10 Marks',
        questionText: 'Design an Entity-Relationship (ER) diagram for a University Management System (Student, Course, Instructor, Department). Specify cardinalities.',
        answerText: 'Entities & Attributes:\n- Student (StudentID PK, Name, Email, Major)\n- Course (CourseCode PK, Title, Credits)\n- Instructor (InstructorID PK, Name, Dept)\n\nRelationships & Cardinalities:\n- Enrolls_In: Student (M) <---> (N) Course (Many-to-Many)\n- Teaches: Instructor (1) <---> (N) Course (One-to-Many)\n- Belongs_To: Instructor (N) <---> (1) Department (Many-to-One).'
      }
    ];
  }

  // Programming / C++
  if (text.includes('programming') || text.includes('csc102') || text.includes('cpp') || text.includes('code')) {
    return [
      {
        id: 1,
        number: 'Question 1',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'Explain the difference between Pass-by-Value and Pass-by-Reference in C++ with function header syntax.',
        answerText: 'Pass-by-Value: Creates a copy of the argument. Changes made inside function do not affect original variable. Syntax: void func(int x)\nPass-by-Reference: Passes memory address alias (&). Changes inside function directly modify original variable. Syntax: void func(int &x)'
      },
      {
        id: 2,
        number: 'Question 2',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'Explain Pointer Arithmetic in C++. What is the relationship between array names and pointers?',
        answerText: 'In C++, an array name acts as a constant pointer to its first element (arr == &arr[0]). Pointer arithmetic increments/decrements memory address based on data type size: ptr + i evaluates to memory address (ptr + i * sizeof(type)). Thus, *(arr + i) is identical to arr[i].'
      },
      {
        id: 3,
        number: 'Question 3',
        section: 'Section B — Problem Solving & C++ Coding',
        marks: '10 Marks',
        questionText: 'Write a C++ function to swap two integer variables without using a temporary third variable (using XOR bitwise operator).',
        answerText: 'C++ Code:\nvoid swapXOR(int &a, int &b) {\n    if (&a == &b) return; // Guard against self-swap\n    a = a ^ b;\n    b = a ^ b;\n    a = a ^ b;\n}\n\nExplanation: Bitwise XOR cancels identical bits: (a ^ b) ^ b = a, and (a ^ b) ^ a = b.'
      },
      {
        id: 4,
        number: 'Question 4',
        section: 'Section B — Problem Solving & C++ Coding',
        marks: '10 Marks',
        questionText: 'Write a complete C++ function `bool isPalindrome(const string &str)` to check if a given word is a palindrome.',
        answerText: 'C++ Implementation:\nbool isPalindrome(const string &str) {\n    int left = 0, right = str.length() - 1;\n    while (left < right) {\n        if (tolower(str[left]) != tolower(str[right])) {\n            return false;\n        }\n        left++;\n        right--;\n    }\n    return true;\n}'
      }
    ];
  }

  // OOP / C++
  if (text.includes('object') || text.includes('oop') || text.includes('csc241')) {
    return [
      {
        id: 1,
        number: 'Question 1',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'Differentiate Function Overloading (compile-time) and Function Overriding (runtime polymorphism) in C++.',
        answerText: 'Function Overloading: Multiple functions in same scope with same name but different parameter signatures. Resolved at compile-time.\nFunction Overriding: Derived class redefines virtual function of base class with exact same signature. Resolved at runtime using V-Table.'
      },
      {
        id: 2,
        number: 'Question 2',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'What is Encapsulation? How do private access modifiers enforce data hiding?',
        answerText: 'Encapsulation bundles data members and operating methods inside a single class while restricting direct access. Private access modifiers prevent external code from modifying internal object state directly, enforcing validation through getter/setter methods.'
      },
      {
        id: 3,
        number: 'Question 3',
        section: 'Section B — OOP Architecture & Implementation',
        marks: '10 Marks',
        questionText: 'Implement a C++ class hierarchy: Abstract base class `Shape` with virtual method `getArea()`, and derived classes `Rectangle` & `Circle`.',
        answerText: 'C++ Implementation:\nclass Shape {\npublic:\n    virtual double getArea() const = 0; // Pure virtual\n    virtual ~Shape() {}\n};\n\nclass Circle : public Shape {\n    double radius;\npublic:\n    Circle(double r) : radius(r) {}\n    double getArea() const override { return 3.14159 * radius * radius; }\n};\n\nclass Rectangle : public Shape {\n    double w, h;\npublic:\n    Rectangle(double width, double height) : w(width), h(height) {}\n    double getArea() const override { return w * h; }\n};'
      },
      {
        id: 4,
        number: 'Question 4',
        section: 'Section B — OOP Architecture & Implementation',
        marks: '10 Marks',
        questionText: 'Explain Deep Copy vs Shallow Copy when dynamically allocating memory inside constructors and destructors.',
        answerText: 'Shallow Copy: Copies pointer addresses directly (default copy constructor). Both objects point to same heap memory, leading to double-free errors during destruction.\nDeep Copy: Allocates new independent heap memory buffer and copies values over, ensuring safe destruction.\nImplementation requires custom Copy Constructor and Assignment Operator (Rule of Three).'
      }
    ];
  }

  // Operating Systems
  if (text.includes('operating') || text.includes('os') || text.includes('csc322')) {
    return [
      {
        id: 1,
        number: 'Question 1',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'Differentiate between a Process and a Thread in terms of memory space, context switching overhead, and communication.',
        answerText: 'Process: Independent execution unit with separate virtual memory space (code, data, heap). High context-switching overhead. Uses IPC (pipes, shared memory).\nThread: Lightweight execution unit sharing code, data, and heap of parent process, but maintaining independent stack and registers. Low context-switch overhead.'
      },
      {
        id: 2,
        number: 'Question 2',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'List Coffman\'s four necessary conditions for Deadlock occurrence in an Operating System.',
        answerText: '1. Mutual Exclusion: At least one resource held in non-shareable mode.\n2. Hold and Wait: Process holding at least one resource while requesting additional resources.\n3. No Preemption: Resources cannot be forcibly taken from a process.\n4. Circular Wait: A closed chain of processes exists where each holds resources needed by next.'
      },
      {
        id: 3,
        number: 'Question 3',
        section: 'Section B — OS Algorithms & Analysis',
        marks: '10 Marks',
        questionText: 'Three processes P1(burst=6), P2(burst=2), P3(burst=8) arrive at t=0. Calculate Average Waiting Time using FCFS and SJF scheduling.',
        answerText: 'FCFS Scheduling:\nExecution order: P1(0-6), P2(6-8), P3(8-16)\nWaiting times: P1=0, P2=6, P3=8\nAverage Waiting Time = (0 + 6 + 8) / 3 = 4.67 units\n\nSJF Scheduling:\nExecution order: P2(0-2), P1(2-8), P3(8-16)\nWaiting times: P2=0, P1=2, P3=8\nAverage Waiting Time = (0 + 2 + 8) / 3 = 3.33 units.'
      },
      {
        id: 4,
        number: 'Question 4',
        section: 'Section B — OS Algorithms & Analysis',
        marks: '10 Marks',
        questionText: 'Explain the Virtual Memory Page Fault handling sequence step-by-step from OS trap to page fetch.',
        answerText: 'Step 1: CPU accesses page table; valid/invalid bit is 0 (Page Fault Trap).\nStep 2: OS intercepts trap, saves CPU registers/state.\nStep 3: Check if reference is valid. Locate target page on secondary disk (swap space).\nStep 4: Find free frame in physical RAM (run page replacement if full, e.g. LRU).\nStep 5: Issue disk read I/O operation to fetch page into frame.\nStep 6: Update page table valid bit to 1.\nStep 7: Resume trapped instruction.'
      }
    ];
  }

  // Default Data Structures / General fallback
  return [
    {
      id: 1,
      number: 'Question 1',
      section: 'Section A — Short Conceptual Questions',
      marks: '5 Marks',
      questionText: `Explain core principles of ${subjectName || paperTitle || 'this course'}. Differentiate linear vs non-linear structures.`,
      answerText: 'Linear Data Structures: Elements arranged sequentially (Arrays, Linked Lists, Stacks, Queues).\nNon-Linear Data Structures: Hierarchical or graph connections (Trees, Graphs, Heaps).'
    },
    {
      id: 2,
      number: 'Question 2',
      section: 'Section A — Short Conceptual Questions',
      marks: '5 Marks',
      questionText: 'What is the time complexity of insertion at head vs insertion at tail in a Singly Linked List?',
      answerText: 'Insertion at Head: O(1) time complexity by updating head pointer.\nInsertion at Tail: O(n) without tail pointer (requires list traversal), or O(1) with tail pointer.'
    },
    {
      id: 3,
      number: 'Question 3',
      section: 'Section B — Problem Solving & Algorithm Analysis',
      marks: '10 Marks',
      questionText: 'Write Floyd\'s Cycle Detection algorithm (Tortoise and Hare) to detect cycles in a Linked List.',
      answerText: 'C++ Implementation:\nbool hasCycle(ListNode* head) {\n    if (!head || !head->next) return false;\n    ListNode *slow = head, *fast = head;\n    while (fast && fast->next) {\n        slow = slow->next;\n        fast = fast->next->next;\n        if (slow == fast) return true; // Cycle detected\n    }\n    return false;\n}'
    },
    {
      id: 4,
      number: 'Question 4',
      section: 'Section B — Problem Solving & Algorithm Analysis',
      marks: '10 Marks',
      questionText: 'Construct a balanced binary search tree (AVL Tree) for elements: 10, 20, 30, 40, 50, 25. Show rotation steps.',
      answerText: 'Step 1: Insert 10, 20, 30 -> Right-Right (RR) imbalance at 10. Perform Left Rotation at 10. Root = 20.\nStep 2: Insert 40, 50 -> RR imbalance at 30. Perform Left Rotation at 30.\nStep 3: Insert 25 -> RL imbalance at 20. Perform Right Rotation at 40, then Left Rotation at 20. Root = 30.'
    }
  ];
}

function buildPrompt(subject, subjectCode, numQuestions, difficulty) {
  return `You are an expert computer science professor at COMSATS University Islamabad. Generate ${numQuestions} multiple-choice questions (MCQs) for the subject "${subject}" (${subjectCode || 'university-level course'}).

Difficulty level: ${difficulty}

Requirements:
1. Each question must have exactly 4 options (A, B, C, D)
2. Exactly one option must be correct (0-indexed: 0 for A, 1 for B, 2 for C, 3 for D)
3. Include a brief hint/explanation for each question (1-2 sentences)
4. Respond ONLY with a valid JSON array.

JSON Structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 1,
    "hint": "Explanation or hint here."
  }
]

Generate exactly ${numQuestions} questions now:`;
}

function parseQuizFromResponse(text, expectedCount) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/g, '');
  }
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return null;
  try {
    const parsed = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const questions = parsed.map((item) => {
      if (!item.question || !Array.isArray(item.options) || item.options.length !== 4) return null;
      let correct = typeof item.correct === 'number' ? item.correct : 0;
      correct = Math.max(0, Math.min(3, Math.floor(correct)));
      return {
        question: String(item.question).trim(),
        options: item.options.map(opt => String(opt).trim()),
        correct,
        hint: item.hint ? String(item.hint).trim() : 'Review core concepts for this topic.',
      };
    }).filter(Boolean);
    return questions.length > 0 ? questions.slice(0, expectedCount) : null;
  } catch { return null; }
}

function getOfflineQuestions(subject = '', subjectCode = '', numQuestions = 10, difficulty = 'Medium') {
  const codeKey = (subjectCode || '').toLowerCase().trim();
  const subKey = (subject || '').toLowerCase().trim();
  let pool = [];

  if (SUBJECT_QUESTION_BANKS[codeKey]) {
    pool = [...SUBJECT_QUESTION_BANKS[codeKey]];
  } else if (subKey.includes('ict') || subKey.includes('introduction to ict')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc101']];
  } else if (subKey.includes('data structure') || subKey.includes('algorithm')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc211']];
  } else if (subKey.includes('programming') || subKey.includes('fundamental')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc102']];
  } else if (subKey.includes('object') || subKey.includes('oop')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc241']];
  } else if (subKey.includes('database') || subKey.includes('sql')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc371']];
  } else if (subKey.includes('operating system') || subKey.includes('os')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc322']];
  } else if (subKey.includes('linear algebra') || subKey.includes('matrix')) {
    pool = [...SUBJECT_QUESTION_BANKS['mth231']];
  } else if (subKey.includes('artificial intelligence') || subKey.includes('ai')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc441']];
  } else if (subKey.includes('digital logic') || subKey.includes('dld') || subKey.includes('circuit')) {
    pool = [...SUBJECT_QUESTION_BANKS['eee241']];
  } else if (subKey.includes('software engineering') || subKey.includes('software')) {
    pool = [...SUBJECT_QUESTION_BANKS['swe301']];
  } else if (subKey.includes('network') || subKey.includes('communication')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc311']];
  } else if (subKey.includes('calculus') || subKey.includes('math')) {
    pool = [...SUBJECT_QUESTION_BANKS['mth104']];
  } else {
    Object.values(SUBJECT_QUESTION_BANKS).forEach(bank => {
      pool.push(...bank);
    });
  }

  const result = [];
  for (let i = 0; i < numQuestions; i++) {
    if (i < pool.length) {
      result.push(pool[i]);
    } else {
      const baseObj = pool[i % pool.length];
      result.push({
        question: `[${difficulty}] ${subject || 'Course'} Q${i + 1}: ${baseObj.question}`,
        options: [...baseObj.options],
        correct: baseObj.correct,
        hint: `Hint for Q${i + 1}: ${baseObj.hint}`,
      });
    }
  }

  return result;
}
