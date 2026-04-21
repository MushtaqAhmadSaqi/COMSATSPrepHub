import { supabase, auth, escapeHtml } from './core.js';

let learningChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  initDashboardDate();
  await initDashboard();
});

function initDashboardDate() {
  const dateEl = document.getElementById('currentDate');
  if (!dateEl) return;

  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  dateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

async function initDashboard() {
  try {
    const session = await auth.getSession();
    const user = session?.user;

    if (!user) {
      setGuestFallback();
      return;
    }

    const firstName =
      user?.user_metadata?.full_name?.split(' ')[0] ||
      user?.email?.split('@')[0] ||
      'Student';

    const fullName =
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Student';

    setText('userFirstName', firstName);
    setText(
      'welcomeSubtext',
      `Great to have you back, ${fullName}. Keep building momentum with your quizzes and subject practice.`
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
    'Track your study progress, quiz performance, and subject mastery in one clean dashboard.'
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
  const [quizAttemptsResult, subjectProgressResult] = await Promise.allSettled([
    supabase
      .from('user_quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false }),

    supabase
      .from('user_subject_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
  ]);

  const quizAttempts =
    quizAttemptsResult.status === 'fulfilled' && !quizAttemptsResult.value.error
      ? quizAttemptsResult.value.data || []
      : [];

  const subjectProgress =
    subjectProgressResult.status === 'fulfilled' && !subjectProgressResult.value.error
      ? subjectProgressResult.value.data || []
      : [];

  if (quizAttemptsResult.status === 'fulfilled' && quizAttemptsResult.value.error) {
    console.error('Quiz attempts load error:', quizAttemptsResult.value.error);
  }

  if (subjectProgressResult.status === 'fulfilled' && subjectProgressResult.value.error) {
    console.error('Subject progress load error:', subjectProgressResult.value.error);
  }

  const stats = buildDashboardStats(quizAttempts, subjectProgress);

  renderDashboardStats(stats);
  renderWeakTopics(stats.weakTopics);
  renderRecentActivity(stats.recentActivity);
  renderSubjectMastery(stats.subjectMastery);
  renderLearningChart(stats.chartLabels, stats.chartScores);
}

function buildDashboardStats(quizAttempts, subjectProgress) {
  const quizCount = quizAttempts.length;

  const averageScore = quizCount
    ? Math.round(
        quizAttempts.reduce((sum, item) => sum + Number(item.score_percent || 0), 0) / quizCount
      )
    : 0;

  const subjectsStudied = new Set(
    subjectProgress
      .map(item => item.subject_code || item.subject_name)
      .filter(Boolean)
  ).size;

  const studySessions = subjectProgress.reduce(
    (sum, item) => sum + Number(item.sessions_count || 0),
    0
  );

  const weakTopics = subjectProgress
    .filter(item => Number(item.mastery_percent || 0) < 50)
    .sort((a, b) => Number(a.mastery_percent || 0) - Number(b.mastery_percent || 0))
    .slice(0, 5)
    .map(item => ({
      name: item.topic_name || item.subject_name || item.subject_code || 'Untitled Topic',
      score: Number(item.mastery_percent || 0),
      subject: item.subject_code || item.subject_name || 'Subject'
    }));

  const recentActivity = quizAttempts.slice(0, 5).map(item => ({
    title: `Completed ${item.quiz_title || 'Quiz'}`,
    meta: `${item.subject_code || 'Subject'} • ${Number(item.score_percent || 0)}% score`,
    date: item.completed_at
  }));

  const masteryMap = {};

  subjectProgress.forEach(item => {
    const key = item.subject_code || item.subject_name || 'UNKNOWN';

    if (!masteryMap[key]) {
      masteryMap[key] = {
        name: item.subject_name || item.subject_code || 'Untitled Subject',
        code: item.subject_code || '',
        total: 0,
        count: 0
      };
    }

    masteryMap[key].total += Number(item.mastery_percent || 0);
    masteryMap[key].count += 1;
  });

  const subjectMastery = Object.values(masteryMap)
    .map(item => ({
      name: item.name,
      code: item.code,
      mastery: Math.round(item.total / item.count)
    }))
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 6);

  const chartItems = quizAttempts.slice(0, 6).reverse();
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
  const el = document.getElementById('weakTopicsList');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `
      <p class="text-sm text-slate-500 dark:text-slate-400">
        No weak topics yet. Complete more quizzes to detect low-performing areas.
      </p>
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
          <span class="ml-4 shrink-0 text-sm font-bold text-red-500">${item.score}%</span>
        </div>
      `
    )
    .join('');
}

function renderRecentActivity(items) {
  const el = document.getElementById('recentActivityList');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `
      <p class="text-sm text-slate-500 dark:text-slate-400">
        No activity recorded yet. Your latest completed quizzes will appear here.
      </p>
    `;
    return;
  }

  el.innerHTML = items
    .map(
      item => `
        <div class="rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40">
          <p class="font-semibold text-slate-900 dark:text-white">${escapeHtml(item.title)}</p>
          <p class="text-sm text-slate-500 dark:text-slate-400">${escapeHtml(item.meta)}</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">${formatRelativeDate(item.date)}</p>
        </div>
      `
    )
    .join('');
}

function renderSubjectMastery(items) {
  const el = document.getElementById('subjectMasteryList');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `
      <p class="text-sm text-slate-500 dark:text-slate-400">
        No subject progress yet. Start studying papers or completing quizzes.
      </p>
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
          <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-sky-500 to-brand-500 transition-all duration-500" style="width:${item.mastery}%"></div>
          </div>
        </div>
      `
    )
    .join('');
}

async function renderLearningChart(labels, data) {
  const canvas = document.getElementById('learningChart');
  if (!canvas) return;

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
      labels: labels.length ? labels : ['No Data'],
      datasets: [
        {
          label: 'Score',
          data: data.length ? data : [0],
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
      animation: {
        duration: 550
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          displayColors: false,
          backgroundColor: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.98)',
          titleColor: isDark ? '#ffffff' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#475569',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
          borderWidth: 1,
          padding: 12
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor
          },
          border: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: textColor,
            stepSize: 20
          },
          grid: {
            color: gridColor,
            drawTicks: false
          },
          border: {
            display: false
          }
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
