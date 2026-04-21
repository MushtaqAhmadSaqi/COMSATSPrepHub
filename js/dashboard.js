import { supabase, auth } from './core.js';

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
    const session = await auth.getSession?.();
    const user = session?.user;

    if (!user) {
        console.warn('No active session found for dashboard.');
        return;
    }

    // Set User Name
    const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Student';
    const firstNameEl = document.getElementById('userFirstName');
    if (firstNameEl) firstNameEl.textContent = firstName;

    const welcomeSubtextEl = document.getElementById('welcomeSubtext');
    if (welcomeSubtextEl) {
        welcomeSubtextEl.textContent = `Great to have you back, ${firstName}. Keep building momentum with your quizzes and subject practice.`;
    }

    // Fetch and Render Stats
    const stats = await getDashboardStats(user.id);
    renderDashboardStats(stats);
    renderWeakTopics(stats.weakTopics);
    renderRecentActivity(stats.recentActivity);
    renderSubjectMastery(stats.subjectMastery);
    renderLearningChart(stats.chartLabels, stats.chartScores);
  } catch (error) {
    console.error('Dashboard init failed:', error);
  }
}

async function getDashboardStats(userId) {
  // Use try/catch for Supabase calls to handle missing tables gracefully during Phase 2
  try {
    const { data: attempts = [], error: attemptError } = await supabase
      .from('user_quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (attemptError) throw attemptError;

    const { data: subjects = [], error: subjectError } = await supabase
      .from('user_subject_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (subjectError) throw subjectError;

    const quizCount = attempts.length;
    const averageScore = quizCount
      ? Math.round(attempts.reduce((sum, a) => sum + (a.score_percent || 0), 0) / quizCount)
      : 0;

    const subjectsStudied = new Set(subjects.map(s => s.subject_code)).size;
    const studySessions = subjects.reduce((sum, s) => sum + (s.sessions_count || 0), 0);

    const recentActivity = attempts.slice(0, 5).map(a => ({
      title: `Completed ${a.quiz_title || 'Quiz'}`,
      meta: `${a.subject_code || 'Subject'} • ${a.score_percent || 0}%`,
      date: a.completed_at
    }));

    const weakTopics = subjects
      .filter(s => (s.mastery_percent || 0) < 50)
      .slice(0, 5)
      .map(s => ({
        name: s.topic_name || s.subject_name || s.subject_code,
        score: s.mastery_percent || 0
      }));

    const subjectMastery = subjects
      .reduce((acc, item) => {
        const key = item.subject_code || item.subject_name;
        if (!acc[key]) {
          acc[key] = {
            name: item.subject_name || item.subject_code,
            code: item.subject_code,
            mastery: 0,
            count: 0
          };
        }
        acc[key].mastery += item.mastery_percent || 0;
        acc[key].count += 1;
        return acc;
      }, {});

    const subjectMasteryList = Object.values(subjectMastery).map(item => ({
      name: item.name,
      code: item.code,
      mastery: Math.round(item.mastery / item.count)
    }));

    const chartData = attempts.slice(0, 6).reverse();

    return {
      quizCount,
      averageScore,
      subjectsStudied,
      studySessions,
      weakTopics,
      recentActivity,
      subjectMastery: subjectMasteryList,
      chartLabels: chartData.length > 0 ? chartData.map((_, i) => `Quiz ${i + 1}`) : ['Start'],
      chartScores: chartData.length > 0 ? chartData.map(item => item.score_percent || 0) : [0]
    };
  } catch (err) {
    console.warn('Supabase stats fetch failed (tables might not exist yet):', err.message);
    return {
        quizCount: 0,
        averageScore: 0,
        subjectsStudied: 0,
        studySessions: 0,
        weakTopics: [],
        recentActivity: [],
        subjectMastery: [],
        chartLabels: ['Orientation'],
        chartScores: [0]
    };
  }
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
    el.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm">No weak topics yet.</p>`;
    return;
  }

  el.innerHTML = items.map(item => `
    <div class="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-3">
      <div>
        <p class="font-semibold text-slate-900 dark:text-white">${escapeHtml(item.name)}</p>
        <p class="text-sm text-red-500">${item.score}% mastery</p>
      </div>
      <span class="text-sm font-bold text-red-500">Needs Work</span>
    </div>
  `).join('');
}

function renderRecentActivity(items) {
  const el = document.getElementById('recentActivityList');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm">No activity recorded yet.</p>`;
    return;
  }

  el.innerHTML = items.map(item => `
    <div class="rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-3">
      <p class="font-semibold text-slate-900 dark:text-white">${escapeHtml(item.title)}</p>
      <p class="text-sm text-slate-500 dark:text-slate-400">${escapeHtml(item.meta)}</p>
    </div>
  `).join('');
}

function renderSubjectMastery(items) {
  const el = document.getElementById('subjectMasteryList');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `<p class="text-slate-500 dark:text-slate-400 text-sm">No subject progress yet.</p>`;
    return;
  }

  el.innerHTML = items.map(item => `
    <div>
      <div class="flex items-center justify-between mb-1">
        <div>
          <p class="font-semibold text-slate-900 dark:text-white">${escapeHtml(item.name)}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(item.code || '')}</p>
        </div>
        <span class="text-sm font-bold text-brand-600 dark:text-brand-400">${item.mastery}%</span>
      </div>
      <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div class="h-full rounded-full bg-brand-500" style="width:${item.mastery}%"></div>
      </div>
    </div>
  `).join('');
}

async function renderLearningChart(labels, data) {
  const canvas = document.getElementById('learningChart');
  if (!canvas) return;

  try {
      const { Chart, registerables } = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm');
      Chart.register(...registerables);
      
      const ctx = canvas.getContext('2d');
    
      if (learningChart) {
        learningChart.destroy();
      }
    
      learningChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Score',
            data,
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14,165,233,0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, max: 100 }
          }
        }
      });
  } catch (err) {
      console.error('Failed to render chart:', err);
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
