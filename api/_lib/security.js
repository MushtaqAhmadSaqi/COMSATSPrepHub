// Shared security helpers for Vercel API routes.
// Every failure path here is fail-closed: protected endpoints refuse to run
// when authentication or rate limiting cannot be verified.

export function sanitizeField(value, maxLen = 120) {
  return String(value || '')
    .replace(/[<>&"'`]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function getBearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

export function getClientIp(req) {
  return (
    (req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim() ||
    req?.socket?.remoteAddress ||
    'unknown'
  );
}

export function sendError(res, status, error, extra = {}) {
  return res.status(status).json({ error, ...extra });
}

export function isRateLimitConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Distributed rate limiting. Returns 503 instead of silently allowing traffic
 * when the limiter is missing or unreachable, so a broken limiter can never
 * turn into an unlimited endpoint.
 */
export async function checkRateLimit({ req, scope, limit, tooManyMessage }) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return {
      allowed: false,
      status: 503,
      error: 'Request rate limiting is not configured on the server.'
    };
  }

  try {
    const key = `ratelimit:${scope}:${getClientIp(req)}`;
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, 60]
      ]),
      signal: AbortSignal.timeout(2000)
    });

    if (!res.ok) {
      return {
        allowed: false,
        status: 503,
        error: 'Rate limiting service is temporarily unavailable.'
      };
    }

    const data = await res.json();
    const count = Number(data?.[0]?.result);
    if (!Number.isFinite(count)) {
      return {
        allowed: false,
        status: 503,
        error: 'Rate limiting service returned an invalid response.'
      };
    }
    if (count > limit) {
      return {
        allowed: false,
        status: 429,
        error: tooManyMessage || 'Too many requests. Please wait a minute and try again.'
      };
    }
    return { allowed: true };
  } catch {
    return {
      allowed: false,
      status: 503,
      error: 'Rate limiting service is temporarily unavailable.'
    };
  }
}

function getSupabaseAdminConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceRoleKey ? { url, serviceRoleKey } : null;
}

/**
 * Verifies the caller's Supabase session with the service-role client.
 * Missing server configuration, invalid tokens, and auth-service failures all
 * deny access instead of exposing the endpoint anonymously.
 */
export async function requireUser(req, featureLabel = 'AI features') {
  const config = getSupabaseAdminConfig();
  if (!config) {
    return {
      ok: false,
      status: 503,
      error: `Server authentication is not configured, so ${featureLabel} are temporarily unavailable.`
    };
  }

  const token = getBearerToken(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: `Please sign in to use ${featureLabel}.`
    };
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return {
        ok: false,
        status: 401,
        error: 'Invalid or expired session. Please sign in again.'
      };
    }
    return { ok: true, user: data.user, supabaseAdmin };
  } catch {
    return {
      ok: false,
      status: 503,
      error: 'Authentication service is temporarily unavailable. Please try again shortly.'
    };
  }
}

/**
 * Atomically reserves one AI quiz generation for the signed-in user.
 * A failed or malformed quota response denies the request (fail-closed)
 * rather than granting unlimited usage.
 */
export async function reserveAiQuizUsage({ supabaseAdmin, userId, limit }) {
  try {
    const { data, error } = await supabaseAdmin.rpc('reserve_ai_quiz_generation', {
      p_user_id: userId,
      p_limit: limit
    });

    if (error) {
      return {
        ok: false,
        status: 503,
        error: 'Could not verify your AI quiz quota. Please try again shortly.'
      };
    }

    const usage = Array.isArray(data) ? data[0] : data;
    if (!usage || typeof usage.allowed !== 'boolean') {
      return {
        ok: false,
        status: 503,
        error: 'Could not verify your AI quiz quota. Please try again shortly.'
      };
    }

    if (!usage.allowed) {
      return {
        ok: false,
        status: 429,
        error: `You have reached your ${limit}-quiz generation limit.`,
        usage: { used: usage.used ?? limit, remaining: 0, limit }
      };
    }

    return {
      ok: true,
      usage: { used: usage.used, remaining: usage.remaining, limit }
    };
  } catch {
    return {
      ok: false,
      status: 503,
      error: 'Could not verify your AI quiz quota. Please try again shortly.'
    };
  }
}
