import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { clearPapersCache } from '../../services/papersService';
import { DEFAULT_SUBJECTS } from '../../constants/subjects';
import { useToast } from '../../utils/toast';
import './AdminPaste.css';

  export const AI_MASTER_PROMPT = `You are an expert COMSATS University examination paper transcriber and academic solution specialist.
I will attach or provide raw content (images, scan, PDF, or text) of a COMSATS examination paper.

Your task is to transcribe, structure, and provide model answers in the EXACT JSON format specified below so it can be directly imported into the COMSATSPrepHub database.

### RULES & INSTRUCTIONS:
1. Extract ALL questions and sub-parts accurately without omitting any question.
2. For every question, generate a comprehensive, high-scoring MODEL ANSWER tailored to COMSATS marking schemes. Include formulas, bullet points, algorithms, or code where applicable.
3. Extract or specify realistic marks for each question (e.g., 5, 10, or 15 marks).
4. Identify or infer the course details:
   - "subject_code": Course code (e.g. "CSC211", "CSC102", "MTH104", "EEE241")
   - "subject_name": Full title of the course
   - "title": Clean title (e.g. "CSC211 — Terminal Examination (Spring 2024)")
   - "term": Either "Terminal" or "Midterm"
   - "year": Integer year (e.g. 2024)
   - "semester": e.g. "Spring 2024" or "Fall 2023"
   - "total_marks": Sum of question marks (e.g. 50 or 25)
   - "instructor_name": "COMSATS Faculty"
5. Assign a Course Learning Outcome tag to each question (e.g., "CLO-1", "CLO-2", "CLO-3", or topic name).
6. OUTPUT ONLY VALID RAW JSON. Do NOT include markdown code blocks, backticks, or explanatory conversation.

### EXACT JSON FORMAT:
{
  "subject_code": "CSC211",
  "subject_name": "Data Structures & Algorithms",
  "title": "CSC211 — Terminal Examination (Spring 2024)",
  "term": "Terminal",
  "year": 2024,
  "semester": "Spring 2024",
  "total_marks": 50,
  "instructor_name": "COMSATS Faculty",
  "questions": [
    {
      "question_number": 1,
      "question_text": "Explain the differences between AVL Tree and Red-Black Tree. Under what circumstances is an AVL tree preferred over a Red-Black tree?",
      "model_answer": "AVL trees are more strictly balanced than Red-Black trees. The balance factor of each node in an AVL tree can only be -1, 0, or +1. Because of this strict balancing, AVL trees provide faster O(log n) lookups. In contrast, Red-Black trees require fewer rotations during insertions and deletions. Therefore, an AVL tree is preferred in lookup-intensive applications like database index search trees.",
      "marks": 10,
      "clo": "CLO-2"
    },
    {
      "question_number": 2,
      "question_text": "Write the algorithm to detect a cycle in a directed graph using Depth First Search (DFS).",
      "model_answer": "1. Initialize two boolean arrays: visited[] and inStack[] of size V, set all to false.\\n2. For each unvisited vertex v:\\n   a. Mark v as visited and inStack[v] = true.\\n   b. For each adjacent vertex u of v:\\n      - If u is not visited, recursively call isCyclic(u).\\n      - If inStack[u] is true, a back-edge exists, cycle is detected.\\n   c. Pop v from recursion stack (inStack[v] = false).\\n3. If no cycle is found, return false.",
      "marks": 10,
      "clo": "CLO-3"
    }
  ]
}`;

  const SAMPLE_PAYLOAD = {
    subject_code: 'CSC211',
    subject_name: 'Data Structures & Algorithms',
    title: 'CSC211 — Terminal Examination (Spring 2024)',
    term: 'Terminal',
    year: 2024,
    semester: 'Spring 2024',
    total_marks: 50,
    instructor_name: 'COMSATS Faculty',
    questions: [
      {
        question_number: 1,
        question_text: 'Explain the differences between AVL Tree and Red-Black Tree. Under what circumstances is an AVL tree preferred over a Red-Black tree?',
        model_answer: 'AVL trees are more strictly balanced than Red-Black trees. The balance factor of each node in an AVL tree can only be -1, 0, or +1. Because of this strict balancing, AVL trees provide faster O(log n) lookups. In contrast, Red-Black trees require fewer rotations during insertions and deletions. Therefore, an AVL tree is preferred in lookup-intensive applications like database index search trees.',
        marks: 10,
        clo: 'CLO-2'
      },
      {
        question_number: 2,
        question_text: 'Write the algorithm to detect a cycle in a directed graph using Depth First Search (DFS).',
        model_answer: '1. Initialize two boolean arrays: visited[] and inStack[] of size V, set all to false.\n2. For each unvisited vertex v:\n   a. Mark v as visited and inStack[v] = true.\n   b. For each adjacent vertex u of v:\n      - If u is not visited, recursively call isCyclic(u).\n      - If inStack[u] is true, a back-edge exists, cycle is detected.\n   c. Pop v from recursion stack (inStack[v] = false).\n3. If no cycle is found, return false.',
        marks: 10,
        clo: 'CLO-3'
      },
      {
        question_number: 3,
        question_text: 'What is open addressing in Hash Tables? Differentiate between Linear Probing, Quadratic Probing, and Double Hashing.',
        model_answer: 'In Open Addressing, all elements are stored directly within the hash table array (no linked lists). When collision occurs, an alternative cell is probed:\n- Linear Probing: Uses h(k, i) = (h\'(k) + i) mod m. Suffers from primary clustering.\n- Quadratic Probing: Uses h(k, i) = (h\'(k) + c1*i + c2*i^2) mod m. Avoids primary clustering but causes secondary clustering.\n- Double Hashing: Uses h(k, i) = (h1(k) + i*h2(k)) mod m. Best uniform distribution among probing techniques.',
        marks: 10,
        clo: 'CLO-1'
      }
    ]
  };

  /**
   * Extracts and sanitizes JSON from user text, stripping AI chat wrappers
   * or markdown code blocks like ```json ... ```.
   */
  function extractJsonFromText(input) {
    let trimmed = String(input || '').trim();

    // Strip code fences if present (```json ... ```)
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      trimmed = codeBlockMatch[1].trim();
    } else {
      // If text has conversational prefix/suffix, find outermost JSON brackets
      const firstBrace = trimmed.indexOf('{');
      const firstBracket = trimmed.indexOf('[');

      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        const lastBrace = trimmed.lastIndexOf('}');
        if (lastBrace !== -1) {
          trimmed = trimmed.substring(firstBrace, lastBrace + 1);
        }
      } else if (firstBracket !== -1) {
        const lastBracket = trimmed.lastIndexOf(']');
        if (lastBracket !== -1) {
          trimmed = trimmed.substring(firstBracket, lastBracket + 1);
        }
      }
    }

    return JSON.parse(trimmed);
  }

  /**
   * Normalizes raw parsed data into a standard array of paper objects.
   */
  function normalizePapersPayload(rawData) {
    let papers = [];

    if (Array.isArray(rawData)) {
      // Check if it's an array of papers or an array of questions
      if (rawData.length > 0 && (rawData[0].questions || rawData[0].subject_code)) {
        papers = rawData;
      } else {
        // It is an array of questions directly
        papers = [
          {
            subject_code: 'CSC211',
            subject_name: 'Data Structures & Algorithms',
            title: 'Imported Past Paper',
            term: 'Terminal',
            year: new Date().getFullYear(),
            semester: `Spring ${new Date().getFullYear()}`,
            total_marks: rawData.reduce((sum, q) => sum + (Number(q.marks) || 0), 0) || 50,
            instructor_name: 'COMSATS Faculty',
            questions: rawData
          }
        ];
      }
    } else if (rawData && typeof rawData === 'object') {
      papers = [rawData];
    }

    return papers.map((p, pIdx) => {
      const rawCode = String(p.subject_code || p.subjectCode || 'CSC211').toUpperCase().trim();
      const catalogMatch = DEFAULT_SUBJECTS.find((s) => s.code.toUpperCase() === rawCode);
      const subjectName = String(p.subject_name || p.subjectName || catalogMatch?.name || rawCode).trim();
      const term = String(p.term || 'Terminal').trim();
      const year = Number(p.year) || new Date().getFullYear();
      const semester = String(p.semester || `${term} ${year}`).trim();
      const title = String(p.title || `${rawCode} — ${term} Examination (${semester})`).trim();
      const questions = Array.isArray(p.questions) ? p.questions : [];

      const computedMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
      const totalMarks = p.total_marks ? Number(p.total_marks) : (computedMarks || 50);

      return {
        index: pIdx + 1,
        subject_code: rawCode,
        subject_name: subjectName,
        title,
        term,
        year,
        semester,
        total_marks: totalMarks,
        instructor_name: String(p.instructor_name || 'COMSATS Faculty').trim(),
        file_url: p.file_url || null,
        questions: questions.map((q, qIdx) => ({
          question_number: Number(q.question_number || q.number || qIdx + 1),
          question_text: String(q.question_text || q.questionText || q.question || '').trim(),
          model_answer: String(q.model_answer || q.answerText || q.answer || '').trim(),
          marks: q.marks ? Number(q.marks) : 10,
          clo: String(q.clo || `CLO-${(qIdx % 4) + 1}`).trim()
        }))
      };
    });
  }

  export default function AdminPaste({ user, onNavigate, onSelectSubject, onSelectPaper }) {
    const toast = useToast();

    const [rawText, setRawText] = useState('');
    const [parsedPapers, setParsedPapers] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const [hasCopiedPrompt, setHasCopiedPrompt] = useState(false);

    // Duplicate detection state
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const [duplicateMatches, setDuplicateMatches] = useState({}); // map: paperIndex -> { exists: boolean, existingId?: string, existingTitle?: string }

    // Uploading state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);
    const [uploadError, setUploadError] = useState('');

    // Expanded question answers in preview
    const [expandedAnswers, setExpandedAnswers] = useState({});

    const toggleAnswer = (key) => {
      setExpandedAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleCopyPrompt = async () => {
      try {
        await navigator.clipboard.writeText(AI_MASTER_PROMPT);
        setHasCopiedPrompt(true);
        toast.success('AI Master Prompt copied to clipboard! Paste it into ChatGPT / Claude.');
        setTimeout(() => setHasCopiedPrompt(false), 3000);
      } catch {
        toast.error('Unable to copy to clipboard automatically. Please copy the text below.');
        setIsPromptExpanded(true);
      }
    };

    const handleLoadSample = () => {
      setRawText(JSON.stringify(SAMPLE_PAYLOAD, null, 2));
      setErrorMsg('');
      setUploadResults(null);
      setUploadError('');
      toast.info('Loaded CSC211 sample paper JSON into editor.');
    };

    // Check Supabase for existing papers whenever parsed papers change
    useEffect(() => {
      if (parsedPapers.length === 0 || !isSupabaseConfigured) {
        setDuplicateMatches({});
        return;
      }

      let isMounted = true;
      async function checkDuplicates() {
        setCheckingDuplicates(true);
        const matches = {};

        try {
          for (const paper of parsedPapers) {
            const subjectCode = paper.subject_code;
            const term = paper.term;
            const year = paper.year;

            // 1. Query by subject_code + term + year
            const { data, error } = await supabase
              .from('past_papers')
              .select('id, title, subject_code, term, year, semester')
              .ilike('subject_code', subjectCode)
              .ilike('term', term)
              .eq('year', year)
              .limit(1);

            if (!error && data && data.length > 0) {
              matches[paper.index] = {
                exists: true,
                existingId: data[0].id,
                existingTitle: data[0].title
              };
            } else {
              // 2. Query fallback by exact title
              const { data: titleData } = await supabase
                .from('past_papers')
                .select('id, title, subject_code, term, year, semester')
                .ilike('title', paper.title)
                .limit(1);

              if (titleData && titleData.length > 0) {
                matches[paper.index] = {
                  exists: true,
                  existingId: titleData[0].id,
                  existingTitle: titleData[0].title
                };
              } else {
                matches[paper.index] = { exists: false };
              }
            }
          }

          if (isMounted) {
            setDuplicateMatches(matches);
          }
        } catch (err) {
          console.warn('Error checking duplicates in Supabase:', err);
        } finally {
          if (isMounted) setCheckingDuplicates(false);
        }
      }

      checkDuplicates();
      return () => {
        isMounted = false;
      };
    }, [parsedPapers]);

    const handleParse = (e) => {
      if (e) e.preventDefault();
      setErrorMsg('');
      setUploadResults(null);
      setUploadError('');
      setParsedPapers([]);

      const trimmed = rawText.trim();
      if (!trimmed) {
        setErrorMsg('Please paste the JSON or AI transcription output into the box above.');
        return;
      }

      try {
        const asJson = extractJsonFromText(trimmed);
        const normalized = normalizePapersPayload(asJson);

        if (normalized.length === 0) {
          setErrorMsg('The provided JSON does not contain any valid papers.');
          return;
        }

        setParsedPapers(normalized);
        toast.success(`Successfully parsed ${normalized.length} paper(s) with ${normalized.reduce((s, p) => s + p.questions.length, 0)} total questions.`);
      } catch (err) {
        // Fallback: check if text has numbered questions blocks
        const blocks = trimmed
          .split(/\n\s*\n+/)
          .map((b) => b.trim())
          .filter(Boolean)
          .map((block, idx) => ({
          question_number: idx + 1,
            question_text: block,
            model_answer: '',
            marks: 10,
            clo: `CLO-${(idx % 4) + 1}`
          }));

          if (blocks.length > 0 && blocks.some((b) => b.question_text.length > 10)) {
            const fallbackPaper = normalizePapersPayload(blocks);
            setParsedPapers(fallbackPaper);
            toast.info(`Extracted ${blocks.length} text blocks as questions. Please review before uploading.`);
          } else {
            setErrorMsg(`JSON Parse Error: ${err.message}. Make sure the pasted content is valid JSON or use the AI Master Prompt.`);
          }
        }
      };

      const handleUploadToSupabase = async () => {
        if (parsedPapers.length === 0) return;
        if (!isSupabaseConfigured) {
          setUploadError('Supabase is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY exist in your .env file.');
          return;
        }

        setIsUploading(true);
        setUploadError('');
        setUploadResults(null);

        const results = [];

        try {
          for (const paper of parsedPapers) {
            const dupInfo = duplicateMatches[paper.index];
            let targetPaperId = null;
            let actionTaken = 'created';

            // CASE 1: PAPER ALREADY EXISTS -> REPLACE IT
            if (dupInfo && dupInfo.exists && dupInfo.existingId) {
              targetPaperId = dupInfo.existingId;
              actionTaken = 'replaced';

              // A. Update the existing past_papers record
              const { error: updateErr } = await supabase
                .from('past_papers')
                .update({
                  subject_code: paper.subject_code,
                  subject_name: paper.subject_name,
                  title: paper.title,
                  term: paper.term,
                  year: paper.year,
                  semester: paper.semester,
                  total_marks: paper.total_marks,
                  instructor_name: paper.instructor_name
                })
                .eq('id', targetPaperId);

              if (updateErr) {
                throw new Error(`Failed to update paper "${paper.title}": ${updateErr.message}`);
              }

              // B. Delete existing questions for this paper
              const { error: delErr } = await supabase
                .from('questions')
                .delete()
                .eq('paper_id', targetPaperId);

              if (delErr) {
                throw new Error(`Failed to clear old questions for paper "${paper.title}": ${delErr.message}`);
              }
            } else {
              // CASE 2: NEW PAPER -> INSERT IT
              const { data: newRow, error: insertErr } = await supabase
                .from('past_papers')
                .insert({
                  subject_code: paper.subject_code,
                  subject_name: paper.subject_name,
                  title: paper.title,
                  term: paper.term,
                  year: paper.year,
                  semester: paper.semester,
                  total_marks: paper.total_marks,
                  instructor_name: paper.instructor_name,
                  file_url: paper.file_url || null
                })
                .select('id')
                .single();

              if (insertErr) {
                if (insertErr.message?.includes('row-level security') || insertErr.code === '42501') {
                  throw new Error(
                    `Supabase Row Level Security (RLS) blocked INSERT on 'past_papers'. ` +
                    `Ensure your user has an admin policy or add an INSERT policy in Supabase Dashboard.`
                  );
                }
                throw new Error(`Failed to insert paper "${paper.title}": ${insertErr.message}`);
              }

              targetPaperId = newRow.id;
              actionTaken = 'created';
            }

            // C. Insert the new questions
            if (paper.questions.length > 0) {
              const formattedQuestions = paper.questions.map((q) => ({
                paper_id: targetPaperId,
                question_number: q.question_number,
                question_text: q.question_text,
                model_answer: q.model_answer || null,
                marks: q.marks,
                clo: q.clo
              }));

              const { error: qErr } = await supabase
                .from('questions')
                .insert(formattedQuestions);

              if (qErr) {
                throw new Error(`Paper record was saved, but question insertion failed: ${qErr.message}`);
              }
            }

            results.push({
              paperId: targetPaperId,
              paperTitle: paper.title,
              subjectCode: paper.subject_code,
              subjectName: paper.subject_name,
              term: paper.term,
              year: paper.year,
              action: actionTaken,
              questionCount: paper.questions.length
            });
          }

          // Clear cached papers so navigation immediately shows new data
          clearPapersCache();

          setUploadResults(results);
          const replacedCount = results.filter((r) => r.action === 'replaced').length;
          const createdCount = results.filter((r) => r.action === 'created').length;

          let msg = '';
          if (replacedCount > 0 && createdCount > 0) {
            msg = `Synced successfully: ${replacedCount} paper(s) replaced, ${createdCount} new paper(s) added!`;
          } else if (replacedCount > 0) {
            msg = `Successfully updated and replaced ${replacedCount} existing paper(s)!`;
          } else {
            msg = `Successfully uploaded ${createdCount} new paper(s) to Supabase!`;
          }

          toast.success(msg);
        } catch (err) {
          console.error('Supabase upload error:', err);
          setUploadError(err.message || 'An unexpected error occurred during database upload.');
          toast.error('Upload failed. See details below.');
        } finally {
          setIsUploading(false);
        }
      };

      const handleOpenPaper = (result) => {
        if (onSelectPaper && onNavigate) {
          onSelectPaper({
            id: result.paperId,
            title: result.paperTitle,
            subjectCode: result.subjectCode,
            subjectName: result.subjectName,
            term: result.term,
            year: result.year
          });
          onNavigate('paper-view');
        } else if (onNavigate) {
          onNavigate('subjects');
        }
      };

      const handleGoToSubject = (result) => {
        if (onSelectSubject && onNavigate) {
          onSelectSubject({
            code: result.subjectCode,
            name: result.subjectName
          });
        } else if (onNavigate) {
          onNavigate('subjects');
        }
      };

      const handleResetForm = () => {
        setRawText('');
        setParsedPapers([]);
        setUploadResults(null);
        setUploadError('');
        setErrorMsg('');
      };

      return (
        <div className="admin-paste-container">
          <PageHeader
            badge="Admin Workspace"
            title="AI Past Paper Ingestor"
            subtitle="Extract questions and model answers with AI, validate structure, and sync directly to Supabase. Existing papers are automatically replaced; new papers are added."
          />

            {/* Top AI Master Prompt Banner */}
            <div className="ai-prompt-helper-card">
              <div className="ai-prompt-helper-header">
                <div className="ai-prompt-helper-info">
                  <div className="ai-prompt-tag">
                    <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                    AI Paper Prompt (ChatGPT / Claude / Gemini)
                  </div>
                  <h3 className="ai-prompt-helper-title">Step 1: Get structured JSON from your AI</h3>
                  <p className="ai-prompt-helper-desc">
                    Copy this prompt, open ChatGPT or Claude, attach your exam paper images/PDF, and paste it.
                    The AI will read every question, write model answers, and return the exact JSON to paste here.
                  </p>
                </div>
                <div className="ai-prompt-helper-actions">
                  <button
                    type="button"
                    className={`btn-copy-prompt ${hasCopiedPrompt ? 'copied' : ''}`}
                    onClick={handleCopyPrompt}
                    title="Copy prompt for ChatGPT or Claude"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {hasCopiedPrompt ? 'check_circle' : 'content_copy'}
                    </span>
                    {hasCopiedPrompt ? 'Copied Prompt!' : 'Copy AI Master Prompt'}
                  </button>
                  <button
                    type="button"
                    className="btn-toggle-prompt"
                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {isPromptExpanded ? 'visibility_off' : 'visibility'}
                    </span>
                    {isPromptExpanded ? 'Hide Prompt' : 'View Prompt'}
                  </button>
                </div>
              </div>

              {isPromptExpanded && (
                <div className="ai-prompt-preview-wrap">
                  <div className="ai-prompt-preview-label">Prompt Instructions & Schema:</div>
                  <pre className="ai-prompt-code">{AI_MASTER_PROMPT}</pre>
                </div>
              )}
            </div>

            {/* Main Parser Form */}
            <div className="admin-paste-card">
              <div className="paste-card-header">
                <div>
                  <h2 className="paste-card-title">Step 2: Paste AI Output & Inspect</h2>
                  <p className="paste-card-subtitle">
                    Paste the AI-generated JSON below. Markdown backticks and commentary are safely stripped automatically.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-load-sample"
                  onClick={handleLoadSample}
                  title="Load sample CSC211 past paper JSON"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">bolt</span>
                  Load Sample JSON
                </button>
              </div>

              <textarea
                id="admin-raw-paper-textarea"
                className="admin-textarea"
                placeholder="Paste AI JSON output here... e.g. { 'subject_code': 'CSC211', 'questions': [...] }"
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                rows={12}
              />

              <div className="paste-actions-row">
                <button
                  type="button"
                  className="btn-parse"
                  onClick={handleParse}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">find_in_page</span>
                  Validate & Preview Paper
                </button>

                {rawText && (
                  <button
                    type="button"
                    className="btn-clear"
                    onClick={handleResetForm}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">delete_sweep</span>
                    Clear Input
                  </button>
                )}
              </div>

              {errorMsg && (
          <div className="admin-alert admin-alert-danger" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <div>
              <strong>Parsing Error:</strong> {errorMsg}
            </div>
          </div>
              )}
            </div>

                  {/* Upload Results Success Banner */}
                  {uploadResults && (
                    <div className="admin-success-card" role="status">
                      <div className="admin-success-icon">
                        <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                      </div>
                      <div className="admin-success-body">
                        <h3 className="admin-success-title">Database Sync Successful!</h3>
                        <p className="admin-success-desc">
                          Your past paper data has been safely synchronized with the Supabase database.
                        </p>

            <div className="admin-results-list">
                          {uploadResults.map((r, i) => (
                            <div key={i} className="admin-result-item">
                              <div className="result-badge-wrap">
                                <span className={`result-tag ${r.action === 'replaced' ? 'tag-replaced' : 'tag-created'}`}>
                                  <span className="material-symbols-outlined" aria-hidden="true">
                                    {r.action === 'replaced' ? 'sync' : 'add_circle'}
                                  </span>
                                  {r.action === 'replaced' ? 'Replaced Existing' : 'Added New'}
                                </span>
                                <span className="result-subject-tag">{r.subjectCode}</span>
                              </div>

                              <div className="result-title-line">
                                <strong>{r.paperTitle}</strong>
                                <span className="result-sub-info">
                                  ({r.questionCount} questions uploaded, ID: {r.paperId.slice(0, 8)}...)
                                </span>
                              </div>

                              <div className="result-actions">
                                <button
                                  type="button"
                                  className="btn-result-action primary"
                                  onClick={() => handleOpenPaper(r)}
                                >
                                  <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
                                  View Paper in App
                                </button>
                                <button
                                  type="button"
                                  className="btn-result-action secondary"
                                  onClick={() => handleGoToSubject(r)}
                                >
                                  <span className="material-symbols-outlined" aria-hidden="true">folder_open</span>
                                  Subject Papers
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="admin-success-footer">
                          <button
                            type="button"
                            className="btn-parse"
                            onClick={handleResetForm}
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">add</span>
                            Upload Another Paper
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload Error Banner */}
                  {uploadError && (
                    <div className="admin-alert admin-alert-danger" role="alert">
                      <span className="material-symbols-outlined" aria-hidden="true">dangerous</span>
                      <div>
                        <strong>Database Upload Failed:</strong> {uploadError}
                      </div>
                    </div>
                  )}

                  {/* Preview Section */}
                  {parsedPapers.length > 0 && !uploadResults && (
                    <div className="admin-preview-section">
                      <div className="preview-section-header">
                        <div>
                          <h2 className="preview-heading">
                            Step 3: Verify & Save to Supabase
                          </h2>
                          <p className="preview-subheading">
                            Review the parsed paper metadata and questions. If a paper already exists in Supabase,
                            it will be replaced; otherwise, it will be added as a new entry.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="btn-upload-supabase"
                          onClick={handleUploadToSupabase}
                          disabled={isUploading}
                        >
                        {isUploading ? (
                          <>
                            <span className="spinner-icon material-symbols-outlined" aria-hidden="true">progress_activity</span>
                            Syncing to Supabase...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span>
                            Save & Sync to Supabase
                          </>
                        )}
                      </button>
                    </div>

                {parsedPapers.map((paper) => {
                  const dup = duplicateMatches[paper.index];
                  const isReplaced = dup && dup.exists;

                  return (
                    <div key={paper.index} className="paper-preview-card">
                      {/* Paper Header / Meta */}
                      <div className="paper-meta-header">
                        <div className="paper-meta-primary">
                          <div className="paper-badges-row">
                            <span className="badge-subject">{paper.subject_code}</span>
                            <span className="badge-term">{paper.term} {paper.year}</span>
                            <span className="badge-marks">{paper.total_marks} Marks</span>

                            {/* Sync Mode Badge */}
                            {checkingDuplicates ? (
                              <span className="badge-checking">
                                <span className="spinner-icon material-symbols-outlined" aria-hidden="true">progress_activity</span>
                                Checking database...
                              </span>
                            ) : isReplaced ? (
                              <span className="badge-mode-replace" title={`Matches existing paper: ${dup.existingTitle}`}>
                                <span className="material-symbols-outlined" aria-hidden="true">sync</span>
                                Will REPLACE existing paper
                              </span>
                            ) : (
                              <span className="badge-mode-add">
                                <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
                                Will ADD as NEW paper
                              </span>
                            )}
                          </div>

                          <h3 className="paper-title-text">{paper.title}</h3>
                          <p className="paper-subtitle-text">
                            <strong>Course:</strong> {paper.subject_name} • <strong>Semester:</strong> {paper.semester} • <strong>Instructor:</strong> {paper.instructor_name}
                          </p>
                        </div>

                        <div className="paper-q-count-pill">
                          <span className="q-count-num">{paper.questions.length}</span>
                          <span className="q-count-lbl">Questions</span>
                        </div>
                      </div>

                      {isReplaced && dup?.existingTitle && (
                        <div className="replace-notice-banner">
                          <span className="material-symbols-outlined" aria-hidden="true">info</span>
                          <span>
                            <strong>Notice:</strong> A paper matching <em>{paper.subject_code} ({paper.term} {paper.year})</em> already exists in Supabase. Uploading will update its metadata and replace its questions with this new set.
                          </span>
                        </div>
                      )}

                      {/* Questions List */}
                      <div className="preview-questions-list">
                        {paper.questions.map((q, qIndex) => {
                          const ansKey = `${paper.index}-${q.question_number}`;
                          const isAnsOpen = expandedAnswers[ansKey] ?? true;

                          return (
                            <div key={qIndex} className="preview-question-card">
                              <div className="preview-q-top">
                                <div className="q-identity">
                                  <span className="q-number-pill">Q{q.question_number}</span>
                                  <span className="q-clo-pill">{q.clo}</span>
                                  <span className="q-marks-pill">{q.marks} Marks</span>
                                </div>
                                {q.model_answer && (
                                  <button
                                    type="button"
                                    className="btn-toggle-answer"
                                    onClick={() => toggleAnswer(ansKey)}
                                  >
                                    <span className="material-symbols-outlined" aria-hidden="true">
                                      {isAnsOpen ? 'expand_less' : 'expand_more'}
                                    </span>
                                    {isAnsOpen ? 'Hide Answer' : 'Show Answer'}
                                  </button>
                                )}
                              </div>

                              <div className="preview-q-text">
                                {q.question_text || <em>(No question text provided)</em>}
                              </div>

                              {q.model_answer && isAnsOpen && (
                                <div className="preview-q-answer">
                                  <div className="answer-header">
                                    <span className="material-symbols-outlined" aria-hidden="true">verified</span>
                                    Model Answer (COMSATS Marking Standard)
                                  </div>
                                  <div className="answer-body">
                                    {q.model_answer}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Upload Button */}
                      <div className="paper-bottom-action">
                        <button
                          type="button"
                          className="btn-upload-supabase"
                          onClick={handleUploadToSupabase}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <span className="spinner-icon material-symbols-outlined" aria-hidden="true">progress_activity</span>
                              Syncing to Supabase...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span>
                              {isReplaced ? 'Confirm & Replace Paper in Supabase' : 'Confirm & Add New Paper to Supabase'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      );
    }
