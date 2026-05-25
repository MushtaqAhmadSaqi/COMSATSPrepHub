import { supabase, auth } from '../../js/core.js';

/**
 * gpa-calculator.js — COMSATS PLUS GPA Calculator UI Controller
 *
 * DOM layer and overall aggregator logic with dynamic rows and live preview.
 */
(function initCalculatorUI() {
  'use strict';

  const Logic = window.GpaLogic;

  if (!Logic) {
    console.error('[GPA Calculator] GpaLogic not loaded.');
    return;
  }

  const addedSubjects = [];
  let nextSubjectId = 1;

  const form = document.getElementById('subject-form');
  const hasLabCb = document.getElementById('has-lab');
  const labSection = document.getElementById('lab-section');
  const subjectsList = document.getElementById('subjects-list');
  const emptyState = document.getElementById('empty-state');
  const calcGpaBtn = document.getElementById('calc-overall-btn');
  const overallResult = document.getElementById('overall-result');
  const overallGpaEl = document.getElementById('overall-gpa');
  const overallLblEl = document.getElementById('overall-label');
  const overallPerfEl = document.getElementById('overall-perf');
  const resetBtn = document.getElementById('reset-all-btn');
  const clearFormBtn = document.getElementById('clear-form-btn');
  const formErrors = document.getElementById('form-errors');
  const emptyStateCta = document.getElementById('empty-state-cta');
  const courseCreditHoursEl = document.getElementById('course-credit-hours');
  const labMarksSettings = document.getElementById('lab-marks-settings');

  const liveBadge = document.getElementById('live-preview-badge');
  const liveGpaEl = document.getElementById('live-gpa');

  const gradeInsight = document.getElementById('grade-insight');
  const gradeInsightCurrent = document.getElementById('grade-insight-current');
  const gradeInsightMessage = document.getElementById('grade-insight-message');
  const gradeProgressFill = document.getElementById('grade-progress-fill');

  const submitBtnIcon = document.getElementById('submit-btn-icon');
  const submitBtnText = document.getElementById('submit-btn-text');
  const clearBtnIcon = document.getElementById('clear-btn-icon');
  const clearBtnText = document.getElementById('clear-btn-text');
  const editModeBadge = document.getElementById('edit-mode-badge');
  const subjectNameInput = document.getElementById('subject-name');
  
  let editingSubjectId = null;

  const GPA_STORAGE_KEY = 'comsatsprephub:gpa-subjects:v1';

  function normalizeSubject(subject, fallbackIndex = 0) {
    const safeId = Number(subject?.id) || fallbackIndex + 1;

    // Load quizzes array
    let rawQuizzes = [];
    if (Array.isArray(subject?.raw?.quizzes)) {
      rawQuizzes = subject.raw.quizzes;
    } else if (subject?.raw?.q) {
      rawQuizzes = [{ obtained: Number(subject.raw.q.obt) || 0, total: Number(subject.raw.q.tot) || 10 }];
    } else {
      rawQuizzes = [{ obtained: 0, total: 10 }];
    }

    // Load assignments array
    let rawAssignments = [];
    if (Array.isArray(subject?.raw?.assignments)) {
      rawAssignments = subject.raw.assignments;
    } else if (subject?.raw?.a) {
      rawAssignments = [{ obtained: Number(subject.raw.a.obt) || 0, total: Number(subject.raw.a.tot) || 10 }];
    } else {
      rawAssignments = [{ obtained: 0, total: 10 }];
    }

    // Load lab assignments array
    let rawLabAssignments = [];
    if (Array.isArray(subject?.raw?.labAssignments)) {
      rawLabAssignments = subject.raw.labAssignments;
    } else if (subject?.raw?.l?.a) {
      rawLabAssignments = [{ obtained: Number(subject.raw.l.a.obt) || 0, total: Number(subject.raw.l.a.tot) || 10 }];
    } else {
      rawLabAssignments = [{ obtained: 0, total: 10 }];
    }

    // Theory Mid and Final
    const rawMid = {
      obtained: Number(subject?.raw?.mid?.obtained ?? subject?.raw?.m?.obtained ?? 0),
      total: Number(subject?.raw?.mid?.total ?? subject?.raw?.m?.total ?? 25)
    };
    const rawFinal = {
      obtained: Number(subject?.raw?.final?.obtained ?? subject?.raw?.f?.obtained ?? 0),
      total: Number(subject?.raw?.final?.total ?? subject?.raw?.f?.total ?? 50)
    };

    // Lab Mid and Final
    const rawLabMid = {
      obtained: Number(subject?.raw?.labMid?.obtained ?? subject?.raw?.l?.m?.obtained ?? 0),
      total: Number(subject?.raw?.labMid?.total ?? subject?.raw?.l?.m?.total ?? 25)
    };
    const rawLabFinal = {
      obtained: Number(subject?.raw?.labFinal?.obtained ?? subject?.raw?.l?.f?.obtained ?? 0),
      total: Number(subject?.raw?.labFinal?.total ?? subject?.raw?.l?.f?.total ?? 50)
    };

    return {
      id: safeId,
      name: String(subject?.name || 'Unnamed Subject'),
      creditHours: Number(subject?.creditHours) || 3,
      percentage: Number(subject?.percentage) || 0,
      gpa: Number(subject?.gpa) || 0,
      letter: String(subject?.letter || 'F'),
      hasLab: Boolean(subject?.hasLab),
      theoryTotal: Number(subject?.theoryTotal) || 0,
      labTotal: Number(subject?.labTotal) || 0,
      scheme: subject?.scheme || null,
      raw: {
        quizzes: rawQuizzes,
        assignments: rawAssignments,
        mid: rawMid,
        final: rawFinal,
        labAssignments: rawLabAssignments,
        labMid: rawLabMid,
        labFinal: rawLabFinal,
        // Keep deprecated format for compatibility
        q: {
          obt: rawQuizzes.reduce((acc, c) => acc + c.obtained, 0),
          tot: rawQuizzes.reduce((acc, c) => acc + c.total, 0),
        },
        a: {
          obt: rawAssignments.reduce((acc, c) => acc + c.obtained, 0),
          tot: rawAssignments.reduce((acc, c) => acc + c.total, 0),
        },
        m: rawMid,
        f: rawFinal,
        l: Boolean(subject?.hasLab) ? {
          a: {
            obt: rawLabAssignments.reduce((acc, c) => acc + c.obtained, 0),
            tot: rawLabAssignments.reduce((acc, c) => acc + c.total, 0),
          },
          m: rawLabMid,
          f: rawLabFinal
        } : null
      }
    };
  }

  function getNextSubjectIdFromSubjects(subjects) {
    if (!subjects.length) return 1;

    const maxId = subjects.reduce((max, subject) => {
      return Math.max(max, Number(subject.id) || 0);
    }, 0);

    return maxId + 1;
  }

  function buildGpaPayload() {
    return {
      subjects: addedSubjects.map((subject, index) => normalizeSubject(subject, index)),
      nextSubjectId: Number(nextSubjectId) || getNextSubjectIdFromSubjects(addedSubjects),
      savedAt: new Date().toISOString(),
    };
  }

  function saveGpaToBrowser() {
    try {
      localStorage.setItem(GPA_STORAGE_KEY, JSON.stringify(buildGpaPayload()));
    } catch (error) {
      console.warn('[GPA Persistence] Browser save failed:', error);
    }
  }

  function readGpaFromBrowser() {
    try {
      const saved = JSON.parse(localStorage.getItem(GPA_STORAGE_KEY));
      if (!saved || !Array.isArray(saved.subjects)) return null;

      return {
        subjects: saved.subjects.map(normalizeSubject),
        nextSubjectId:
          Number(saved.nextSubjectId) ||
          getNextSubjectIdFromSubjects(saved.subjects),
      };
    } catch (error) {
      console.warn('[GPA Persistence] Browser load failed:', error);
      return null;
    }
  }

  async function getSignedInUser() {
    try {
      const session = await auth.getSession();
      return session?.user || null;
    } catch (error) {
      console.warn('[GPA Persistence] Could not read auth session:', error);
      return null;
    }
  }

  async function saveGpaToCloud(userId) {
    if (!userId) return;

    const payload = buildGpaPayload();

    const { error } = await supabase
      .from('user_gpa_data')
      .upsert(
        {
          user_id: userId,
          subjects: payload.subjects,
          next_subject_id: payload.nextSubjectId,
          updated_at: payload.savedAt,
        },
        {
          onConflict: 'user_id',
        }
      );

    if (error) {
      console.warn('[GPA Persistence] Supabase save failed:', error);
    }
  }

  async function readGpaFromCloud(userId) {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('user_gpa_data')
      .select('subjects, next_subject_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[GPA Persistence] Supabase load failed:', error);
      return null;
    }

    if (!data || !Array.isArray(data.subjects)) return null;

    return {
      subjects: data.subjects.map(normalizeSubject),
      nextSubjectId:
        Number(data.next_subject_id) ||
        getNextSubjectIdFromSubjects(data.subjects),
    };
  }

  async function saveGpaData() {
    saveGpaToBrowser();

    const user = await getSignedInUser();
    if (!user) return;

    await saveGpaToCloud(user.id);
  }

  function renderSavedGpaSubjects(savedData) {
    if (!savedData || !Array.isArray(savedData.subjects)) return;

    addedSubjects.length = 0;

    document
      .querySelectorAll('[id^="subject-card-"]')
      .forEach(card => card.remove());

    const safeSubjects = savedData.subjects.map(normalizeSubject);

    addedSubjects.push(...safeSubjects);

    nextSubjectId =
      Number(savedData.nextSubjectId) ||
      getNextSubjectIdFromSubjects(safeSubjects);

    if (!addedSubjects.length) {
      emptyState.classList.remove('hidden');
      calcGpaBtn.classList.add('hidden');
      resetBtn.classList.add('hidden');
      overallResult.classList.add('hidden');
      return;
    }

    addedSubjects.forEach((subject, index) => {
      renderSubjectCard(subject, index + 1);
    });

    emptyState.classList.add('hidden');
    calcGpaBtn.classList.remove('hidden');
    resetBtn.classList.remove('hidden');
    overallResult.classList.add('hidden');
  }

  async function loadGpaData() {
    const browserData = readGpaFromBrowser();
    const user = await getSignedInUser();

    if (user) {
      const cloudData = await readGpaFromCloud(user.id);

      if (cloudData?.subjects?.length) {
        renderSavedGpaSubjects(cloudData);
        saveGpaToBrowser();
        return;
      }

      if (browserData?.subjects?.length) {
        renderSavedGpaSubjects(browserData);
        await saveGpaToCloud(user.id);
        return;
      }
    }

    if (browserData?.subjects?.length) {
      renderSavedGpaSubjects(browserData);
    }
  }

  function readMarkScheme() {
    return {
      theory: {
        assignmentWeight: readNumberInput('assignment-weight') || 10,
        quizWeight: readNumberInput('quiz-weight') || 15,
        midWeight: readNumberInput('theory-mid-weight') || 25,
        finalWeight: readNumberInput('theory-final-weight') || 50,
      },
      lab: {
        assignmentWeight: readNumberInput('lab-assignment-weight') || 25,
        midWeight: readNumberInput('lab-mid-weight') || 25,
        finalWeight: readNumberInput('lab-final-weight') || 50,
      },
    };
  }

  function syncLabMode() {
    const isChecked = hasLabCb.checked;
    hasLabCb.setAttribute('aria-checked', isChecked.toString());
    labSection.classList.toggle('hidden', !isChecked);
    if (labMarksSettings) labMarksSettings.classList.toggle('hidden', !isChecked);
    updateLivePreview();
  }

  // --- Dynamic Row Management ---

  function addDynamicRow(containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rowTypes = {
      assignment: {
        obtainedClass: 'assignment-obtained',
        totalClass: 'assignment-total',
        defaultTotal: '10',
        label: 'Assignment',
      },
      quiz: {
        obtainedClass: 'quiz-obtained',
        totalClass: 'quiz-total',
        defaultTotal: '10',
        label: 'Quiz',
      },
      lab: {
        obtainedClass: 'lab-obtained',
        totalClass: 'lab-total',
        defaultTotal: '10',
        label: 'Lab Item',
      },
    };

    const config = rowTypes[type] || rowTypes.assignment;

    const row = document.createElement('div');
    row.className = 'dynamic-row';

    row.innerHTML = `
      <div>
        <label class="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">
          Obtained
        </label>
        <input
          type="number"
          min="0"
          step="0.5"
          class="gpa-input ${config.obtainedClass}"
          placeholder="0"
          aria-label="${config.label} obtained marks"
        >
      </div>

      <div>
        <label class="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">
          Total
        </label>
        <input
          type="number"
          min="0.5"
          step="0.5"
          class="gpa-input ${config.totalClass}"
          value="${config.defaultTotal}"
          aria-label="${config.label} total marks"
        >
      </div>

      <button type="button" class="remove-row-btn" aria-label="Remove ${config.label}">
        <span class="material-symbols-outlined text-lg" aria-hidden="true">delete</span>
      </button>
    `;

    container.appendChild(row);

    row.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        validateInput(input);
        updateLivePreview();
      });
    });

    row.querySelector('.remove-row-btn').addEventListener('click', () => {
      const remainingRows = container.querySelectorAll('.dynamic-row').length;

      if (remainingRows <= 1) {
        row.querySelectorAll('input').forEach(input => {
          input.value = input.className.includes('total') ? config.defaultTotal : '';
        });
      } else {
        row.remove();
      }

      updateLivePreview();
    });
  }

  document.querySelectorAll('.add-row-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const containerId = btn.getAttribute('data-container');
      const type = btn.getAttribute('data-type');
      addDynamicRow(containerId, type);
    });
  });

  function setupRowListeners() {
    form.querySelectorAll('.dynamic-row').forEach(row => {
      row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
          validateInput(input);
          updateLivePreview();
        });
      });
      row.querySelector('.remove-row-btn')?.addEventListener('click', () => {
        row.remove();
        updateLivePreview();
      });
    });

    ['theory-mid', 'theory-final', 'lab-mid', 'lab-final'].forEach(prefix => {
      const obt = document.getElementById(`${prefix}-obtained`);
      const tot = document.getElementById(`${prefix}-total`);
      [obt, tot].forEach(el => {
        if (el) el.addEventListener('input', () => {
          validateInput(el);
          updateLivePreview();
        });
      });
    });

    [courseCreditHoursEl, ...document.querySelectorAll('#marks-settings input')].forEach(el => {
      if (el) el.addEventListener('input', updateLivePreview);
    });
  }

  function setFieldError(input, message) {
    if (!input) return;

    const wrapper = input.closest('div');
    if (!wrapper) return;

    const oldError = wrapper.querySelector('.field-error');
    if (oldError) oldError.remove();

    input.classList.remove('is-invalid', 'is-valid');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    input.setCustomValidity('');

    if (!message) {
      input.classList.add('is-valid');
      return;
    }

    const errorId = `${input.id || Math.random().toString(36).slice(2)}-error`;
    const error = document.createElement('span');
    error.className = 'field-error';
    error.id = errorId;
    error.textContent = message;

    wrapper.appendChild(error);

    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorId);
    input.setCustomValidity(message);
  }

  function validateInput(input) {
    const row = input.closest('.dynamic-row') || input.closest('.marks-grid-pair');
    if (!row) return true;

    const obtInput = row.querySelector('[class*="-obtained"], [id$="-obtained"]');
    const totInput = row.querySelector('[class*="-total"], [id$="-total"]');

    if (!obtInput || !totInput) return true;

    const obtained = parseFloat(obtInput.value);
    const total = parseFloat(totInput.value);

    setFieldError(obtInput, '');
    setFieldError(totInput, '');

    if (!Number.isFinite(total) || total <= 0) {
      setFieldError(totInput, 'Total marks must be greater than 0.');
      return false;
    }

    if (Number.isFinite(obtained) && obtained < 0) {
      setFieldError(obtInput, 'Obtained marks cannot be negative.');
      return false;
    }

    if (Number.isFinite(obtained) && obtained > total) {
      setFieldError(obtInput, 'Obtained marks cannot be greater than total marks.');
      return false;
    }

    if (Number.isFinite(obtained)) {
      const progress = Math.max(0, Math.min((obtained / total) * 100, 100));
      obtInput.style.setProperty('--progress', `${progress}%`);
    }

    return true;
  }

  function updateGradeInsight(finalPct, gradeInfo) {
    if (!gradeInsight || !gradeInsightCurrent || !gradeInsightMessage || !gradeProgressFill) return;

    const pct = Logic.clamp(Math.round(Logic.toNum(finalPct, 0)), 0, 100);
    const currentBand = Logic.GRADING_SCALE.find(item => pct >= item.percentMin && pct <= item.percentMax);

    if (!currentBand) {
      gradeInsight.classList.add('hidden');
      return;
    }

    const betterBand = [...Logic.GRADING_SCALE]
      .filter(item => item.percentMin > pct)
      .sort((a, b) => a.percentMin - b.percentMin)[0];

    gradeInsight.classList.remove('hidden');
    gradeInsightCurrent.textContent = `${gradeInfo.letter} • ${gradeInfo.point.toFixed(2)} GPA`;

    if (!betterBand) {
      gradeInsightMessage.textContent = `You are already in the highest grade range. Current percentage: ${pct}%.`;
      gradeProgressFill.style.width = '100%';
      return;
    }

    const marksNeeded = betterBand.percentMin - pct;
    gradeInsightMessage.textContent = `You need about ${marksNeeded}% more to reach ${betterBand.letter} grade. Current percentage: ${pct}%.`;

    const bandSize = Math.max(currentBand.percentMax - currentBand.percentMin + 1, 1);
    const progressInsideBand = ((pct - currentBand.percentMin + 1) / bandSize) * 100;

    gradeProgressFill.style.width = `${Math.max(5, Math.min(progressInsideBand, 100))}%`;
  }

  function updateLivePreview() {
    const data = gatherFormData();
    const scheme = readMarkScheme();
    const creditHours = Math.max(Logic.toNum(courseCreditHoursEl?.value, 3), 0.5);

    const theoryTotal = Logic.calcTheoryTotal(data.theory, scheme.theory);
    const labTotal = hasLabCb.checked ? Logic.calcLabTotal(data.lab, scheme.lab) : 0;
    const finalPct = Logic.calcFinalPercentage(theoryTotal, labTotal, hasLabCb.checked, creditHours, 1);
    const gradeInfo = Logic.getGradeInfo(finalPct);

    updateGradeInsight(finalPct, gradeInfo);

    if (liveGpaEl) {
      liveGpaEl.innerHTML = `
        <span class="text-xl font-black">${gradeInfo.point.toFixed(2)}</span>
        <span class="text-[10px] opacity-70 uppercase ml-1">GPA</span>
        <span class="mx-2 opacity-30">|</span>
        <span class="text-lg font-bold text-teal-600 dark:text-teal-400">${gradeInfo.letter}</span>
      `;
    }
    
    liveBadge.classList.add('visible');
    
    // Update badge color based on GPA standing
    const baseClasses = 'visible p-3 rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-sm border';
    if (gradeInfo.point >= 3.5) {
      liveBadge.className = `${baseClasses} bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800/50`;
    } else if (gradeInfo.point >= 2.0) {
      liveBadge.className = `${baseClasses} bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-800/50`;
    } else {
      liveBadge.className = `${baseClasses} bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-800/50`;
    }
  }

  function gatherFormData() {
    const readRows = (containerId, obtClass, totClass) => {
      const container = document.getElementById(containerId);
      if (!container) return [];
      return Array.from(container.querySelectorAll('.dynamic-row')).map(row => ({
        obtained: Logic.toNum(row.querySelector(`.${obtClass}`).value, 0),
        total: Logic.toNum(row.querySelector(`.${totClass}`).value, 1)
      }));
    };

    const readPair = (prefix) => ({
      obtained: readNumberInput(`${prefix}-obtained`),
      total: readNumberInput(`${prefix}-total`) || 1
    });

    return {
      theory: {
        assignments: readRows('theory-assignments-list', 'assignment-obtained', 'assignment-total'),
        quizzes: readRows('theory-quizzes-list', 'quiz-obtained', 'quiz-total'),
        mid: readPair('theory-mid'),
        final: readPair('theory-final')
      },
      lab: {
        labAssignments: readRows('lab-assignments-list', 'lab-obtained', 'lab-total'),
        labMid: readPair('lab-mid'),
        labFinal: readPair('lab-final')
      }
    };
  }

  // --- Core Handlers ---

  function handleAddSubject() {
    const subjectName = subjectNameInput?.value.trim() || 'Unnamed Subject';
    const hasLab = hasLabCb.checked;
    const creditHours = Math.max(Logic.toNum(courseCreditHoursEl?.value, 3), 0.5);
    
    const data = gatherFormData();
    const scheme = readMarkScheme();

    const theoryTotal = Logic.calcTheoryTotal(data.theory, scheme.theory);
    const labTotal = hasLab ? Logic.calcLabTotal(data.lab, scheme.lab) : 0;
    const finalPct = Logic.calcFinalPercentage(theoryTotal, labTotal, hasLab, creditHours, 1);
    const gradeInfo = Logic.getGradeInfo(finalPct);

    // Sum up categories for backward-compatibility storage
    const sum = (arr) => arr.reduce((acc, curr) => ({ obt: acc.obt + curr.obtained, tot: acc.tot + curr.total }), { obt: 0, tot: 0 });
    const tStats = {
      quizzes: data.theory.quizzes,
      assignments: data.theory.assignments,
      mid: data.theory.mid,
      final: data.theory.final,
      labAssignments: hasLab ? data.lab.labAssignments : [],
      labMid: hasLab ? data.lab.labMid : null,
      labFinal: hasLab ? data.lab.labFinal : null,
      q: sum(data.theory.quizzes),
      a: sum(data.theory.assignments),
      m: data.theory.mid,
      f: data.theory.final,
      l: hasLab ? {
        a: {
          obt: sum(data.lab.labAssignments).obt,
          tot: sum(data.lab.labAssignments).tot || 10
        },
        m: {
          obtained: data.lab.labMid.obtained,
          total: data.lab.labMid.total || 25
        },
        f: {
          obtained: data.lab.labFinal.obtained,
          total: data.lab.labFinal.total || 50
        }
      } : null
    };

    if (editingSubjectId) {
      // Update existing subject
      const subject = addedSubjects.find(s => s.id === editingSubjectId);
      if (subject) {
        subject.name = subjectName;
        subject.creditHours = creditHours;
        subject.percentage = finalPct;
        subject.gpa = gradeInfo.point;
        subject.letter = gradeInfo.letter;
        subject.hasLab = hasLab;
        subject.theoryTotal = theoryTotal;
        subject.labTotal = labTotal;
        subject.scheme = scheme;
        subject.raw = tStats;

        const card = document.getElementById(`subject-card-${subject.id}`);
        if (card) {
          card.querySelector('.subject-name-text').textContent = subject.name;
          card.querySelector('.subject-info-text').innerHTML = `
            <span>Credits: <strong class="text-slate-700 dark:text-slate-200">${subject.creditHours.toFixed(1)}</strong></span>
            <span>Theory: <strong class="text-slate-700 dark:text-slate-200">${subject.theoryTotal.toFixed(1)}%</strong></span>
            ${subject.hasLab ? `<span>Lab: <strong class="text-slate-700 dark:text-slate-200">${subject.labTotal.toFixed(1)}%</strong></span>` : ''}
            <span class="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-4 ml-1">
              <span class="text-slate-400 uppercase font-black text-[9px] tracking-widest">Aggregate</span> 
              <strong class="text-teal-600 dark:text-teal-400 font-bold">${subject.percentage.toFixed(2)}%</strong>
            </span>
          `;
          const gradeBadge = card.querySelector('.grade-badge');
          gradeBadge.textContent = subject.letter;
          gradeBadge.className = `grade-badge inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-black ${getGradeBadgeColor(subject.letter)}`;
          card.querySelector('.gpa-text').textContent = subject.gpa.toFixed(2);
          card.querySelector('.gpa-text').className = `gpa-text text-lg font-black ${getGpaTextColor(subject.gpa)}`;
        }
      }
      exitEditMode();
      void saveGpaData();
      
      if (!overallResult.classList.contains('hidden')) {
        calcGpaBtn.click();
      } else {
        calcGpaBtn.classList.add('is-pulsing');
      }
      return;
    }

    const newSubject = {
      id: nextSubjectId++,
      name: subjectName,
      creditHours,
      percentage: finalPct,
      gpa: gradeInfo.point,
      letter: gradeInfo.letter,
      hasLab,
      theoryTotal,
      labTotal,
      scheme,
      raw: tStats // Store for editing
    };

    addedSubjects.push(newSubject);
    renderSubjectCard(newSubject, addedSubjects.length);
    resetFormKeepName();

    calcGpaBtn.classList.remove('hidden', 'is-pulsing');
    void calcGpaBtn.offsetWidth; 
    calcGpaBtn.classList.add('is-pulsing');
    
    resetBtn.classList.remove('hidden');
    overallResult.classList.add('hidden');
    liveBadge.classList.remove('visible');
    void saveGpaData();
  }

  function loadSubjectIntoForm(subject) {
    editingSubjectId = subject.id;
    
    // UI state
    document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('is-editing'));
    const card = document.getElementById(`subject-card-${subject.id}`);
    if (card) card.classList.add('is-editing');
    
    form.closest('.glass-card').classList.add('edit-active');
    editModeBadge.classList.remove('hidden');
    editModeBadge.classList.add('flex');
    submitBtnIcon.textContent = 'save';
    submitBtnText.textContent = 'Save Subject Changes';
    clearBtnIcon.textContent = 'close';
    clearBtnText.textContent = 'Cancel Edit';
    
    // Populate simple inputs
    subjectNameInput.value = subject.name;
    courseCreditHoursEl.value = subject.creditHours;
    hasLabCb.checked = subject.hasLab;
    syncLabMode();
    
    // Populate scheme
    if (subject.scheme) {
      document.getElementById('quiz-weight').value = subject.scheme.theory.quizWeight;
      document.getElementById('assignment-weight').value = subject.scheme.theory.assignmentWeight;
      document.getElementById('theory-mid-weight').value = subject.scheme.theory.midWeight;
      document.getElementById('theory-final-weight').value = subject.scheme.theory.finalWeight;
      if (subject.hasLab) {
        document.getElementById('lab-assignment-weight').value = subject.scheme.lab.assignmentWeight;
        document.getElementById('lab-mid-weight').value = subject.scheme.lab.midWeight;
        document.getElementById('lab-final-weight').value = subject.scheme.lab.finalWeight;
      }
    }
    
    // Populate arrays
    const fillRows = (containerId, type, items) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      if (!items || items.length === 0) {
        addDynamicRow(containerId, type);
      } else {
        items.forEach((item) => {
          addDynamicRow(containerId, type);
          const rows = container.querySelectorAll('.dynamic-row');
          const lastRow = rows[rows.length - 1];
          if (lastRow) {
            const inputs = lastRow.querySelectorAll('input');
            if (inputs[0]) { inputs[0].value = item.obtained; validateInput(inputs[0]); }
            if (inputs[1]) { inputs[1].value = item.total; validateInput(inputs[1]); }
          }
        });
      }
    };
    
    fillRows('theory-quizzes-list', 'quiz', subject.raw.quizzes);
    fillRows('theory-assignments-list', 'assignment', subject.raw.assignments);
    if (subject.hasLab) {
      fillRows('lab-assignments-list', 'lab', subject.raw.labAssignments);
    }
    
    // Populate Mid/Final
    const setPair = (prefix, data) => {
      const obt = document.getElementById(`${prefix}-obtained`);
      const tot = document.getElementById(`${prefix}-total`);
      if (obt && tot && data) {
        obt.value = data.obtained;
        tot.value = data.total;
        validateInput(obt);
        validateInput(tot);
      }
    };
    
    setPair('theory-mid', subject.raw.mid);
    setPair('theory-final', subject.raw.final);
    if (subject.hasLab) {
      setPair('lab-mid', subject.raw.labMid);
      setPair('lab-final', subject.raw.labFinal);
    }
    
    updateLivePreview();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    subjectNameInput.focus();
  }

  function exitEditMode() {
    editingSubjectId = null;
    document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('is-editing'));
    form.closest('.glass-card').classList.remove('edit-active');
    editModeBadge.classList.add('hidden');
    editModeBadge.classList.remove('flex');
    submitBtnIcon.textContent = 'add_circle';
    submitBtnText.textContent = 'Calculate & Add Subject';
    clearBtnIcon.textContent = 'clear_all';
    clearBtnText.textContent = 'Clear';
    resetFormCompletely();
  }



  function renderSubjectCard(subject, orderIndex) {
    emptyState.classList.add('hidden');
    const card = document.createElement('li');
    card.id = `subject-card-${subject.id}`;
    const delayClass = `slide-delay-${Math.min(orderIndex, 5)}`;
    const badgeColor = getGradeBadgeColor(subject.letter);

    card.className = `subject-card cursor-pointer flex items-start justify-between gap-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm animate-slide-in ${delayClass} group/card hover:-translate-y-0.5 hover:shadow-md hover:border-teal-200 dark:hover:border-teal-800 transition-all`;
    const gpaColorClass = getGpaTextColor(subject.gpa);

    card.innerHTML = `
      <div class="flex-1 min-w-0 pr-4 pointer-events-none">
        <div class="flex items-center gap-2 mb-2">
          <p class="subject-name-text font-extrabold text-slate-800 dark:text-slate-100 truncate text-base" title="${escHtml(subject.name)}">
            ${escHtml(subject.name)}
          </p>
        </div>
        <div class="subject-info-text flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span class="flex items-center gap-1.5">
            <span class="text-slate-400 uppercase font-black text-[9px] tracking-widest">Credits</span> 
            <strong class="text-slate-700 dark:text-slate-200">${subject.creditHours.toFixed(1)}</strong>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="text-slate-400 uppercase font-black text-[9px] tracking-widest">Theory</span> 
            <strong class="text-slate-700 dark:text-slate-200">${subject.theoryTotal.toFixed(1)}%</strong>
          </span>
          ${subject.hasLab ? `
          <span class="flex items-center gap-1.5">
            <span class="text-slate-400 uppercase font-black text-[9px] tracking-widest">Lab</span> 
            <strong class="text-slate-700 dark:text-slate-200">${subject.labTotal.toFixed(1)}%</strong>
          </span>` : ''}
          <span class="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-4 ml-1">
            <span class="text-slate-400 uppercase font-black text-[9px] tracking-widest">Aggregate</span> 
            <strong class="text-teal-600 dark:text-teal-400 font-bold">${subject.percentage.toFixed(2)}%</strong>
          </span>
        </div>
      </div>
      
      <div class="flex flex-col items-end gap-1.5 shrink-0 pointer-events-none pr-8">
        <div class="flex items-center gap-2">
          <span class="gpa-text text-lg font-black ${gpaColorClass}">
            ${subject.gpa.toFixed(2)}
          </span>
          <span class="grade-badge inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-black ${badgeColor}">
            ${escHtml(subject.letter)}
          </span>
        </div>
        <span class="text-[10px] font-bold uppercase tracking-tighter text-slate-400 dark:text-slate-500">Subject GPA</span>
      </div>

      <button type="button" class="delete-btn shadow-sm dark:border-rose-900/50" data-id="${subject.id}" aria-label="Delete ${escHtml(subject.name)}">
        <span class="material-symbols-outlined !text-[16px] font-bold">close</span>
      </button>
    `;

    subjectsList.appendChild(card);
    
    // Card click loads the subject into the left-side entry form for editing
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.delete-btn')) {
        loadSubjectIntoForm(subject);
      }
    });

    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation(); // prevent modal from opening
      handleDeleteSubject(subject.id);
    });
  }

  function handleDeleteSubject(id) {
    if (editingSubjectId === id) {
      exitEditMode();
    }
    const index = addedSubjects.findIndex(s => s.id === id);
    if (index === -1) return;
    addedSubjects.splice(index, 1);
    void saveGpaData();
    const card = document.getElementById(`subject-card-${id}`);
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        card.remove();
        if (addedSubjects.length === 0) {
          emptyState.classList.remove('hidden');
          calcGpaBtn.classList.add('hidden');
          resetBtn.classList.add('hidden');
          overallResult.classList.add('hidden');
        }
      }, 200);
    }
  }

  function getGradeBadgeColor(letter) {
    const map = {
      'A': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      'A-': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
      'B+': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
      'B': 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
      'B-': 'bg-sky-50/50 text-sky-500 dark:bg-sky-900/10 dark:text-sky-400',
      'C+': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
      'C': 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
      'C-': 'bg-amber-50/50 text-amber-500 dark:bg-amber-900/10 dark:text-amber-400',
      'D+': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
      'D': 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
      'F': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
    };
    return map[letter] || 'bg-slate-100 text-slate-700';
  }

  function getGpaTextColor(gpa) {
    if (gpa === 0) return 'text-rose-600 dark:text-rose-400';
    if (gpa < 2.0) return 'text-orange-500 dark:text-orange-400';
    return 'text-emerald-600 dark:text-emerald-400';
  }

  calcGpaBtn.addEventListener('click', () => {
    if (!addedSubjects.length) return;
    const avg = Logic.calcOverallGpa(addedSubjects);
    const weightedPercentage = Logic.calcOverallPercentage(addedSubjects);
    const totalCredits = Logic.calcTotalCredits(addedSubjects);
    const honorPoints = Logic.calcHonorPoints(addedSubjects);

    overallGpaEl.textContent = avg.toFixed(2);
    overallLblEl.textContent = Logic.getGradeInfo(weightedPercentage).letter;
    overallPerfEl.textContent = `${Logic.getPerformanceLabel(avg)} Total Credits: ${totalCredits.toFixed(1)} | Honor Points: ${honorPoints.toFixed(2)}`;

    overallResult.classList.remove('hidden');
    calcGpaBtn.classList.remove('is-pulsing');
    overallResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  resetBtn.addEventListener('click', () => {
    if (!window.confirm('Clear all added subjects and start over?')) return;
    addedSubjects.length = 0;
    Array.from(subjectsList.children).forEach(child => {
      if (child.id !== 'empty-state') child.remove();
    });
    emptyState.classList.remove('hidden');
    overallResult.classList.add('hidden');
    calcGpaBtn.classList.add('hidden');
    resetBtn.classList.add('hidden');
    resetFormCompletely();
    void saveGpaData();
  });

  function resetFormKeepName() {
    const subjectNameInput = document.getElementById('subject-name');
    const name = subjectNameInput?.value || '';
    form.reset();
    if (subjectNameInput) subjectNameInput.value = name;
    
    // Clear dynamic lists
    document.getElementById('theory-assignments-list').innerHTML = '';
    addDynamicRow('theory-assignments-list', 'assignment');
    document.getElementById('theory-quizzes-list').innerHTML = '';
    addDynamicRow('theory-quizzes-list', 'quiz');
    const labContainer = document.getElementById('lab-assignments-list');
    if (labContainer) {
      labContainer.innerHTML = '';
      addDynamicRow('lab-assignments-list', 'lab');
    }

    hasLabCb.checked = false;
    syncLabMode();
    formErrors.classList.add('hidden');
    clearValidationStates();
    liveBadge.classList.remove('visible');
  }

  function resetFormCompletely() {
    form.reset();
    document.getElementById('theory-assignments-list').innerHTML = '';
    addDynamicRow('theory-assignments-list', 'assignment');
    document.getElementById('theory-quizzes-list').innerHTML = '';
    addDynamicRow('theory-quizzes-list', 'quiz');
    const labContainer = document.getElementById('lab-assignments-list');
    if (labContainer) {
      labContainer.innerHTML = '';
      addDynamicRow('lab-assignments-list', 'lab');
    }

    hasLabCb.checked = false;
    syncLabMode();
    formErrors.classList.add('hidden');
    clearValidationStates();
    liveBadge.classList.remove('visible');
    document.getElementById('subject-name')?.focus();
  }

  function clearValidationStates() {
    form.querySelectorAll('input[type="number"]').forEach(input => {
      input.classList.remove('is-valid', 'is-invalid');
      input.style.setProperty('--progress', '0%');
    });
    document.querySelectorAll('.field-error').forEach(el => el.remove());
  }

  // --- Logic Helpers ---

  function readNumberInput(id) {
    const el = document.getElementById(id);
    return el ? Logic.toNum(el.value, 0) : 0;
  }

  function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    formErrors.classList.add('hidden');
    const errors = validateForm();
    if (errors.length > 0) {
      formErrors.innerHTML = `<strong>Fix errors:</strong><ul class="list-disc pl-5 mt-1">` + errors.map(e => `<li>${escHtml(e)}</li>`).join('') + `</ul>`;
      formErrors.classList.remove('hidden');
      return;
    }
    handleAddSubject();
  });

  function validateForm() {
    const errors = [];

    form.querySelectorAll('input[type="number"]').forEach(input => {
      if (input.closest('.hidden')) return;

      const isValid = validateInput(input);

      if (!isValid) {
        errors.push('Some marks are invalid. Check fields highlighted in red.');
      }
    });

    const creditHours = Logic.toNum(courseCreditHoursEl?.value, 3);

    if (creditHours < 0.5 || creditHours > 6) {
      errors.push('Credit hours must be between 0.5 and 6.');
    }

    const theoryWeightTotal =
      readNumberInput('assignment-weight') +
      readNumberInput('quiz-weight') +
      readNumberInput('theory-mid-weight') +
      readNumberInput('theory-final-weight');

    if (theoryWeightTotal <= 0) {
      errors.push('Theory weight total must be greater than 0.');
    }

    if (hasLabCb.checked) {
      const labWeightTotal =
        readNumberInput('lab-assignment-weight') +
        readNumberInput('lab-mid-weight') +
        readNumberInput('lab-final-weight');

      if (labWeightTotal <= 0) {
        errors.push('Lab weight total must be greater than 0.');
      }
    }

    return [...new Set(errors)];
  }

  hasLabCb.addEventListener('change', syncLabMode);
  clearFormBtn.addEventListener('click', () => {
    if (editingSubjectId) {
      exitEditMode();
    } else {
      resetFormCompletely();
    }
  });
  setupRowListeners();

  // ── AI Screenshot OCR Scanner Integration ──
  const ocrUploadZone = document.getElementById('ocr-upload-zone');
  const ocrFileInput = document.getElementById('ocr-file-input');
  const ocrScanningState = document.getElementById('ocr-scanning-state');
  const ocrIdleState = ocrUploadZone?.querySelector('.ocr-idle');

  if (ocrUploadZone && ocrFileInput) {
    ocrUploadZone.addEventListener('click', () => {
      ocrFileInput.click();
    });

    ocrUploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      ocrUploadZone.classList.add('drag-active');
    });

    ocrUploadZone.addEventListener('dragleave', () => {
      ocrUploadZone.classList.remove('drag-active');
    });

    ocrUploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      ocrUploadZone.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        handleOcrFile(e.dataTransfer.files[0]);
      }
    });

    ocrFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        handleOcrFile(e.target.files[0]);
      }
    });
  }

  async function handleOcrFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (screenshot).');
      return;
    }

    // Show Loading/Scanning state
    if (ocrIdleState) ocrIdleState.classList.add('hidden');
    if (ocrScanningState) ocrScanningState.classList.remove('hidden');

    try {
      const base64 = await fileToBase64(file);

      // Secure Bearer Token Authentication check:
      // The serverless API endpoint requires a bearer token to verify user and prevent abuse.
      const session = await auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Please sign in to your ComsatsPrepHub account to use the AI Screenshot Scanner.');
      }

      const response = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageBase64: base64 })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to parse screenshot.');
      }

      // Autofill the form dynamically!
      autofillGpaFormFromOcr(data);

    } catch (error) {
      console.warn('[AI Scanner] Parse failed:', error);
      alert(error.message || 'AI screenshot scanning failed. Please ensure your image is clear and you are logged in.');
    } finally {
      if (ocrIdleState) ocrIdleState.classList.remove('hidden');
      if (ocrScanningState) ocrScanningState.classList.add('hidden');
      if (ocrFileInput) ocrFileInput.value = ''; // Reset file input
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  function autofillGpaFormFromOcr(data) {
    if (!data) return;

    // 1. Subject details
    const nameInp = document.getElementById('subject-name');
    if (nameInp && data.subjectName) {
      nameInp.value = data.subjectName;
    }

    if (courseCreditHoursEl && data.creditHours) {
      courseCreditHoursEl.value = Math.max(0.5, Math.min(data.creditHours, 6));
    }

    // 2. Clear dynamic Quiz list and repopulate
    const quizzesContainer = document.getElementById('theory-quizzes-list');
    if (quizzesContainer && data.theory && Array.isArray(data.theory.quizzes)) {
      quizzesContainer.innerHTML = '';
      
      if (data.theory.quizzes.length === 0) {
        // Fallback row if no quizzes parsed
        addDynamicRow('theory-quizzes-list', 'quiz');
      } else {
        data.theory.quizzes.forEach((quiz, index) => {
          // Add a new row
          addDynamicRow('theory-quizzes-list', 'quiz');
          const rows = quizzesContainer.querySelectorAll('.dynamic-row');
          const lastRow = rows[rows.length - 1];
          if (lastRow) {
            const obt = lastRow.querySelector('.quiz-obtained');
            const tot = lastRow.querySelector('.quiz-total');
            if (obt && tot) {
              obt.value = quiz.obtained ?? '';
              tot.value = quiz.total ?? 10;
              validateInput(obt);
            }
          }
        });
      }
    }

    // 3. Clear dynamic Assignment list and repopulate
    const assignmentsContainer = document.getElementById('theory-assignments-list');
    if (assignmentsContainer && data.theory && Array.isArray(data.theory.assignments)) {
      assignmentsContainer.innerHTML = '';
      
      if (data.theory.assignments.length === 0) {
        // Fallback row if no assignments parsed
        addDynamicRow('theory-assignments-list', 'assignment');
      } else {
        data.theory.assignments.forEach((assignment, index) => {
          // Add a new row
          addDynamicRow('theory-assignments-list', 'assignment');
          const rows = assignmentsContainer.querySelectorAll('.dynamic-row');
          const lastRow = rows[rows.length - 1];
          if (lastRow) {
            const obt = lastRow.querySelector('.assignment-obtained');
            const tot = lastRow.querySelector('.assignment-total');
            if (obt && tot) {
              obt.value = assignment.obtained ?? '';
              tot.value = assignment.total ?? 10;
              validateInput(obt);
            }
          }
        });
      }
    }

    // 4. Populates Midterm obtained/total
    if (data.theory && data.theory.mid) {
      const midObt = document.getElementById('theory-mid-obtained');
      const midTot = document.getElementById('theory-mid-total');
      if (midObt && midTot) {
        midObt.value = data.theory.mid.obtained ?? '';
        midTot.value = data.theory.mid.total ?? 25;
        validateInput(midObt);
      }
    }

    // 5. Populates Final exam obtained/total
    if (data.theory && data.theory.final) {
      const finalObt = document.getElementById('theory-final-obtained');
      const finalTot = document.getElementById('theory-final-total');
      if (finalObt && finalTot) {
        finalObt.value = data.theory.final.obtained ?? '';
        finalTot.value = data.theory.final.total ?? 50;
        validateInput(finalObt);
      }
    }

    // Clear main form validation alerts
    if (formErrors) formErrors.classList.add('hidden');

    // Trigger preview and analytics recalculation
    updateLivePreview();
  }

  document.addEventListener('keydown', event => {
    if (editingSubjectId && event.key === 'Escape') {
      exitEditMode();
    }
  });

  setTimeout(syncLabMode, 0);
  void loadGpaData();

})();
