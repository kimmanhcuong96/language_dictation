import { lessons } from "../src/data/lessons";
import { answerScore } from "../src/lib/text";

const SESSION_COOKIE = "__Host-echotype_session";
const OAUTH_COOKIE = "__Host-echotype_oauth_state";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_SECONDS = 60 * 10;
const MAX_JSON_BYTES = 16 * 1024;

type SessionUser = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  leaderboard_visible: number;
  csrf_token: string;
  expires_at: number;
};

type GoogleTokenResponse = { access_token?: string; error?: string };
type GoogleUser = { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
type OAuthAttempt = { code_verifier: string; return_to: string; expires_at: number };
type LeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  completed_sentences: number;
  active_seconds: number;
  points: number;
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
        return withSecurityHeaders(await routeApi(request, env, ctx, url));
      }
      return withSecurityHeaders(await env.ASSETS.fetch(request));
    } catch (error) {
      console.error(JSON.stringify({ event: "request_error", message: error instanceof Error ? error.message : "unknown" }));
      return error instanceof HttpError ? json({ error: error.code }, error.status) : json({ error: "internal_error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function routeApi(request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  if (request.method === "GET" && url.pathname === "/api/auth/google") return startGoogleAuth(request, env, ctx, url);
  if (request.method === "GET" && url.pathname === "/api/auth/google/callback") return finishGoogleAuth(request, env, ctx, url);
  if (request.method === "GET" && url.pathname === "/api/me") return getMe(request, env, ctx);
  if (request.method === "PATCH" && url.pathname === "/api/me") return updateMe(request, env, ctx);
  if (request.method === "POST" && url.pathname === "/api/logout") return logout(request, env, ctx);
  if (request.method === "GET" && url.pathname === "/api/progress") return getProgress(request, env, ctx);
  if (request.method === "POST" && url.pathname === "/api/progress/import") return importProgress(request, env, ctx);
  if (request.method === "POST" && url.pathname === "/api/progress/events") return recordProgress(request, env, ctx);
  if (request.method === "GET" && url.pathname === "/api/leaderboard") return getLeaderboard(request, env, ctx, url);
  return json({ error: "not_found" }, 404);
}

async function startGoogleAuth(_request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === "set-with-dashboard-or-environment") {
    return json({ error: "oauth_not_configured" }, 503);
  }
  const state = randomToken(32);
  const verifier = randomToken(64);
  const challenge = await sha256Base64Url(verifier);
  const now = epochSeconds();
  const requestedReturn = url.searchParams.get("returnTo") ?? "#/";
  const returnTo = /^#\/([\w\-/]*)?$/.test(requestedReturn) ? requestedReturn : "#/";

  await env.DB.prepare(
    "INSERT INTO oauth_attempts (state_hash, code_verifier, return_to, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5)",
  ).bind(await sha256Hex(state), verifier, returnTo, now, now + OAUTH_SECONDS).run();
  ctx.waitUntil(env.DB.prepare("DELETE FROM oauth_attempts WHERE expires_at < ?1").bind(now).run());

  const redirectUri = `${env.APP_ORIGIN}/api/auth/google/callback`;
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  return redirect(googleUrl.toString(), serializeCookie(OAUTH_COOKIE, state, OAUTH_SECONDS));
}

async function finishGoogleAuth(request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = parseCookies(request.headers.get("Cookie"))[OAUTH_COOKIE];
  if (!code || !state || !cookieState || !(await safeEqual(state, cookieState))) return oauthFailure(env, "invalid_state");

  const stateHash = await sha256Hex(state);
  const attempt = await env.DB.prepare(
    "SELECT code_verifier, return_to, expires_at FROM oauth_attempts WHERE state_hash = ?1",
  ).bind(stateHash).first<OAuthAttempt>();
  if (!attempt || attempt.expires_at < epochSeconds()) return oauthFailure(env, "expired_state");
  await env.DB.prepare("DELETE FROM oauth_attempts WHERE state_hash = ?1").bind(stateHash).run();

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${env.APP_ORIGIN}/api/auth/google/callback`,
      grant_type: "authorization_code",
      code_verifier: attempt.code_verifier,
    }),
  });
  if (!tokenResponse.ok) return oauthFailure(env, "token_exchange_failed");
  const token = await tokenResponse.json<GoogleTokenResponse>();
  if (!token.access_token) return oauthFailure(env, token.error ?? "missing_access_token");

  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" },
  });
  if (!userResponse.ok) return oauthFailure(env, "userinfo_failed");
  const googleUser = await userResponse.json<GoogleUser>();
  if (!googleUser.sub || !googleUser.email || googleUser.email_verified !== true) return oauthFailure(env, "unverified_account");

  const now = epochSeconds();
  const existing = await env.DB.prepare("SELECT id, display_name FROM users WHERE google_subject = ?1").bind(googleUser.sub).first<{ id: string; display_name: string }>();
  const userId = existing?.id ?? crypto.randomUUID();
  const initialName = cleanDisplayName(googleUser.name ?? googleUser.email.split("@")[0]) ?? "Learner";
  await env.DB.prepare(
    `INSERT INTO users (id, google_subject, email, display_name, avatar_url, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT(google_subject) DO UPDATE SET email = excluded.email, avatar_url = excluded.avatar_url, updated_at = excluded.updated_at`,
  ).bind(userId, googleUser.sub, googleUser.email, existing?.display_name ?? initialName, googleUser.picture ?? null, now).run();

  const sessionToken = randomToken(48);
  const csrfToken = randomToken(32);
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, expires_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?5, ?4)",
  ).bind(await sha256Hex(sessionToken), userId, csrfToken, now, now + SESSION_SECONDS).run();
  ctx.waitUntil(env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?1").bind(now).run());

  const destination = `${env.APP_ORIGIN}/${attempt.return_to}`;
  const headers = new Headers({ Location: destination, "Cache-Control": "no-store" });
  headers.append("Set-Cookie", serializeCookie(SESSION_COOKIE, sessionToken, SESSION_SECONDS));
  headers.append("Set-Cookie", serializeCookie(OAUTH_COOKIE, "", 0));
  return new Response(null, { status: 302, headers });
}

async function getMe(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const session = await requireSession(request, env, ctx);
  if (!session) return json({ user: null });
  return json({ user: publicUser(session), csrfToken: session.csrf_token });
}

async function updateMe(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const session = await requireSession(request, env, ctx);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (!(await validMutation(request, env, session))) return json({ error: "invalid_csrf" }, 403);
  const body = await readJson<{ displayName?: unknown; leaderboardVisible?: unknown }>(request);
  const displayName = typeof body.displayName === "string" ? cleanDisplayName(body.displayName) : null;
  if (!displayName) return json({ error: "invalid_display_name" }, 422);
  const leaderboardVisible = typeof body.leaderboardVisible === "boolean" ? Number(body.leaderboardVisible) : session.leaderboard_visible;
  const now = epochSeconds();
  await env.DB.prepare("UPDATE users SET display_name = ?1, leaderboard_visible = ?2, updated_at = ?3 WHERE id = ?4").bind(displayName, leaderboardVisible, now, session.id).run();
  return json({ user: { ...publicUser(session), displayName, leaderboardVisible: leaderboardVisible === 1 } });
}

async function logout(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const session = await requireSession(request, env, ctx);
  if (session && !(await validMutation(request, env, session))) return json({ error: "invalid_csrf" }, 403);
  const token = parseCookies(request.headers.get("Cookie"))[SESSION_COOKIE];
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(await sha256Hex(token)).run();
  const response = json({ ok: true });
  response.headers.append("Set-Cookie", serializeCookie(SESSION_COOKIE, "", 0));
  return response;
}

async function getProgress(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const session = await requireSession(request, env, ctx);
  if (!session) return json({ error: "unauthorized" }, 401);
  const result = await env.DB.prepare(
    "SELECT lesson_id, language, sentence_index, best_score, attempts, completed, updated_at FROM lesson_progress WHERE user_id = ?1 ORDER BY updated_at DESC LIMIT 5000",
  ).bind(session.id).all();
  return json({ progress: result.results });
}

async function recordProgress(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const session = await requireSession(request, env, ctx);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (!(await validMutation(request, env, session))) return json({ error: "invalid_csrf" }, 403);
  const body = await readJson<Record<string, unknown>>(request);
  const eventId = typeof body.eventId === "string" && /^[0-9a-f-]{36}$/i.test(body.eventId) ? body.eventId : null;
  const lessonId = typeof body.lessonId === "string" && /^[\w-]{1,80}$/.test(body.lessonId) ? body.lessonId : null;
  const language = body.language === "en" || body.language === "zh" || body.language === "ja" ? body.language : null;
  const sentenceIndex = Number.isInteger(body.sentenceIndex) && Number(body.sentenceIndex) >= 0 && Number(body.sentenceIndex) <= 500 ? Number(body.sentenceIndex) : null;
  const typedAnswer = typeof body.typedAnswer === "string" && [...body.typedAnswer].length <= 1000 ? body.typedAnswer : null;
  const duration = Number.isInteger(body.durationSeconds) ? Math.min(300, Math.max(1, Number(body.durationSeconds))) : null;
  const lesson = lessons.find((item) => item.id === lessonId && item.language === language);
  if (!eventId || !lessonId || !language || sentenceIndex === null || typedAnswer === null || duration === null || !lesson?.sentences[sentenceIndex]) return json({ error: "invalid_progress_event" }, 422);

  const now = epochSeconds();
  const score = answerScore(lesson.sentences[sentenceIndex].text, typedAnswer);
  const completed = score >= 80 ? 1 : 0;
  const day = new Date(now * 1000).toISOString().slice(0, 10);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO progress_events
       (id, user_id, lesson_id, language, sentence_index, score, duration_seconds, completed, occurred_at, activity_day)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    ).bind(eventId, session.id, lessonId, language, sentenceIndex, score, duration, completed, now, day),
    env.DB.prepare(
      `INSERT INTO lesson_progress (user_id, lesson_id, language, sentence_index, best_score, attempts, completed, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)
       ON CONFLICT(user_id, lesson_id, sentence_index) DO UPDATE SET
         best_score = MAX(best_score, excluded.best_score), attempts = attempts + 1,
         completed = MAX(completed, excluded.completed), updated_at = excluded.updated_at`,
    ).bind(session.id, lessonId, language, sentenceIndex, score, completed, now),
  ]);
  return json({ ok: true, countedForLeaderboard: completed === 1 });
}

async function importProgress(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const session = await requireSession(request, env, ctx);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (!(await validMutation(request, env, session))) return json({ error: "invalid_csrf" }, 403);
  const body = await readJson<{ items?: unknown }>(request);
  if (!Array.isArray(body.items) || body.items.length > 500) return json({ error: "invalid_import" }, 422);
  const now = epochSeconds();
  const statements: D1PreparedStatement[] = [];
  for (const candidate of body.items) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    const lessonId = typeof item.lessonId === "string" && /^[\w-]{1,80}$/.test(item.lessonId) ? item.lessonId : null;
    const language = item.language === "en" || item.language === "zh" || item.language === "ja" ? item.language : null;
    const sentenceIndex = Number.isInteger(item.sentenceIndex) && Number(item.sentenceIndex) >= 0 && Number(item.sentenceIndex) <= 500 ? Number(item.sentenceIndex) : null;
    const lesson = lessons.find((entry) => entry.id === lessonId && entry.language === language);
    if (!lessonId || !language || sentenceIndex === null || !lesson?.sentences[sentenceIndex]) continue;
    statements.push(env.DB.prepare(
      `INSERT INTO lesson_progress (user_id, lesson_id, language, sentence_index, best_score, attempts, completed, updated_at)
       VALUES (?1, ?2, ?3, ?4, 100, 1, 1, ?5)
       ON CONFLICT(user_id, lesson_id, sentence_index) DO UPDATE SET
         best_score = MAX(best_score, 100), completed = 1, updated_at = MAX(updated_at, excluded.updated_at)`,
    ).bind(session.id, lessonId, language, sentenceIndex, now));
  }
  if (statements.length) await env.DB.batch(statements);
  return json({ ok: true, imported: statements.length });
}

async function getLeaderboard(request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  const session = await requireSession(request, env, ctx);
  const period = url.searchParams.get("period") ?? "week";
  if (!(["day", "week", "month", "year"] as const).includes(period as "day" | "week" | "month" | "year")) return json({ error: "invalid_period" }, 422);
  const start = periodStart(period as "day" | "week" | "month" | "year");
  const result = await env.DB.prepare(
    `WITH totals AS (
       SELECT pe.user_id, COUNT(*) AS completed_sentences,
              SUM(MIN(pe.duration_seconds, 120)) AS active_seconds,
              COUNT(*) * 10 + CAST(SUM(MIN(pe.duration_seconds, 120)) / 60 AS INTEGER) AS points
       FROM progress_events pe WHERE pe.completed = 1 AND pe.occurred_at >= ?1 GROUP BY pe.user_id
     ), ranked AS (
       SELECT ROW_NUMBER() OVER (ORDER BY totals.points DESC, totals.active_seconds DESC, u.created_at ASC) AS rank,
              u.id AS user_id, u.display_name, u.avatar_url, totals.completed_sentences, totals.active_seconds, totals.points
       FROM totals JOIN users u ON u.id = totals.user_id WHERE u.leaderboard_visible = 1
     ) SELECT * FROM ranked WHERE rank <= 50 OR user_id = ?2 ORDER BY rank ASC`,
  ).bind(start, session?.id ?? "").all<LeaderboardRow>();
  return json({ period, startsAt: new Date(start * 1000).toISOString(), leaders: result.results, currentUserId: session?.id ?? null });
}

async function requireSession(request: Request, env: Env, ctx: ExecutionContext): Promise<SessionUser | null> {
  const token = parseCookies(request.headers.get("Cookie"))[SESSION_COOKIE];
  if (!token) return null;
  const now = epochSeconds();
  const tokenHash = await sha256Hex(token);
  const session = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.avatar_url, u.leaderboard_visible, s.csrf_token, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1 AND s.expires_at > ?2`,
  ).bind(tokenHash, now).first<SessionUser>();
  if (!session) return null;
  ctx.waitUntil(env.DB.prepare("UPDATE sessions SET last_seen_at = ?1 WHERE token_hash = ?2 AND last_seen_at < ?3").bind(now, tokenHash, now - 3600).run().catch(() => undefined));
  return session;
}

async function validMutation(request: Request, env: Env, session: SessionUser): Promise<boolean> {
  const origin = request.headers.get("Origin");
  const csrf = request.headers.get("X-CSRF-Token");
  return origin === env.APP_ORIGIN && !!csrf && await safeEqual(csrf, session.csrf_token);
}

function publicUser(session: SessionUser) {
  return { id: session.id, email: session.email, displayName: session.display_name, avatarUrl: session.avatar_url, leaderboardVisible: session.leaderboard_visible === 1 };
}

function cleanDisplayName(value: string): string | null {
  const cleaned = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  const length = [...cleaned].length;
  return length >= 2 && length <= 40 && !/[\p{C}<>]/u.test(cleaned) ? cleaned : null;
}

function periodStart(period: "day" | "week" | "month" | "year", now = new Date()): number {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "week") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (period === "month") start.setUTCDate(1);
  if (period === "year") { start.setUTCMonth(0); start.setUTCDate(1); }
  return Math.floor(start.getTime() / 1000);
}

async function readJson<T>(request: Request): Promise<T> {
  if (!request.body) throw new HttpError(400, "missing_body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_JSON_BYTES) { await reader.cancel(); throw new HttpError(413, "body_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as T; }
  catch { throw new HttpError(400, "invalid_json"); }
}

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(header.split(";").map((part) => part.trim().split(/=(.*)/s).slice(0, 2)).filter(([key]) => key).map(([key, value]) => [key, decodeURIComponent(value ?? "")]));
}

function serializeCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function randomToken(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64Url(buffer);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Base64Url(value: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

async function safeEqual(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)), crypto.subtle.digest("SHA-256", new TextEncoder().encode(right))]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function epochSeconds(): number { return Math.floor(Date.now() / 1000); }

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
}

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  if (cookie) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function oauthFailure(env: Env, reason: string): Response {
  console.warn(JSON.stringify({ event: "oauth_failure", reason }));
  return redirect(`${env.APP_ORIGIN}/#/?authError=${encodeURIComponent(reason)}`, serializeCookie(OAUTH_COOKIE, "", 0));
}

function withSecurityHeaders(response: Response): Response {
  const next = new Response(response.body, response);
  next.headers.set("X-Content-Type-Options", "nosniff");
  next.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next.headers.set("X-Frame-Options", "DENY");
  return next;
}

export { cleanDisplayName, periodStart };
