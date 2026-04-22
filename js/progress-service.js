import { supabase, auth } from './core.js';

const DEFAULT_TOPIC = null;
const subjectProgressCache = new Map();

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getCacheKey(userId, subjectCode, topicName = DEFAULT_TOPIC) {
  return [userId || 'guest', subjectCode || 'unknown', topicName ?? '__root__'].join('::');
}

function normalizeSubjectPayload({ subjectCode, subjectName, topicName = DEFAULT_TOPIC } = {}) {
  return {
    subjectCode: String(subjectCode || '').trim(),
    subjectName: String(subjectName || subjectCode || 'Untitled Subject').trim(),
    topicName: topicName == null ? DEFAULT_TOPIC : String(topicName).trim()
  };
}

async function getSignedInUserId() {
  const session = await auth.getSession();
  return session?.user?.id || null;
}

async function getExistingProgress({ userId, subjectCode, topicName = DEFAULT_TOPIC }) {
  const cacheKey = getCacheKey(userId, subjectCode, topicName);

  if (subjectProgressCache.has(cacheKey)) {
    return subjectProgressCache.get(cacheKey);
  }

  let query = supabase
    .from('user_subject_progress')
    .select('id, user_id, subject_code, subject_name, topic_name, mastery_percent, sessions_count, updated_at')
    .eq('user_id', userId)
    .eq('subject_code', subjectCode);

  query = topicName == null ? query.is('topic_name', null) : query.eq('topic_name', topicName);

  // Avoid "JSON object requested, multiple (or no) rows returned" if the table
  // accidentally contains duplicates for a user/subject/topic combination.
  const { data, error } = await query.order('updated_at', { ascending: false }).limit(1);
  if (error) throw error;

  const normalized = Array.isArray(data) && data.length ? data[0] : null;
  subjectProgressCache.set(cacheKey, normalized);
  return normalized;
}

async function persistSubjectProgress({
  userId,
  subjectCode,
  subjectName,
  topicName = DEFAULT_TOPIC,
  sessionDelta = 0,
  masteryDelta = 0,
  masteryAbsolute,
  minimumMastery
}) {
  if (!userId || !subjectCode) return null;

  const existing = await getExistingProgress({ userId, subjectCode, topicName });

  if (existing?.id) {
    const currentMastery = toNumber(existing.mastery_percent, 0);
    const nextMasteryBase = masteryAbsolute == null ? currentMastery + masteryDelta : masteryAbsolute;

    const nextMastery = clamp(
      minimumMastery == null ? nextMasteryBase : Math.max(nextMasteryBase, minimumMastery)
    );

    const payload = {
      subject_name: subjectName,
      sessions_count: Math.max(0, toNumber(existing.sessions_count, 0) + toNumber(sessionDelta, 0)),
      mastery_percent: nextMastery,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_subject_progress')
      .update(payload)
      .eq('id', existing.id)
      .select('id, user_id, subject_code, subject_name, topic_name, mastery_percent, sessions_count, updated_at')
      .single();

    if (error) throw error;

    subjectProgressCache.set(getCacheKey(userId, subjectCode, topicName), data);
    return data;
  }

  const payload = {
    user_id: userId,
    subject_code: subjectCode,
    subject_name: subjectName,
    topic_name: topicName,
    sessions_count: Math.max(0, toNumber(sessionDelta, 0)),
    mastery_percent: clamp(
      minimumMastery == null
        ? masteryAbsolute == null
          ? masteryDelta
          : masteryAbsolute
        : Math.max(masteryAbsolute == null ? masteryDelta : masteryAbsolute, minimumMastery)
    )
  };

  const { data, error } = await supabase
    .from('user_subject_progress')
    .insert(payload)
    .select('id, user_id, subject_code, subject_name, topic_name, mastery_percent, sessions_count, updated_at')
    .single();

  if (error) throw error;

  subjectProgressCache.set(getCacheKey(userId, subjectCode, topicName), data);
  return data;
}

export async function ensureSubjectTracked(payload = {}) {
  const userId = await getSignedInUserId();
  if (!userId) return null;

  const normalized = normalizeSubjectPayload(payload);
  if (!normalized.subjectCode) return null;

  return persistSubjectProgress({
    userId,
    subjectCode: normalized.subjectCode,
    subjectName: normalized.subjectName,
    topicName: normalized.topicName,
    sessionDelta: 0,
    masteryDelta: 0,
    minimumMastery: 0
  });
}

export async function recordStudySession(payload = {}) {
  const userId = await getSignedInUserId();
  if (!userId) return null;

  const normalized = normalizeSubjectPayload(payload);
  if (!normalized.subjectCode) return null;

  return persistSubjectProgress({
    userId,
    subjectCode: normalized.subjectCode,
    subjectName: normalized.subjectName,
    topicName: normalized.topicName,
    sessionDelta: 1,
    masteryDelta: toNumber(payload.masteryDelta, 0),
    masteryAbsolute: payload.masteryAbsolute,
    minimumMastery: payload.minimumMastery
  });
}

export async function addSubjectMastery(payload = {}) {
  const userId = await getSignedInUserId();
  if (!userId) return null;

  const normalized = normalizeSubjectPayload(payload);
  if (!normalized.subjectCode) return null;

  return persistSubjectProgress({
    userId,
    subjectCode: normalized.subjectCode,
    subjectName: normalized.subjectName,
    topicName: normalized.topicName,
    sessionDelta: 0,
    masteryDelta: toNumber(payload.delta, 0),
    masteryAbsolute: payload.masteryAbsolute,
    minimumMastery: payload.minimumMastery
  });
}

export async function saveQuizCompletion({
  quizId,
  quizTitle,
  subjectCode,
  subjectName,
  correctAnswers,
  totalQuestions
} = {}) {
  const userId = await getSignedInUserId();
  if (!userId || !quizId || !subjectCode) return null;

  const safeTotalQuestions = Math.max(0, toNumber(totalQuestions, 0));
  const safeCorrectAnswers = Math.max(0, toNumber(correctAnswers, 0));
  const scorePercent = safeTotalQuestions
    ? clamp(Math.round((safeCorrectAnswers / safeTotalQuestions) * 100))
    : 0;

  const { error } = await supabase.from('user_quiz_attempts').insert({
    user_id: userId,
    quiz_id: quizId,
    quiz_title: String(quizTitle || 'Untitled Quiz').trim(),
    subject_code: subjectCode,
    score_percent: scorePercent,
    correct_answers: safeCorrectAnswers,
    total_questions: safeTotalQuestions,
    completed_at: new Date().toISOString()
  });

  if (error) throw error;

  await persistSubjectProgress({
    userId,
    subjectCode,
    subjectName: String(subjectName || subjectCode || 'Untitled Subject').trim(),
    topicName: DEFAULT_TOPIC,
    sessionDelta: 1,
    masteryAbsolute: scorePercent,
    minimumMastery: scorePercent
  });

  return { scorePercent };
}

export function resetSubjectProgressCache() {
  subjectProgressCache.clear();
}
