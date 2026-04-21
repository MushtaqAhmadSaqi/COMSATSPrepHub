import { supabase, auth, escapeHtml } from './core.js';

let learningChart = null;
let lastChartPayload = { labels: [], data: [] };

const dashboardEls = {
  currentDate: () => document.getElementById('currentDate'),
  weakTopicsList: () => document.getElementById('weakTopicsList'),
  recentActivityList: () => document.getElementById('recentActivityList'),
  subjectMasteryList: () => document.getElementById('subjectMasteryList'),
  learningChart: () => document.getElementById('learningChart'),
  learningChartEmpty: () => document.getElementById('learningChartEmpty')
};

document.addEventListener('DOMContentLoaded', async () => {
  initDashboardDate();
  bindThemeRefresh();
  await initDashboard();
});

function bindThemeRefresh() {
  document.addEventListener('comsatsprephub:themechange', () => {
    const { labels, data } = lastChartPayload;
    renderLearningChart(labels, data).catch(error => {
      console.error('Dashboard chart refresh failed:', error);
    });
  });
}

function initDashboardDate() {
  const dateEl = dashboardEls.currentDate();
  if (!dateEl) return;

  dateEl.textContent = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());
}

async function initDashboard() {
  try {
    const session = await auth.getSession();
    const user = session?.user;

    if (!user) {
      setGuestFallback();
      return;
    }

    const firstName = auth.getUserName(user);
    const fullName = user?.user_metadata?.full_name || firstName;

    setText('userFirstName', firstName);
    setText(
      'welcomeSubtext',
      `Great to have you back, ${fullName}. Your dashboard now reflects quiz results, studied subjects, and recent paper activity in one place.`
    );

    await loadDashboardData(user.id);
  } catch (error) {
    console.error('Dashboard init failed:', error);
    setGuestFallback();
  }
}

function setGuestFallback() {
  setText('userFirstName', 'Student');
  setText(
    'welcomeSubtext',
    'Track quiz scores, studied subjects, and mastery trends in one clean dashboard after you sign in.'
  );

  renderDashboardStats({
    quizCount: 0,
    averageScore: 0,
    subjectsStudied: 0,
    studySessions: 0
  });

  renderWeakTopics([]);
  renderRecentActivity([]);
  renderSubjectMastery([]);
  renderLearningChart([], []);
}

async function loadDashboardData(userId) {
  const [quizAttemptsResult, subjectProgressResult, subjectsCatalogResult] = await Promise.allSettled([
    supabase
      .from('user_quiz_attempts')
      .select('quiz_id, quiz_title, subject_code, score_percent, correct_answers, total_questions, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false }),

    supabase
      .from('user_subject_progress')
      .select('subject_code, subject_name, topic_name, mastery_percent, sessions_count, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),

    supabase.from('past_papers').select('subject_code, subject_name')
  ]);

  const quizAttempts = getSettledRows(quizAttemptsResult);
  const subjectProgress = getSettledRows(subjectProgressResult);
  const subjectsCatalog = getSettledRows(subjectsCatalogResult);

  logSettledError('Quiz attempts load error', quizAttemptsResult);
  logSettledError('Subject progress load error', subjectProgressResult);
  logSettledError('Subject catalog load error', subjectsCatalogResult);

  const subjectNameMap = buildSubjectNameMap(subjectsCatalog, subjectProgress);
  const stats = buildDashboardStats({ quizAttempts, subjectProgress, subjectNameMap });

  renderDashboardStats(stats);
  renderWeakTopics(stats.weakTopics);
  renderRecentActivity(stats.recentActivity);
  renderSubjectMastery(stats.subjectMastery);
  renderLearningChart(stats.chartLabels, stats.chartScores);
}

function getSettledRows(result) {
  return result.status === 'fulfilled' && !result.value.error ? result.value.data || [] : [];
}

function logSettledError(label, result) {
  if (result.status === 'fulfilled' && result.value.error) {
    console.error(`${label}:`, result.value.error);
  }
}

function buildSubjectNameMap(subjectsCatalog, subjectProgress) {
  const map = new Map();

  [...subjectsCatalog, ...subjectProgress].forEach(item => {
    const code = String(item?.subject_code || '').trim();
    const name = String(item?.subject_name || '').trim();

    if (code && name && !map.has(code)) {
      map.set(code, name);
    }
  });

  return map;
}

function resolveSubjectLabel(subjectCode, subjectNameMap, fallbackName = '') {
  const code = String(subjectCode || '').trim();
  const label = String(fallbackName || '').trim() || subjectNameMap.get(code) || code || 'Untitled Subject';
  return { code, label };
}

function buildDashboardStats({ quizAttempts, subjectProgress, subjectNameMap }) {
  const quizCount = quizAttempts.length;

  const averageScore = quizCount
    ? Math.round(quizAttempts.reduce((sum, item) => sum + Number(item.score_percent || 0), 0) / quizCount)
    : 0;

  const normalizedSubjectProgress = subjectProgress.map(item => {
    const subject = resolveSubjectLabel(item.subject_code, subjectNameMap, item.subject_name);

    return {
      ...item,
      subject_code: subject.code,
      subject_name: subject.label,
      mastery_percent: Number(item.mastery_percent || 0),
      sessions_count: Number(item.sessions_count || 0)
    };
  });

  const rootSubjectRows = normalizedSubjectProgress.filter(item => !item.topic_name);
  const studyRowsForActivity = rootSubjectRows.filter(
    item => item.sessions_count > 0 || item.mastery_percent > 0
  );

  const subjectsStudied = new Set(
    normalizedSubjectProgress.map(item => item.subject_code || item.subject_name).filter(Boolean)
  ).size;

  const studySessions = rootSubjectRows.reduce((sum, item) => sum + item.sessions_count, 0);

  const weakTopics = normalizedSubjectProgress
    .filter(item => item.mastery_percent > 0 && item.mastery_percent < 65)
    .sort((a, b) => a.mastery_percent - b.mastery_percent)
    .slice(0, 5)
    .map(item => ({
      name: item.topic_name || item.subject_name,
      score: item.mastery_percent,
      subject: item.subject_code || item.subject_name
    }));

  const recentQuizActivity = quizAttempts.slice(0, 4).map(item => {
    const subject = resolveSubjectLabel(item.subject_code, subjectNameMap);
    const score = Number(item.score_percent || 0);

    return {
      type: 'quiz',
      title: item.quiz_title || `${subject.label} quiz`,
      meta: `${subject.code || subject.label} • ${score}% score`,
      date: item.completed_at
    };
  });

  const recentStudyActivity = studyRowsForActivity.slice(0, 4).map(item => ({
    type: 'study',
    title: `Studied ${item.subject_name}`,
    meta: `${item.sessions_count} session${item.sessions_count === 1 ? '' : 's'} • ${item.mastery_percent}% mastery`,
    date: item.updated_at
  }));

  const recentActivity = [...recentQuizActivity, ...recentStudyActivity]
    .filter(item => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const masteryMap = new Map();

  normalizedSubjectProgress.forEach(item => {
    const key = item.subject_code || item.subject_name;
    if (!key) return;

    if (!masteryMap.has(key)) {
      masteryMap.set(key, {
        name: item.subject_name,
        code: item.subject_code,
        total: 0,
        count: 0,
        sessions: 0
      });
    }

    const existing = masteryMap.get(key);
    existing.total += item.mastery_percent;
    existing.count += 1;
    existing.sessions = Math.max(existing.sessions, item.sessions_count);
  });

  const subjectMastery = [...masteryMap.values()]
    .map(item => ({
      name: item.name,
      code: item.code,
      mastery: Math.round(item.total / item.count),
      sessions: item.sessions
    }))
    .sort((a, b) => (b.mastery !== a.mastery ? b.mastery - a.mastery : b.sessions - a.sessions))
    .slice(0, 6);

  const chartItems = quizAttempts.slice(0, 8).reverse();
  const chartLabels = chartItems.map((item, index) => item.quiz_title || `Quiz ${index + 1}`);
  const chartScores = chartItems.map(item => Number(item.score_percent || 0));

  return {
    quizCount,
    averageScore,
    subjectsStudied,
    studySessions,
    weakTopics,
    recentActivity,
    subjectMastery,
    chartLabels,
    chartScores
  };
}

function renderDashboardStats(stats) {
  setText('statQuizCount', stats.quizCount);
  setText('statAverageScore', `${stats.averageScore}%`);
  setText('statSubjectsStudied', stats.subjectsStudied);
  setText('statStudySessions', stats.studySessions);
}

function renderWeakTopics(items) {
  const el = dashboardEls.weakTopicsList();
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 px-4 py-5 bg-slate-50/70 dark:bg-slate-800/30">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          No weak topics yet. Keep studying and completing quizzes to surface low-confidence areas.
        </p>
      </div>
    `;
    return;
  }

  el.innerHTML = items
    .map(
      item => `
        <div class="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40">
          <div class="min-w-0">
            <p class="font-semibold text-slate-900 dark:text-white truncate">${escapeHtml(item.name)}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 truncate">${escapeHtml(item.subject)}</p>
          </div>
          <span class="ml-4 shrink-0 inline-flex items-center rounded-full bg-red-50 dark:bg-red-500/10 px-2.5 py-1 text-sm font-bold text-red-600 dark:text-red-400">${item.score}%</span>
        </div>
      `
    )
    .join('');
}

function renderRecentActivity(items) {
  const el = dashboardEls.recentActivityList();
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 px-4 py-5 bg-slate-50/70 dark:bg-slate-800/30">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          No activity recorded yet. Your latest study sessions and quiz attempts will appear here.
        </p>
      </div>
    `;
    return;
  }

  el.innerHTML = items
    .map(
      item => `
        <div class="rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-slate-900 dark:text-white min-w-0 truncate">${escapeHtml(item.title)}</p>
            <span class="shrink-0 rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${item.type === 'quiz' ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}">${item.type}</span>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(item.meta)}</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-2">${formatRelativeDate(item.date)}</p>
        </div>
      `
    )
    .join('');
}

function renderSubjectMastery(items) {
  const el = dashboardEls.subjectMasteryList();
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 px-4 py-5 bg-slate-50/70 dark:bg-slate-800/30">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          No subject progress yet. Start with a paper or quiz and your mastery bars will show up here.
        </p>
      </div>
    `;
    return;
  }

  el.innerHTML = items
    .map(
      item => `
        <div>
          <div class="flex items-center justify-between mb-1.5 gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-slate-900 dark:text-white truncate">${escapeHtml(item.name)}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(item.code || '')}</p>
            </div>
            <span class="shrink-0 text-sm font-bold text-brand-600 dark:text-brand-400">${item.mastery}%</span>
          </div>
          <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden" aria-hidden="true">
            <div class="h-full rounded-full bg-gradient-to-r from-sky-500 to-brand-500 transition-all duration-500" style="width:${item.mastery}%"></div>
          </div>
        </div>
      `
    )
    .join('');
}

async function renderLearningChart(labels, data) {
  lastChartPayload = { labels: [...labels], data: [...data] };

  const canvas = dashboardEls.learningChart();
  const empty = dashboardEls.learningChartEmpty();
  if (!canvas) return;

  if (!labels.length || !data.length) {
    if (learningChart) {
      learningChart.destroy();
      learningChart = null;
    }

    canvas.classList.add('hidden');
    empty?.classList.remove('hidden');
    return;
  }

  canvas.classList.remove('hidden');
  empty?.classList.add('hidden');

  const { Chart } = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm');
  const ctx = canvas.getContext('2d');

  if (learningChart) {
    learningChart.destroy();
  }

  const isDark = document.documentElement.classList.contains('dark');
  const borderColor = isDark ? '#38bdf8' : '#0ea5e9';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)';
  const textColor = isDark ? '#cbd5e1' : '#64748b';
  const pointBg = isDark ? '#0f172a' : '#ffffff';

  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, isDark ? 'rgba(56,189,248,0.25)' : 'rgba(14,165,233,0.18)');
  gradient.addColorStop(1, isDark ? 'rgba(56,189,248,0.02)' : 'rgba(14,165,233,0.01)');

  learningChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Score',
          data,
          borderColor,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: pointBg,
          pointBorderColor: borderColor,
          pointBorderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 550 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.98)',
          titleColor: isDark ? '#ffffff' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#475569',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: context => `Score: ${context.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor },
          border: { display: false }
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: textColor, stepSize: 20 },
          grid: { color: gridColor, drawTicks: false },
          border: { display: false }
        }
      }
    }
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatRelativeDate(value) {
  if (!value) return 'Recently';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
