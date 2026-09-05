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
 * Used when API key is missing/invalid or offline.
 */
const SUBJECT_QUESTION_BANKS = {
  // Data Structures & Algorithms (CSC211)
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
    {
      question: 'What is the worst-case space complexity of recursive Depth-First Search on a tree of height h?',
      options: ['O(1)', 'O(h)', 'O(2^h)', 'O(n²)'],
      correct: 1,
      hint: 'The maximum stack depth corresponds to the maximum height of the tree.',
    },
    {
      question: 'Which data structure is best suited for implementing a FIFO queue?',
      options: ['Single-ended Stack', 'Circular Array / Linked List', 'Binary Search Tree', 'Min Heap'],
      correct: 1,
      hint: 'First In First Out requires efficient enqueue at tail and dequeue from head.',
    },
    {
      question: 'What is the worst-case time complexity of searching in an unbalanced Binary Search Tree (BST)?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correct: 2,
      hint: 'When a BST degenerates into a single line (skewed tree), search becomes linear.',
    },
    {
      question: 'Which algorithm is used to find the shortest path in a weighted graph with non-negative edges?',
      options: ['Dijkstra Algorithm', 'Prim Algorithm', 'Kruskal Algorithm', 'Floyd-Warshall'],
      correct: 0,
      hint: 'Uses a priority queue / min-heap to greedily expand the shortest path.',
    },
    {
      question: 'What is the time complexity of searching an element in a Hash Table with good hashing?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      correct: 0,
      hint: 'Direct index computation via hash functions provides near-instant lookup.',
    },
  ],

  // Programming Fundamentals (CSC102)
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
    {
      question: 'What does the break statement do inside a loop?',
      options: ['Terminates the current iteration', 'Exits the loop immediately', 'Restarts the loop', 'Skips to next switch case'],
      correct: 1,
      hint: 'It breaks out of the enclosing loop or switch construct completely.',
    },
    {
      question: 'What is the index of the first element in a 0-indexed C++ array of size 5?',
      options: ['0', '1', '-1', '5'],
      correct: 0,
      hint: 'Arrays in C/C++ are zero-indexed.',
    },
    {
      question: 'Which operator is used to access members of a structure through a pointer?',
      options: ['.', '->', '*', '&'],
      correct: 1,
      hint: 'The arrow operator (->) dereferences the pointer and accesses the member.',
    },
  ],

  // Object Oriented Programming (CSC241)
  'csc241': [
    {
      question: 'Which OOP principle allows a class to inherit properties from another class?',
      options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Abstraction'],
      correct: 2,
      hint: 'Inheritance allows child classes to reuse code from parent classes.',
    },
    {
      question: 'What is a constructor in OOP?',
      options: ['A function to destroy objects', 'A special method called automatically upon object creation', 'A static utility function', 'A private access modifier'],
      correct: 1,
      hint: 'Constructors initialize member variables when an object is instantiated.',
    },
    {
      question: 'Which keyword is used in C++ to achieve runtime polymorphism?',
      options: ['static', 'virtual', 'friend', 'override'],
      correct: 1,
      hint: 'Virtual functions enable dynamic method binding via V-Table.',
    },
    {
      question: 'What is Encapsulation?',
      options: ['Creating multiple functions with same name', 'Bundling data and methods that operate on that data inside a class with controlled access', 'Inheriting from multiple parent classes', 'Converting an abstract class to concrete'],
      correct: 1,
      hint: 'Protects object internal state using private/protected access modifiers.',
    },
    {
      question: 'What is an Abstract Class?',
      options: ['A class that cannot be instantiated and contains at least one pure virtual function', 'A class with only static methods', 'A class with no member variables', 'A template class'],
      correct: 0,
      hint: 'In C++, abstract classes define interface contracts via `virtual returnType function() = 0`.',
    },
  ],

  // Database Systems (CSC371)
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
    {
      question: 'Which key uniquely identifies a record in a relational database table?',
      options: ['Foreign Key', 'Primary Key', 'Candidate Key', 'Composite Key'],
      correct: 1,
      hint: 'A Primary Key must contain unique, non-null values for every row.',
    },
    {
      question: 'Which Normal Form eliminates transitive functional dependencies?',
      options: ['1NF', '2NF', '3NF', 'BCNF'],
      correct: 2,
      hint: 'Third Normal Form requires non-key attributes to depend ONLY on the primary key.',
    },
    {
      question: 'What does a FOREIGN KEY constraint enforce?',
      options: ['Entity Integrity', 'Referential Integrity', 'Domain Integrity', 'User Integrity'],
      correct: 1,
      hint: 'Ensures relationship references between parent and child tables remain valid.',
    },
  ],

  // Computer Networks (CSC311)
  'csc311': [
    {
      question: 'How many layers are in the standard OSI model reference framework?',
      options: ['4', '5', '7', '9'],
      correct: 2,
      hint: 'Application, Presentation, Session, Transport, Network, Data Link, Physical.',
    },
    {
      question: 'Which protocol operates at the Transport Layer of the TCP/IP stack to provide reliable connection-oriented delivery?',
      options: ['UDP', 'IP', 'TCP', 'HTTP'],
      correct: 2,
      hint: 'Transmission Control Protocol performs three-way handshakes and error checking.',
    },
    {
      question: 'What is the primary function of the ARP protocol?',
      options: ['Resolves domain names to IP addresses', 'Maps IP addresses to MAC physical addresses', 'Translates private IP to public IP', 'Encrypts web traffic'],
      correct: 1,
      hint: 'Address Resolution Protocol resolves IP addresses to Layer 2 Ethernet addresses.',
    },
    {
      question: 'Which port number is default for secure HTTPS communication?',
      options: ['80', '21', '443', '8080'],
      correct: 2,
      hint: 'Port 80 is HTTP, port 443 is HTTPS.',
    },
  ],

  // Calculus & Analytical Geometry (MTH104)
  'mth104': [
    {
      question: 'What is the derivative of f(x) = x³ with respect to x?',
      options: ['3x²', 'x²/3', '3x', 'x⁴/4'],
      correct: 0,
      hint: 'Apply the Power Rule: d/dx [x^n] = n * x^(n-1).',
    },
    {
      question: 'What is the integral ∫ cos(x) dx?',
      options: ['-sin(x) + C', 'sin(x) + C', 'tan(x) + C', '-cos(x) + C'],
      correct: 1,
      hint: 'The derivative of sin(x) is cos(x).',
    },
    {
      question: 'What is the limit of (sin x) / x as x approaches 0?',
      options: ['0', '1', 'Infinity', 'Undefined'],
      correct: 1,
      hint: 'This is a fundamental trigonometric limit in calculus.',
    },
    {
      question: 'What does L\'Hôpital\'s Rule help evaluate?',
      options: ['Indeterminate forms like 0/0 or ∞/∞', 'Definite integrals with variable bounds', 'Partial differential equations', 'Matrix determinants'],
      correct: 0,
      hint: 'Differentiates numerator and denominator separately when encountering 0/0.',
    },
  ]
};

/**
 * Generate MCQ questions for a given subject using Groq AI with automatic subject-aware fallbacks.
 *
 * @param {object} opts
 * @param {string} opts.subject - Subject name (e.g., "Data Structures & Algorithms")
 * @param {string} opts.subjectCode - Subject code (e.g., "CSC211")
 * @param {number} opts.numQuestions - Number of questions to generate (5-20)
 * @param {string} opts.difficulty - "Easy" | "Medium" | "Hard"
 * @returns {Promise<Array<{question: string, options: string[], correct: number, hint: string}>>}
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
      } else {
        console.warn(`Groq API error HTTP ${response.status}. Using subject-aware fallback engine.`);
      }
    } catch (err) {
      console.warn('Groq AI API fetch failed, switching to fallback quiz engine:', err.message);
    }
  }

  // Fallback to high-quality subject-aware questions
  return getOfflineQuestions(subject, subjectCode, numQuestions, difficulty);
}

/**
 * Build the prompt for Groq AI to generate a structured MCQ quiz.
 */
function buildPrompt(subject, subjectCode, numQuestions, difficulty) {
  return `You are an expert computer science professor at COMSATS University Islamabad. Generate ${numQuestions} multiple-choice questions (MCQs) for the subject "${subject}" (${subjectCode || 'university-level course'}).

Difficulty level: ${difficulty}

Requirements:
1. Each question must have exactly 4 options (A, B, C, D)
2. Exactly one option must be correct (0-indexed: 0 for A, 1 for B, 2 for C, 3 for D)
3. Include a brief hint/explanation for each question (1-2 sentences)
4. Questions should be clear, educational, and tailored to ${difficulty} difficulty
5. Respond ONLY with a valid JSON array. No markdown code blocks, no text before or after.

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

/**
 * Parse the JSON array from Groq's response.
 */
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
      if (!item.question || !Array.isArray(item.options) || item.options.length !== 4) {
        return null;
      }
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
  } catch (err) {
    console.error('Failed to parse AI response:', err);
    return null;
  }
}

/**
 * High-quality offline question generator by subject code or topic keywords.
 */
function getOfflineQuestions(subject = '', subjectCode = '', numQuestions = 10, difficulty = 'Medium') {
  const codeKey = (subjectCode || '').toLowerCase().trim();
  const subKey = (subject || '').toLowerCase().trim();

  let pool = [];

  // Match by code first, then by title keywords
  if (SUBJECT_QUESTION_BANKS[codeKey]) {
    pool = [...SUBJECT_QUESTION_BANKS[codeKey]];
  } else if (subKey.includes('data structure') || subKey.includes('algorithm')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc211']];
  } else if (subKey.includes('programming') || subKey.includes('fundamental')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc102']];
  } else if (subKey.includes('object') || subKey.includes('oop')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc241']];
  } else if (subKey.includes('database') || subKey.includes('sql')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc371']];
  } else if (subKey.includes('network') || subKey.includes('communication')) {
    pool = [...SUBJECT_QUESTION_BANKS['csc311']];
  } else if (subKey.includes('calculus') || subKey.includes('math')) {
    pool = [...SUBJECT_QUESTION_BANKS['mth104']];
  } else {
    // Combine all available questions for general subjects
    Object.values(SUBJECT_QUESTION_BANKS).forEach(bank => {
      pool.push(...bank);
    });
  }

  // Generate dynamic questions if pool is smaller than requested count
  const result = [];
  for (let i = 0; i < numQuestions; i++) {
    if (i < pool.length) {
      result.push(pool[i]);
    } else {
      // Dynamic question generator for extra slots to prevent duplicate questions
      const baseObj = pool[i % pool.length];
      result.push({
        question: `[${difficulty}] ${subject || 'Course'} Practice Q${i + 1}: ${baseObj.question}`,
        options: [...baseObj.options],
        correct: baseObj.correct,
        hint: `Hint for Q${i + 1}: ${baseObj.hint}`,
      });
    }
  }

  return result;
}
