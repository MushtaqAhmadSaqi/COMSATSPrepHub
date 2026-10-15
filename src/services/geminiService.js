/**
 * COMSATS Quiz & Exam Question Bank Service
 * Uses the server-side /api/generate-quiz endpoint first (keeping AI API keys
 * strictly on the server) and provides a comprehensive, subject-aware COMSATS
 * offline question bank fallback.
 */

const SERVER_QUIZ_API_URL = '/api/generate-quiz';

/**
 * Subject-specific question banks for COMSATS University courses.
 */
export const SUBJECT_QUESTION_BANKS = {
  // CSC101: Introduction to ICT
  csc101: [
    {
      question: 'What is the primary function of the CPU in a computer system?',
      options: ['Store permanent data', 'Perform arithmetic & logic processing', 'Display graphics', 'Manage network connections'],
      correct: 1,
      hint: 'The CPU acts as the brain of the computer executing instructions.'
    },
    {
      question: 'Which type of memory is volatile and loses contents when power is turned off?',
      options: ['ROM', 'SSD', 'RAM', 'Hard Disk'],
      correct: 2,
      hint: 'Random Access Memory is temporary working memory.'
    },
    {
      question: 'How many bits make up one Byte?',
      options: ['4 bits', '8 bits', '16 bits', '32 bits'],
      correct: 1,
      hint: '1 Byte = 8 bits.'
    },
    {
      question: 'Which number system uses base 16 and digits 0–9 along with letters A–F?',
      options: ['Binary', 'Octal', 'Decimal', 'Hexadecimal'],
      correct: 3,
      hint: 'Hexadecimal represents 4 binary bits per digit.'
    },
    {
      question: 'Which component converts AC power from the wall outlet into DC power for the PC?',
      options: ['Motherboard', 'UPS', 'Power Supply Unit (PSU)', 'Heat Sink'],
      correct: 2,
      hint: 'The PSU steps down and rectifies alternating current to direct current.'
    }
  ],

  // CSC102: Programming Fundamentals
  csc102: [
    {
      question: 'Which of the following is a primitive data type in C++?',
      options: ['string', 'int', 'vector', 'fstream'],
      correct: 1,
      hint: 'int, float, char, and double are built-in primitive data types.'
    },
    {
      question: 'What will be the output of 7 % 3 in C++?',
      options: ['2', '1', '2.33', '0'],
      correct: 1,
      hint: 'The modulo operator % returns the remainder of integer division.'
    },
    {
      question: 'Which loop is guaranteed to execute its body at least once?',
      options: ['for loop', 'while loop', 'do-while loop', 'foreach loop'],
      correct: 2,
      hint: 'The condition is evaluated AFTER executing the body.'
    },
    {
      question: 'What does the address-of operator (&) return when applied to a variable in C++?',
      options: ['The value of the variable', 'The size in bytes', 'The memory address of the variable', 'A copy of the variable'],
      correct: 2,
      hint: 'Pointers store the memory address returned by the & operator.'
    },
    {
      question: 'What is the index of the first element in a standard C++ array?',
      options: ['1', '0', '-1', 'Depends on the compiler'],
      correct: 1,
      hint: 'C++ arrays are zero-indexed.'
    }
  ],

  // CSC211: Data Structures & Algorithms
  csc211: [
    {
      question: 'Which data structure uses LIFO (Last In, First Out) principle?',
      options: ['Queue', 'Stack', 'Array', 'Linked List'],
      correct: 1,
      hint: 'Think about stacking plates — the last one placed is the first one removed.'
    },
    {
      question: 'What is the average time complexity of QuickSort?',
      options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
      correct: 1,
      hint: 'QuickSort divides the array into sub-arrays around a pivot element.'
    },
    {
      question: 'Which traversal technique processes tree nodes level by level?',
      options: ['Preorder', 'Inorder', 'Postorder', 'Level Order (BFS)'],
      correct: 3,
      hint: 'Breadth-First Search uses a Queue to visit nodes level by level.'
    },
    {
      question: 'In a Binary Search Tree (BST), which traversal outputs elements in sorted ascending order?',
      options: ['Preorder', 'Inorder', 'Postorder', 'Reverse Level Order'],
      correct: 1,
      hint: 'Inorder visits Left subtree, Root, then Right subtree.'
    },
    {
      question: 'What is the worst-case time complexity of searching for a key in a singly linked list of n nodes?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correct: 2,
      hint: 'Sequential traversal from the head node is required in the worst case.'
    }
  ],

  // MTH104: Calculus & Analytical Geometry
  mth104: [
    {
      question: 'What is the derivative of f(x) = x³ with respect to x?',
      options: ['3x²', 'x²/3', '3x', 'x⁴/4'],
      correct: 0,
      hint: 'Apply Power Rule: d/dx [x^n] = n * x^(n-1).'
    },
    {
      question: 'What is the integral ∫ cos(x) dx?',
      options: ['-sin(x) + C', 'sin(x) + C', 'tan(x) + C', '-cos(x) + C'],
      correct: 1,
      hint: 'The derivative of sin(x) is cos(x).'
    },
    {
      question: 'What is the value of the limit lim(x→0) [sin(x) / x]?',
      options: ['0', '1', '∞', 'Undefined'],
      correct: 1,
      hint: 'A fundamental trigonometric limit in single-variable calculus.'
    }
  ],

  // CSC322: Operating Systems
  csc322: [
    {
      question: 'What is a deadlock in Operating Systems?',
      options: ['A crash in user space', 'A situation where two or more processes are blocked waiting for each other', 'A hardware memory error', 'An infinite loop in a thread'],
      correct: 1,
      hint: 'Deadlock occurs when processes hold resources while waiting for resources held by others.'
    },
    {
      question: 'Which CPU scheduling algorithm gives smallest average waiting time?',
      options: ['FCFS', 'Round Robin', 'Shortest Job First (SJF)', 'Priority Scheduling'],
      correct: 2,
      hint: 'SJF is provably optimal for minimizing average waiting time.'
    }
  ],

  // CSC241: Object Oriented Programming
  csc241: [
    {
      question: 'Which OOP principle allows a child class to inherit properties from a parent class?',
      options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Abstraction'],
      correct: 2,
      hint: 'Inheritance allows child classes to reuse code from parent classes.'
    },
    {
      question: 'What is a constructor in OOP?',
      options: ['Function to destroy objects', 'Special method called automatically upon object creation', 'Static helper function', 'Access modifier'],
      correct: 1,
      hint: 'Constructors initialize member variables when an object is instantiated.'
    }
  ],

  // CSC371: Database Systems
  csc371: [
    {
      question: 'Which SQL command is used to retrieve data from a database table?',
      options: ['GET', 'FETCH', 'SELECT', 'EXTRACT'],
      correct: 2,
      hint: 'The standard SQL query command begins with SELECT.'
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
      hint: 'Guarantees reliable transaction processing in DBMS.'
    }
  ],

  // MTH231: Linear Algebra
  mth231: [
    {
      question: 'What is the determinant of a 2x2 matrix [[a, b], [c, d]]?',
      options: ['ad + bc', 'ad - bc', 'ab - cd', 'ac - bd'],
      correct: 1,
      hint: 'det(A) = ad - bc for a 2x2 matrix.'
    }
  ],

  // CSC311: Computer Networks
  csc311: [
    {
      question: 'How many layers are in the OSI reference model?',
      options: ['4', '5', '7', '9'],
      correct: 2,
      hint: 'Application, Presentation, Session, Transport, Network, Data Link, Physical.'
    }
  ],

  // CSC441: Artificial Intelligence
  csc441: [
    {
      question: 'Which search algorithm is guaranteed to find the shortest path on an unweighted graph?',
      options: ['Depth First Search (DFS)', 'Breadth First Search (BFS)', 'Greedy Best First Search', 'Hill Climbing'],
      correct: 1,
      hint: 'BFS expands node by node level-wise.'
    }
  ],

  // EEE241: Digital Logic Design
  eee241: [
    {
      question: 'What is the output of an AND gate when inputs are A=1 and B=0?',
      options: ['0', '1', 'High impedance', 'Undefined'],
      correct: 0,
      hint: 'AND gate outputs 1 only when BOTH inputs are 1.'
    }
  ],

  // SWE301: Software Engineering Concepts
  swe301: [
    {
      question: 'Which software development model follows a sequential step-by-step linear flow?',
      options: ['Agile', 'Scrum', 'Waterfall', 'Spiral'],
      correct: 2,
      hint: 'Waterfall flows downwards through Requirements, Design, Implementation, Verification, Maintenance.'
    }
  ]
};

async function callServerQuizApi({ subject, subjectCode, numQuestions, difficulty, signal }) {
  try {
    const response = await fetch(SERVER_QUIZ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        subject,
        subjectCode,
        difficulty,
        questionCount: numQuestions
      })
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const sourceQuestions = Array.isArray(payload) ? payload : payload.questions;
    if (!Array.isArray(sourceQuestions) || sourceQuestions.length === 0) return null;

    return sourceQuestions
      .map((item) => {
        if (!item.question || !Array.isArray(item.options) || item.options.length !== 4) return null;
        const correct = Number.isInteger(item.correctAnswer)
          ? item.correctAnswer
          : Number.isInteger(item.correct)
            ? item.correct
            : 0;

        return {
          question: String(item.question).trim(),
          options: item.options.map((option) => String(option).trim()),
          correct: Math.max(0, Math.min(3, correct)),
          hint: String(item.explanation || item.hint || 'Review the core concept behind this answer.').trim(),
          source: 'api'
        };
      })
      .filter(Boolean)
      .slice(0, numQuestions);
  } catch {
    return null;
  }
}

export async function generateQuizWithGemini({
  subject,
  subjectCode,
  numQuestions = 10,
  difficulty = 'Medium',
  signal
}) {
  const serverQuestions = await callServerQuizApi({
    subject,
    subjectCode,
    numQuestions,
    difficulty,
    signal
  });
  if (serverQuestions && serverQuestions.length > 0) return serverQuestions;

  return getOfflineQuestions(subject, subjectCode, numQuestions, difficulty);
}

export async function generateExamPaperQuestions({
  subjectName = '',
  subjectCode = '',
  paperTitle = '',
  term = 'Terminal',
  year = '2023'
}) {
  return getOfflineExamQuestions(subjectName, subjectCode, paperTitle, term, year);
}

export function getOfflineExamQuestions(
  subjectName = '',
  subjectCode = '',
  paperTitle = '',
  term = 'Terminal',
  year = '2023'
) {
  const text = `${subjectName} ${subjectCode} ${paperTitle}`.toLowerCase();

  if (text.includes('math') || text.includes('calculus') || text.includes('mth104') || text.includes('mth105') || text.includes('linear')) {
    return [
      {
        id: 1,
        number: 'Question 1',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: 'Explain the difference between local extrema and absolute extrema of a function f(x). State the First Derivative Test conditions.',
        answerText: "Local Extrema: A point x=c is a local maximum if f(c) >= f(x) for all x in an open interval around c. It is a local minimum if f(c) <= f(x).\nAbsolute Extrema: The highest or lowest value that a function takes over its entire domain.\nFirst Derivative Test: If f'(x) changes sign from positive to negative at critical point c, then f(c) is a local maximum. If f'(x) changes from negative to positive, f(c) is a local minimum."
      },
      {
        id: 2,
        number: 'Question 2',
        section: 'Section A — Short Conceptual Questions',
        marks: '5 Marks',
        questionText: "State L'Hôpital's Rule and use it to evaluate the limit: lim (x→0) [ (sin 5x) / (2x) ].",
        answerText: "L'Hôpital's Rule: If lim f(x)/g(x) results in an indeterminate form 0/0 or ∞/∞, then lim f(x)/g(x) = lim f'(x)/g'(x).\nEvaluation:\n1. Direct substitution: sin(0)/0 = 0/0 (Indeterminate).\n2. Apply L'Hôpital's Rule: d/dx[sin 5x] = 5 cos 5x, d/dx[2x] = 2.\n3. Evaluate limit: lim (x→0) [ (5 cos 5x) / 2 ] = (5 * 1) / 2 = 5/2."
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
        answerText: 'Step 1: Characteristic Equation det(A - λI) = 0:\n|[4-λ, 1], [2, 3-λ]| = (4-λ)(3-λ) - (1)(2) = λ² - 7λ + 10 = 0\n\nStep 2: Solve for λ:\n(λ - 5)(λ - 2) = 0 => Eigenvalues: λ1 = 5, λ2 = 2.\n\nStep 3: Eigenvectors:\nFor λ1 = 5: [-1x + y = 0] => y = x => Eigenvector v1 = [1, 1]^T\nFor λ2 = 2: [2x + y = 0] => y = -2x => Eigenvector v2 = [1, -2]^T.'
      }
    ];
  }

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
      }
    ];
  }

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
      questionText: "Write Floyd's Cycle Detection algorithm (Tortoise and Hare) to detect cycles in a Linked List.",
      answerText: 'C++ Implementation:\nbool hasCycle(ListNode* head) {\n    if (!head || !head->next) return false;\n    ListNode *slow = head, *fast = head;\n    while (fast && fast->next) {\n        slow = slow->next;\n        fast = fast->next->next;\n        if (slow == fast) return true;\n    }\n    return false;\n}'
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

export function getOfflineQuestions(
  subject = '',
  subjectCode = '',
  numQuestions = 10,
  difficulty = 'Medium'
) {
  const codeKey = (subjectCode || '').toLowerCase().trim();
  const subKey = (subject || '').toLowerCase().trim();
  let pool = [];

  if (SUBJECT_QUESTION_BANKS[codeKey]) {
    pool = [...SUBJECT_QUESTION_BANKS[codeKey]];
  } else if (subKey.includes('ict') || subKey.includes('introduction to ict')) {
    pool = [...SUBJECT_QUESTION_BANKS.csc101];
  } else if (subKey.includes('data structure') || subKey.includes('algorithm') || subKey.includes('bst') || subKey.includes('tree')) {
    pool = [...SUBJECT_QUESTION_BANKS.csc211];
  } else if (subKey.includes('programming') || subKey.includes('fundamental') || subKey.includes('c++')) {
    pool = [...SUBJECT_QUESTION_BANKS.csc102];
  } else if (subKey.includes('object') || subKey.includes('oop')) {
    pool = [...SUBJECT_QUESTION_BANKS.csc241];
  } else if (subKey.includes('database') || subKey.includes('sql')) {
    pool = [...SUBJECT_QUESTION_BANKS.csc371];
  } else if (subKey.includes('operating system') || subKey.includes('os')) {
    pool = [...SUBJECT_QUESTION_BANKS.csc322];
  } else if (subKey.includes('linear algebra') || subKey.includes('matrix')) {
    pool = [...SUBJECT_QUESTION_BANKS.mth231];
  } else if (subKey.includes('artificial intelligence') || subKey.includes('ai')) {
    pool = [...SUBJECT_QUESTION_BANKS.csc441];
  } else if (subKey.includes('digital logic') || subKey.includes('dld') || subKey.includes('circuit')) {
    pool = [...SUBJECT_QUESTION_BANKS.eee241];
  } else if (subKey.includes('software engineering') || subKey.includes('software')) {
    pool = [...SUBJECT_QUESTION_BANKS.swe301];
  } else if (subKey.includes('network') || subKey.includes('communication')) {
    pool = [...SUBJECT_QUESTION_BANKS.csc311];
  } else if (subKey.includes('calculus') || subKey.includes('math')) {
    pool = [...SUBJECT_QUESTION_BANKS.mth104];
  } else {
    Object.values(SUBJECT_QUESTION_BANKS).forEach((bank) => {
      pool.push(...bank);
    });
  }

  const result = [];
  for (let i = 0; i < numQuestions; i++) {
    if (i < pool.length) {
      result.push({ ...pool[i], isOfflineFallback: true });
    } else {
      const baseObj = pool[i % pool.length];
      result.push({
        question: `[${difficulty}] ${subject || 'Course'} Q${i + 1}: ${baseObj.question}`,
        options: [...baseObj.options],
        correct: baseObj.correct,
        hint: `Hint for Q${i + 1}: ${baseObj.hint}`,
        isOfflineFallback: true
      });
    }
  }

  return result;
}
