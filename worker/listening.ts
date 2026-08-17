import { neon } from "@neondatabase/serverless";
import { parsePreTimedSrt, validateAlignedSentences, type AlignedSentence } from "../src/lib/ingestion";
import { getNormalizer } from "../src/lib/dictation";
import { slugifyTitle } from "../src/lib/slug";
import { resolveObjectRange } from "../src/lib/httpRange";
import { alignLessonImport } from "./listening-import";

export interface ListeningSession { id: string; email: string; }
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_JSON_BYTES = 128 * 1024;
class RequestBodyError extends Error { constructor(message: string, readonly status: number) { super(message); } }
const publicHeaders = { "Cache-Control": "public, max-age=60, stale-while-revalidate=300", "Content-Type": "application/json; charset=utf-8" };
const json = (body: unknown, status = 200, cache = false) => Response.json(body, { status, headers: cache ? publicHeaders : { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
type NeonSql = ReturnType<typeof neon>;
type TransactionQuery = ReturnType<NeonSql>;
type TransactionSql = NeonSql & { transaction(queries: TransactionQuery[]): Promise<unknown[]> };
// @neondatabase/serverless 1.1.0 omits its declarations from package exports,
// so TypeScript infers only the callback overload although runtime also accepts query arrays.
const sqlFor = (env: Env) => neon(env.DATABASE_URL) as TransactionSql;
const validId = (value: string | null, max = 100) => value && new RegExp(`^[\\w-]{1,${max}}$`, "u").test(value) ? value : null;
const isAdmin = (env: Env, session: ListeningSession | null) => !!session && env.ADMIN_EMAILS.split(",").map((item) => item.trim().toLocaleLowerCase()).filter(Boolean).includes(session.email.toLocaleLowerCase());

export async function routeListening(request: Request, env: Env, url: URL, session: ListeningSession | null, mutationValid: boolean): Promise<Response> {
  if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith("/api/listening/audio/")) return serveAudio(request, env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/categories") return getCategories(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/sections") return getSections(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/manifest") return getManifest(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/lessons") return getLessons(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/lessons/by-path") return getLessonByPath(env, url);
  if (request.method === "GET" && /^\/api\/listening\/lessons\/[\w-]+$/u.test(url.pathname)) return getLesson(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/progress") return getProgress(env, session, url);
  if (request.method === "POST" && url.pathname === "/api/listening/progress") return mutationValid ? saveProgress(request, env, session) : json({ error: session ? "invalid_csrf" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "GET" && url.pathname === "/api/listening/admin/bootstrap") return isAdmin(env, session) ? getAdminBootstrap(env) : json({ error: "forbidden" }, 403);
  if (request.method === "GET" && url.pathname === "/api/listening/admin/lessons") return isAdmin(env, session) ? getAdminLessons(env, url) : json({ error: "forbidden" }, 403);
  if (request.method === "GET" && /^\/api\/listening\/admin\/lessons\/[\w-]+$/u.test(url.pathname)) return isAdmin(env, session) ? getAdminLesson(env, url) : json({ error: "forbidden" }, 403);
  if (request.method === "POST" && url.pathname === "/api/listening/admin/import") return isAdmin(env, session) && mutationValid ? importLesson(request, env, session!) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "PATCH" && /^\/api\/listening\/admin\/lessons\/[\w-]+\/review$/u.test(url.pathname)) return isAdmin(env, session) && mutationValid ? reviewLesson(request, env, url) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "PATCH" && /^\/api\/listening\/admin\/lessons\/[\w-]+$/u.test(url.pathname)) return isAdmin(env, session) && mutationValid ? updateLesson(request, env, url) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "DELETE" && /^\/api\/listening\/admin\/lessons\/[\w-]+$/u.test(url.pathname)) return isAdmin(env, session) && mutationValid ? deleteLesson(env, url) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  return json({ error: "not_found" }, 404);
}

async function getCategories(env: Env, url: URL) {
  const language = url.searchParams.get("language") ?? "en"; if (!/^[a-z]{2}$/u.test(language)) return json({ error: "invalid_language" }, 422);
  const rows = await sqlFor(env)`SELECT c.id,c.slug,c.name,c.description,c.sort_order FROM listening_categories c JOIN languages l ON l.id=c.language_id WHERE l.code=${language} AND l.is_enabled=true AND c.is_published=true ORDER BY c.sort_order,c.name`;
  return json({ categories: rows }, 200, true);
}

async function getSections(env: Env, url: URL) {
  const category = validId(url.searchParams.get("category")); if (!category) return json({ error: "invalid_category" }, 422);
  const rows = await sqlFor(env)`SELECT s.id,s.number,s.title,s.description,s.sort_order,COUNT(l.id)::int AS lesson_count FROM listening_sections s JOIN listening_categories c ON c.id=s.category_id LEFT JOIN listening_lessons l ON l.section_id=s.id AND l.is_published=true WHERE (c.id=${category} OR c.slug=${category}) AND c.is_published=true AND s.is_published=true GROUP BY s.id ORDER BY s.sort_order,s.number`;
  return json({ sections: rows }, 200, true);
}

async function getLessons(env: Env, url: URL) {
  const section = validId(url.searchParams.get("section")); if (!section) return json({ error: "invalid_section" }, 422);
  const rows = await sqlFor(env)`SELECT l.id,l.slug,l.title,l.description,l.level,l.duration_ms,l.sentence_count,l.thumbnail_key,l.metadata,l.sort_order,c.slug AS category_slug,s.id AS section_id FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id WHERE s.id=${section} AND c.is_published=true AND s.is_published=true AND l.is_published=true ORDER BY l.sort_order,l.title`;
  return json({ lessons: rows.map((row) => ({ ...row, path: lessonPath(String(row.level ?? "all"), String(row.category_slug), String(row.slug)) })) }, 200, true);
}

async function getManifest(env: Env, url: URL) {
  const sql = sqlFor(env);
  const versionRows = await sql`SELECT version::text AS version FROM listening_manifest_meta WHERE id=true`;
  const version = String(versionRows[0]?.version ?? "1");
  if (url.searchParams.get("version") === version) return new Response(null, { status: 304, headers: { ETag: `"${version}"`, "Cache-Control": "no-cache" } });
  const rows = await sql`SELECT l.id,l.slug,l.title,l.level,l.sort_order,l.updated_at,p.path,c.slug AS category_slug,c.name AS category_name,s.id AS section_id,s.number AS section_number,s.title AS section_title,lang.code AS language_code FROM listening_canonical_paths p JOIN listening_lessons l ON l.id=p.lesson_id JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE l.is_published=true AND s.is_published=true AND c.is_published=true AND lang.is_enabled=true ORDER BY lang.sort_order,c.sort_order,s.sort_order,l.sort_order,l.title`;
  return json({ version, lessons: rows.map((row) => ({ id: row.id, name: row.title, slug: row.slug, path: row.path, parentId: `${row.language_code}-${row.section_id}`, language: row.language_code, level: row.level, categorySlug: row.category_slug, categoryName: row.category_name, sectionId: row.section_id, sectionNumber: row.section_number, sectionTitle: row.section_title, order: row.sort_order, updatedAt: row.updated_at })) }, 200, false);
}

async function getLesson(env: Env, url: URL) {
  const id = validId(decodeURIComponent(url.pathname.slice("/api/listening/lessons/".length))); if (!id) return json({ error: "invalid_lesson" }, 422);
  const rows = await sqlFor(env)`SELECT l.id,l.slug,l.title,l.description,l.level,l.audio_key,l.duration_ms,l.sentence_count,l.thumbnail_key,l.metadata,c.slug AS category_slug,s.id AS section_id,s.number AS section_number FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id WHERE (l.id=${id} OR l.slug=${id}) AND c.is_published=true AND s.is_published=true AND l.is_published=true`;
  const lesson = rows[0]; if (!lesson) return json({ error: "not_found" }, 404);
  const sentences = await sqlFor(env)`SELECT id,position,transcript,start_ms,end_ms,metadata FROM listening_sentences WHERE lesson_id=${lesson.id} ORDER BY position`;
  return json({ lesson: serializeLesson(lesson, sentences) }, 200, true);
}

async function getLessonByPath(env: Env, url: URL) {
  const level = url.searchParams.get("level"), category = url.searchParams.get("category"), slug = url.searchParams.get("slug");
  if (!level || !category || !slug || !validPathPart(level) || !validPathPart(category) || !validPathPart(slug)) return json({ error: "invalid_lesson_path" }, 422);
  const sql = sqlFor(env);
  const path = lessonPath(level, category, slug);
  const rows = await sql`SELECT l.id,l.slug,l.title,l.description,l.level,l.audio_key,l.duration_ms,l.sentence_count,l.thumbnail_key,l.metadata,c.slug AS category_slug,s.id AS section_id,s.number AS section_number FROM listening_canonical_paths p JOIN listening_lessons l ON l.id=p.lesson_id JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE p.path=${path} AND lang.is_enabled=true AND c.is_published=true AND s.is_published=true AND l.is_published=true`;
  const lesson = rows[0]; if (!lesson) return json({ error: "not_found" }, 404);
  const sentences = await sql`SELECT id,position,transcript,start_ms,end_ms,metadata FROM listening_sentences WHERE lesson_id=${lesson.id} ORDER BY position`;
  return json({ lesson: serializeLesson(lesson, sentences) }, 200, true);
}

export async function serveSeoLesson(request: Request, env: Env, url: URL): Promise<Response> {
  const parts = url.pathname.split("/").filter(Boolean).map((part) => { try { return decodeURIComponent(part); } catch { return ""; } });
  if (parts.length === 3 && parts[0] === "lessons" && parts.slice(1).every(validPathPart)) {
    const [level, category] = parts.slice(1), sql = sqlFor(env);
    const rows = await sql`SELECT l.title,l.slug,l.level,c.slug AS category_slug FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE lower(coalesce(nullif(l.level,''),'all'))=${level} AND c.slug=${category} AND l.is_published=true AND s.is_published=true AND c.is_published=true AND lang.is_enabled=true ORDER BY l.sort_order,l.title`;
    if (!rows.length) return seoHtml(request, env, { status: 404, title: "Lessons not found", description: "This lesson category is not available." });
    const links = rows.map((row) => `<li><a href="${escapeHtml(lessonPath(String(row.level ?? "all"), String(row.category_slug), String(row.slug)))}">${escapeHtml(String(row.title))}</a></li>`).join("");
    return seoHtml(request, env, { title: `${category} lessons`, description: `Lessons in ${category}.`, canonical: new URL(url.pathname, request.url).toString(), content: `<main class="seo-lesson"><h1>${escapeHtml(category)} lessons</h1><ul>${links}</ul></main>` });
  }
  if (parts.length !== 4 || parts[0] !== "lessons" || !parts.slice(1).every(validPathPart)) return env.ASSETS.fetch(request);
  const [level, category, slug] = parts.slice(1);
  const sql = sqlFor(env);
  const rows = await sql`SELECT l.id,l.slug,l.title,l.description,l.level,l.audio_key,l.duration_ms,l.sentence_count,c.slug AS category_slug,c.name AS category_name,s.title AS section_title,s.id AS section_id FROM listening_canonical_paths p JOIN listening_lessons l ON l.id=p.lesson_id JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE p.path=${url.pathname} AND lang.is_enabled=true AND c.is_published=true AND s.is_published=true AND l.is_published=true`;
  if (!rows.length) {
    const redirects = await sql`SELECT r.old_path,l.level,c.slug AS category_slug,l.slug FROM listening_lesson_redirects r JOIN listening_lessons l ON l.id=r.lesson_id JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id WHERE r.old_path=${url.pathname} AND l.is_published=true LIMIT 1`;
    if (redirects.length) return Response.redirect(new URL(lessonPath(String(redirects[0].level ?? "all"), String(redirects[0].category_slug), String(redirects[0].slug)), request.url).toString(), 301);
    return seoHtml(request, env, { status: 404, title: "Lesson not found", description: "This lesson is no longer available." });
  }
  const lesson = rows[0];
  const sentences = await sql`SELECT transcript FROM listening_sentences WHERE lesson_id=${lesson.id} ORDER BY position`;
  const related = await sql`SELECT l.title,l.slug,l.level,c.slug AS category_slug FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id WHERE l.section_id=${lesson.section_id} AND l.id<>${lesson.id} AND l.is_published=true ORDER BY l.sort_order,l.title LIMIT 8`;
  const description = String(lesson.description ?? sentences.slice(0, 2).map((row) => row.transcript).join(" ")).slice(0, 160);
  const relatedLinks = related.map((row) => `<li><a href="${escapeHtml(lessonPath(String(row.level ?? "all"), String(row.category_slug), String(row.slug)))}">${escapeHtml(String(row.title))}</a></li>`).join("");
  const content = `<main class="seo-lesson"><article><p>${escapeHtml(String(lesson.category_name))} · ${escapeHtml(String(lesson.section_title))}</p><h1>${escapeHtml(String(lesson.title))}</h1><p>${escapeHtml(description)}</p><p>Level: ${escapeHtml(String(lesson.level ?? "All"))} · ${Number(lesson.sentence_count)} sentences</p><h2>Transcript</h2><ol>${sentences.map((row) => `<li>${escapeHtml(String(row.transcript))}</li>`).join("")}</ol>${relatedLinks?`<nav><h2>Related lessons</h2><ul>${relatedLinks}</ul></nav>`:""}</article></main>`;
  return seoHtml(request, env, { title: String(lesson.title), description, canonical: new URL(url.pathname, request.url).toString(), content });
}

export async function serveSitemap(env: Env, request: Request): Promise<Response> {
  const rows = await sqlFor(env)`SELECT p.path,l.updated_at FROM listening_canonical_paths p JOIN listening_lessons l ON l.id=p.lesson_id JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE l.is_published=true AND s.is_published=true AND c.is_published=true AND lang.is_enabled=true ORDER BY l.updated_at DESC`;
  const base = new URL(request.url).origin;
  const urls = rows.map((row) => `<url><loc>${escapeHtml(`${base}${String(row.path)}`)}</loc><lastmod>${new Date(String(row.updated_at)).toISOString()}</lastmod></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}

export function serveRobots(request: Request): Response { return new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap.xml", request.url).toString()}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } }); }

async function seoHtml(request: Request, env: Env, options: { status?: number; title: string; description: string; canonical?: string; content?: string }): Promise<Response> {
  const shellResponse = await env.ASSETS.fetch(new Request(new URL("/", request.url), request));
  let html = await shellResponse.text();
  html = html.replace(/<title>[^<]*<\/title>/u, `<title>${escapeHtml(options.title)} | Me2Listen</title>`).replace(/<meta name="description" content="[^"]*"\s*\/>/u, `<meta name="description" content="${escapeHtml(options.description)}" />`);
  if (options.canonical) html = html.replace("</head>", `<link rel="canonical" href="${escapeHtml(options.canonical)}" /></head>`);
  if (options.content) html = html.replace(/<div id="root"><\/div>/u, `<div id="root">${options.content}</div>`);
  return new Response(html, { status: options.status ?? 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}

function escapeHtml(value: string) { return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&#39;"); }

function serializeLesson(lesson: Record<string, unknown>, sentences: unknown[]) {
  return { ...lesson, path: lessonPath(String(lesson.level ?? "all"), String(lesson.category_slug), String(lesson.slug)), audio_url: lesson.audio_key ? `/api/listening/audio/${String(lesson.audio_key).split("/").map(encodeURIComponent).join("/")}` : null, sentences };
}

function lessonPath(level: string, category: string, slug: string) { return `/lessons/${encodeURIComponent(slugifyPathPart(level))}/${encodeURIComponent(slugifyPathPart(category))}/${encodeURIComponent(slugifyPathPart(slug))}`; }
function slugifyPathPart(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || "all"; }
function validPathPart(value: string) { return /^[a-z0-9-]{1,100}$/u.test(value); }

async function serveAudio(request: Request, env: Env, url: URL) {
  const key = url.pathname.slice("/api/listening/audio/".length).split("/").map(decodeURIComponent).join("/");
  if (!key.startsWith("listening/") || key.includes("..") || key.length > 1024) return json({ error: "invalid_audio_key" }, 422);
  if (request.method === "HEAD") {
    const object = await env.LISTENING_AUDIO.head(key);
    if (!object) return json({ error: "audio_not_found" }, 404);
    const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("etag", object.httpEtag); headers.set("accept-ranges", "bytes"); headers.set("content-length", String(object.size)); headers.set("cache-control", "public, max-age=86400");
    return new Response(null, { status: 200, headers });
  }
  const options: R2GetOptions = request.headers.has("Range") ? { range: request.headers, onlyIf: request.headers } : { onlyIf: request.headers };
  const object = await env.LISTENING_AUDIO.get(key, options);
  if (!object) return json({ error: "audio_not_found" }, 404);
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("etag", object.httpEtag); headers.set("accept-ranges", "bytes"); headers.set("cache-control", "public, max-age=86400");
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  const range = resolveObjectRange(object.range, object.size);
  const status = range ? 206 : 200;
  if (range) { headers.set("content-range", `bytes ${range.start}-${range.start + range.length - 1}/${object.size}`); headers.set("content-length", String(range.length)); }
  else headers.set("content-length", String(object.size));
  return new Response(object.body, { status, headers });
}

async function getProgress(env: Env, session: ListeningSession | null, url: URL) {
  if (!session) return json({ error: "unauthorized" }, 401); const lessonId = validId(url.searchParams.get("lesson")); if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  const sql = sqlFor(env); const lessonRows = await sql`SELECT current_sentence_position,completed_sentence_count,is_completed,updated_at,completed_at FROM listening_lesson_progress WHERE user_id=${session.id} AND lesson_id=${lessonId}`;
  const sentenceRows = await sql`SELECT sp.sentence_id,sp.attempt_count,sp.is_completed,sp.first_try_correct,sp.completed_at FROM listening_sentence_progress sp JOIN listening_sentences s ON s.id=sp.sentence_id WHERE sp.user_id=${session.id} AND s.lesson_id=${lessonId}`;
  return json({ lesson: lessonRows[0] ?? null, sentences: sentenceRows });
}

async function saveProgress(request: Request, env: Env, session: ListeningSession | null) {
  if (!session) return json({ error: "unauthorized" }, 401);
  let body: Record<string, unknown>;
  try { body = await boundedJson<Record<string, unknown>>(request); }
  catch (error) { return error instanceof RequestBodyError ? json({ error: error.message }, error.status) : json({ error: "invalid_json" }, 400); }
  const lessonId = typeof body.lessonId === "string" ? validId(body.lessonId) : null, sentenceId = typeof body.sentenceId === "string" ? validId(body.sentenceId) : null;
  const position = Number.isInteger(body.position) && Number(body.position) > 0 && Number(body.position) <= 1000 ? Number(body.position) : null;
  const attemptCount = Number.isInteger(body.attemptCount) && Number(body.attemptCount) > 0 && Number(body.attemptCount) <= 1000 ? Number(body.attemptCount) : null;
  const firstTryCorrect = typeof body.firstTryCorrect === "boolean" ? body.firstTryCorrect : null;
  if (!lessonId || !sentenceId || !position || !attemptCount || firstTryCorrect === null) return json({ error: "invalid_progress" }, 422);
  const sql = sqlFor(env), validRows = await sql`SELECT 1 FROM listening_sentences WHERE id=${sentenceId} AND lesson_id=${lessonId} AND position=${position}`; if (!validRows.length) return json({ error: "invalid_progress" }, 422);
  await sql`
    WITH saved_sentence AS (
      INSERT INTO listening_sentence_progress(user_id,sentence_id,attempt_count,is_completed,first_try_correct,completed_at)
      VALUES(${session.id},${sentenceId},${attemptCount},true,${firstTryCorrect},now())
      ON CONFLICT(user_id,sentence_id) DO UPDATE SET
        attempt_count=GREATEST(listening_sentence_progress.attempt_count,EXCLUDED.attempt_count),
        is_completed=true,
        first_try_correct=COALESCE(listening_sentence_progress.first_try_correct,EXCLUDED.first_try_correct),
        updated_at=now(),
        completed_at=COALESCE(listening_sentence_progress.completed_at,now())
      RETURNING sentence_id
    ), counts AS (
      SELECT COUNT(*)::int AS completed_count,
        (SELECT sentence_count::int FROM listening_lessons WHERE id=${lessonId}) AS total
      FROM (
        SELECT sp.sentence_id
        FROM listening_sentence_progress sp
        JOIN listening_sentences s ON s.id=sp.sentence_id
        WHERE sp.user_id=${session.id} AND s.lesson_id=${lessonId} AND sp.is_completed=true
        UNION
        SELECT sentence_id FROM saved_sentence
      ) completed_sentences
    ), saved_lesson AS (
      INSERT INTO listening_lesson_progress(user_id,lesson_id,current_sentence_position,completed_sentence_count,is_completed,completed_at)
      SELECT ${session.id},${lessonId},LEAST(counts.total,${position + 1}),counts.completed_count,counts.completed_count>=counts.total,
        CASE WHEN counts.completed_count>=counts.total THEN now() ELSE NULL END
      FROM counts CROSS JOIN saved_sentence
      ON CONFLICT(user_id,lesson_id) DO UPDATE SET
        current_sentence_position=GREATEST(listening_lesson_progress.current_sentence_position,EXCLUDED.current_sentence_position),
        completed_sentence_count=EXCLUDED.completed_sentence_count,
        is_completed=EXCLUDED.is_completed,
        updated_at=now(),
        completed_at=COALESCE(listening_lesson_progress.completed_at,EXCLUDED.completed_at)
      RETURNING lesson_id
    ) SELECT lesson_id FROM saved_lesson`;
  return json({ ok: true });
}

async function getAdminBootstrap(env: Env) {
  const rows = await sqlFor(env)`SELECT l.code AS language_code,c.id AS category_id,c.name AS category_name,s.id AS section_id,s.title AS section_title FROM languages l JOIN listening_categories c ON c.language_id=l.id JOIN listening_sections s ON s.category_id=c.id WHERE l.is_enabled=true ORDER BY l.sort_order,c.sort_order,s.sort_order`;
  return json({ sections: rows });
}

async function getAdminLessons(env: Env, url: URL) {
  const query = url.searchParams.get("q")?.trim() ?? "", language = url.searchParams.get("language") ?? "all", status = url.searchParams.get("status") ?? "all";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100));
  const sql = sqlFor(env);
  const rows = await sql`SELECT l.id,l.slug,l.title,l.description,l.level,l.duration_ms,l.sentence_count,l.sort_order,l.is_published,l.updated_at,l.audio_key,c.slug AS category_slug,c.name AS category_name,s.id AS section_id,s.title AS section_title,lang.code AS language_code FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE (${query}='' OR l.title ILIKE ${`%${query}%`} OR l.slug ILIKE ${`%${query}%`}) AND (${language}='all' OR lang.code=${language}) AND (${status}='all' OR (${status}='published' AND l.is_published=true) OR (${status}='draft' AND l.is_published=false)) ORDER BY lang.code,c.sort_order,s.sort_order,l.sort_order,l.title LIMIT ${limit}`;
  return json({ lessons: rows.map((row) => ({ ...row, path: lessonPath(String(row.level ?? "all"), String(row.category_slug), String(row.slug)) })) });
}

async function getAdminLesson(env: Env, url: URL) {
  const lessonId = validId(url.pathname.slice("/api/listening/admin/lessons/".length)); if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  const sql = sqlFor(env);
  const rows = await sql`SELECT l.id,l.slug,l.title,l.description,l.level,l.duration_ms,l.sentence_count,l.sort_order,l.is_published,l.updated_at,l.audio_key,c.slug AS category_slug,c.name AS category_name,s.id AS section_id,s.title AS section_title,lang.code AS language_code FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE l.id=${lessonId}`;
  if (!rows.length) return json({ error: "not_found" }, 404);
  const sentences = await sql`SELECT id,position,transcript AS text,start_ms AS "startMs",end_ms AS "endMs" FROM listening_sentences WHERE lesson_id=${lessonId} ORDER BY position`;
  return json({ lesson: { ...rows[0], path: lessonPath(String(rows[0].level ?? "all"), String(rows[0].category_slug), String(rows[0].slug)), sentences } });
}

async function importLesson(request: Request, env: Env, session: ListeningSession) {
  const length = Number(request.headers.get("content-length") ?? 0); if (!Number.isFinite(length) || length <= 0) return json({ error: "content_length_required" }, 411); if (length > MAX_AUDIO_BYTES + 256 * 1024) return json({ error: "upload_too_large" }, 413);
  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ error: "invalid_multipart_form" }, 400); }
  const audio = form.get("audio"), transcript = form.get("transcript"), sectionId = form.get("sectionId"), title = form.get("title"), level = form.get("level"), durationRaw = form.get("durationMs"), importMode = form.get("importMode") === "pre_timed" ? "pre_timed" : "ai", srt = form.get("srt") ?? form.get("timing");
  const durationMs = typeof durationRaw === "string" ? Number(durationRaw) : NaN;
  if (!(audio instanceof File) || audio.size <= 0 || audio.size > MAX_AUDIO_BYTES || !["audio/mpeg","audio/mp3","audio/wav","audio/x-wav","audio/mp4","audio/ogg","audio/webm"].includes(audio.type)) return json({ error: "invalid_audio" }, 422);
  if (typeof transcript !== "string" || !transcript.trim() || transcript.length > 50_000 || typeof sectionId !== "string" || !validId(sectionId) || typeof title !== "string" || !title.trim() || title.length > 200 || typeof level !== "string" || level.length > 30 || !Number.isInteger(durationMs) || durationMs <= 0 || durationMs > 3_600_000) return json({ error: "invalid_import_metadata" }, 422);
  const slug = slugifyTitle(title.trim()); if (!slug) return json({ error: "title_cannot_create_slug" }, 422);
  const sql = sqlFor(env), sectionRows = await sql`SELECT s.id,c.slug AS category_slug,l.code AS language_code FROM listening_sections s JOIN listening_categories c ON c.id=s.category_id JOIN languages l ON l.id=c.language_id WHERE s.id=${sectionId} AND l.is_enabled=true`; if (!sectionRows.length) return json({ error: "invalid_section" }, 422);
  const canonicalPath = lessonPath(level || "all", String(sectionRows[0].category_slug), slug);
  const duplicateRows = await sql`SELECT 1 FROM listening_canonical_paths WHERE path=${canonicalPath} LIMIT 1`; if (duplicateRows.length) return json({ error: "lesson_canonical_path_exists" }, 409);
  const languageCode = String(sectionRows[0].language_code), lessonId = crypto.randomUUID(), jobId = crypto.randomUUID(), extension = audio.name.toLocaleLowerCase().split(".").at(-1)?.replace(/[^a-z0-9]/gu, "") || "mp3", audioKey = `listening/${languageCode}/lessons/${lessonId}/audio.${extension}`;
  let sentences: AlignedSentence[];
  if (typeof form.get("importMode") === "string" && form.get("importMode") !== "ai" && form.get("importMode") !== "pre_timed") return json({ error: "invalid_import_mode" }, 422);
  try { sentences = importMode === "pre_timed" ? parsePreTimedSrt(typeof srt === "string" ? srt : "", transcript) : await alignLessonImport(env, audio, transcript, durationMs); if (importMode === "pre_timed") { const errors = validateAlignedSentences(sentences, durationMs); if (errors.length) throw new Error(errors.join(",")); } }
  catch (error) {
    console.error(JSON.stringify({ event: "listening_import_alignment_failed", jobId, message: error instanceof Error ? error.message.slice(0, 500) : "unknown" }));
    return importMode === "pre_timed" ? json({ error: "pre_timed_validation_failed", details: error instanceof Error ? error.message : "invalid_timing" }, 422) : alignmentErrorResponse(error);
  }
  try {
    await env.LISTENING_AUDIO.put(audioKey, audio, { httpMetadata: { contentType: audio.type, cacheControl: "public, max-age=86400" } });
    const importQueries: TransactionQuery[] = [
      sql`INSERT INTO listening_import_jobs(id,created_by,status,source_audio_key,source_transcript) VALUES(${jobId},${session.id},'ALIGNING',${audioKey},${transcript.trim()})`,
      sql`INSERT INTO listening_lessons(id,section_id,slug,title,level,audio_key,duration_ms,sentence_count,metadata,sort_order,is_published,import_job_id) VALUES(${lessonId},${sectionId},${slug},${title.trim()},${level||null},${audioKey},${durationMs},${sentences.length},${JSON.stringify({alignmentProvider:importMode === "pre_timed" ? "srt-script" : "workers-ai-whisper"})}::jsonb,999,false,${jobId})`,
      sql`INSERT INTO listening_canonical_paths(path,lesson_id) VALUES(${canonicalPath},${lessonId})`,
      ...sentences.map(sentence => sql`INSERT INTO listening_sentences(id,lesson_id,position,transcript,normalized_transcript,start_ms,end_ms,metadata) VALUES(${crypto.randomUUID()},${lessonId},${sentence.position},${sentence.text},${getNormalizer(languageCode as "en"|"zh"|"ja").normalize(sentence.text)},${sentence.startMs},${sentence.endMs},${JSON.stringify({confidence:sentence.confidence??null})}::jsonb)`),
      sql`UPDATE listening_import_jobs SET lesson_id=${lessonId},status='READY_FOR_REVIEW',updated_at=now() WHERE id=${jobId}`,
      sql`UPDATE listening_manifest_meta SET version=version+1,updated_at=now() WHERE id=true`,
    ];
    await sql.transaction(importQueries);
    const reviewRows = await sql`SELECT id,position,transcript AS text,start_ms AS "startMs",end_ms AS "endMs" FROM listening_sentences WHERE lesson_id=${lessonId} ORDER BY position`;
    return json({ jobId, lessonId, status: "READY_FOR_REVIEW", sentences: reviewRows });
  } catch (error) {
    console.error(JSON.stringify({ event: "listening_import_persistence_failed", lessonId, jobId, message: error instanceof Error ? error.message.slice(0, 500) : "unknown" }));
    const cleanupComplete = await cleanupFailedImport(env, sql, { lessonId, jobId, audioKey });
    if (!cleanupComplete) return json({ error: "import_cleanup_failed", requestId: jobId }, 500);
    return postgresErrorCode(error) === "23505" ? json({ error: "lesson_canonical_path_exists" }, 409) : json({ error: "import_failed" }, 500);
  }
}

async function reviewLesson(request: Request, env: Env, url: URL) {
  const lessonId = validId(url.pathname.slice("/api/listening/admin/lessons/".length).replace(/\/review$/u, "")); if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  let body: Record<string, unknown>;
  try { body = await boundedJson<Record<string, unknown>>(request); }
  catch (error) { return error instanceof RequestBodyError ? json({ error: error.message }, error.status) : json({ error: "invalid_json" }, 400); }
  if (!Array.isArray(body.sentences) || body.sentences.length < 1 || body.sentences.length > 1000 || typeof body.publish !== "boolean") return json({ error: "invalid_review" }, 422);
  const sentences: Array<AlignedSentence & { id: string }> = [];
  for (const raw of body.sentences) { if (!raw || typeof raw !== "object") return json({ error: "invalid_review" }, 422); const item = raw as Record<string,unknown>; if (typeof item.id !== "string" || !validId(item.id) || typeof item.text !== "string" || !item.text.trim() || !Number.isInteger(item.position) || !Number.isInteger(item.startMs) || !Number.isInteger(item.endMs)) return json({ error: "invalid_review" }, 422); sentences.push({ id:item.id, text:item.text.trim(), position:Number(item.position), startMs:Number(item.startMs), endMs:Number(item.endMs) }); }
  const sql = sqlFor(env), lessonRows = await sql`SELECT duration_ms,audio_key,import_job_id FROM listening_lessons WHERE id=${lessonId} AND is_published=false`; if (!lessonRows.length) return json({ error: "not_found" }, 404);
  const languageRows = await sql`SELECT lang.code AS language_code FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE l.id=${lessonId}`;
  const languageCode = String(languageRows[0]?.language_code ?? "en") as "en"|"zh"|"ja";
  const existingRows=await sql`SELECT id FROM listening_sentences WHERE lesson_id=${lessonId}`;const existingIds=new Set(existingRows.map(row=>String(row.id)));if(existingIds.size!==sentences.length||sentences.some(sentence=>!existingIds.has(sentence.id)))return json({error:"sentence_set_mismatch"},422);
  const errors = validateAlignedSentences(sentences, Number(lessonRows[0].duration_ms)); if (errors.length) return json({ error: "validation_failed", details: errors }, 422);
  if (body.publish && !(await env.LISTENING_AUDIO.head(String(lessonRows[0].audio_key)))) return json({ error: "audio_missing" }, 422);
  const reviewQueries: TransactionQuery[] = sentences.map(sentence => sql`UPDATE listening_sentences SET position=${sentence.position},transcript=${sentence.text},normalized_transcript=${getNormalizer(languageCode).normalize(sentence.text)},start_ms=${sentence.startMs},end_ms=${sentence.endMs},updated_at=now() WHERE id=${sentence.id} AND lesson_id=${lessonId}`);
  reviewQueries.push(sql`UPDATE listening_lessons SET sentence_count=${sentences.length},is_published=${body.publish},updated_at=now() WHERE id=${lessonId}`);
  if (body.publish) reviewQueries.push(sql`UPDATE listening_import_jobs SET status='PUBLISHED',updated_at=now() WHERE id=${lessonRows[0].import_job_id}`);
  reviewQueries.push(sql`UPDATE listening_manifest_meta SET version=version+1,updated_at=now() WHERE id=true`);
  await sql.transaction(reviewQueries);
  return json({ ok: true, published: body.publish });
}

async function updateLesson(request: Request, env: Env, url: URL) {
  const lessonId = validId(url.pathname.slice("/api/listening/admin/lessons/".length)); if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  let body: Record<string, unknown>;
  try { body = await boundedJson<Record<string, unknown>>(request); }
  catch (error) { return error instanceof RequestBodyError ? json({ error: error.message }, error.status) : json({ error: "invalid_json" }, 400); }
  const sql = sqlFor(env);
  const currentRows = await sql`SELECT l.id,l.slug,l.title,l.level,l.description,l.sort_order,l.is_published,l.audio_key,l.duration_ms,l.section_id,c.slug AS category_slug,lang.code AS language_code FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE l.id=${lessonId}`;
  const current = currentRows[0]; if (!current) return json({ error: "not_found" }, 404);
  const title = typeof body.title === "string" ? body.title.trim() : String(current.title), slug = typeof body.slug === "string" ? slugifyTitle(body.slug) : String(current.slug);
  if (!title || title.length > 200 || !slug) return json({ error: "invalid_lesson_metadata" }, 422);
  const level = typeof body.level === "string" ? body.level.trim().slice(0, 30) : String(current.level ?? ""), description = body.description === null || typeof body.description === "string" ? body.description : current.description;
  const sortOrder = Number.isInteger(body.sortOrder) && Number(body.sortOrder) >= 0 && Number(body.sortOrder) <= 100000 ? Number(body.sortOrder) : null;
  const sectionId = typeof body.sectionId === "string" && validId(body.sectionId) ? body.sectionId : null;
  const targetSection = sectionId ?? String(current.section_id);
  const sectionRows = await sql`SELECT s.id,c.slug AS category_slug,lang.code AS language_code FROM listening_sections s JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE s.id=${targetSection} AND lang.is_enabled=true`;
  if (!sectionRows.length) return json({ error: "invalid_section" }, 422);
  const rawSentences = body.sentences;
  let sentences: Array<{ id: string; position: number; text: string; startMs: number; endMs: number }> | null = null;
  if (rawSentences !== undefined) {
    if (!Array.isArray(rawSentences) || !rawSentences.length || rawSentences.length > 1000) return json({ error: "invalid_sentences" }, 422);
    sentences = [];
    for (const raw of rawSentences) { if (!raw || typeof raw !== "object") return json({ error: "invalid_sentences" }, 422); const item = raw as Record<string, unknown>; if (typeof item.id !== "string" || !validId(item.id) || typeof item.text !== "string" || !item.text.trim() || !Number.isInteger(item.position) || !Number.isInteger(item.startMs) || !Number.isInteger(item.endMs)) return json({ error: "invalid_sentences" }, 422); sentences.push({ id: item.id, position: Number(item.position), text: item.text.trim(), startMs: Number(item.startMs), endMs: Number(item.endMs) }); }
    const errors = validateAlignedSentences(sentences, Number(current.duration_ms)); if (errors.length) return json({ error: "validation_failed", details: errors }, 422);
    const existingRows = await sql`SELECT id FROM listening_sentences WHERE lesson_id=${lessonId}`; const existingIds = new Set(existingRows.map((row) => String(row.id))); if (existingIds.size !== sentences.length || sentences.some((sentence) => !existingIds.has(sentence.id))) return json({ error: "sentence_set_mismatch" }, 422);
  }
  const oldPath = lessonPath(String(current.level ?? "all"), String(current.category_slug), String(current.slug));
  const newPath = lessonPath(level ?? String(current.level ?? "all"), String(sectionRows[0].category_slug), slug);
  const duplicateRows = await sql`SELECT 1 FROM listening_canonical_paths WHERE path=${newPath} AND lesson_id<>${lessonId} LIMIT 1`; if (duplicateRows.length) return json({ error: "lesson_canonical_path_exists" }, 409);
  const queries: TransactionQuery[] = [];
  if (current.is_published && oldPath !== newPath) queries.push(sql`INSERT INTO listening_lesson_redirects(old_path,lesson_id) VALUES(${oldPath},${lessonId}) ON CONFLICT(old_path) DO UPDATE SET lesson_id=EXCLUDED.lesson_id`);
  queries.push(sql`UPDATE listening_lessons SET section_id=${targetSection},slug=${slug},title=${title},description=${description},level=${level},sort_order=${sortOrder ?? Number(current.sort_order)},updated_at=now() WHERE id=${lessonId}`);
  queries.push(sql`INSERT INTO listening_canonical_paths(path,lesson_id) VALUES(${newPath},${lessonId}) ON CONFLICT(lesson_id) DO UPDATE SET path=EXCLUDED.path,updated_at=now()`);
  const normalizerLanguage = String(sectionRows[0].language_code ?? "en") as "en"|"zh"|"ja";
  if (sentences) for (const sentence of sentences) queries.push(sql`UPDATE listening_sentences SET position=${sentence.position},transcript=${sentence.text},normalized_transcript=${getNormalizer(normalizerLanguage).normalize(sentence.text)},start_ms=${sentence.startMs},end_ms=${sentence.endMs},updated_at=now() WHERE id=${sentence.id} AND lesson_id=${lessonId}`);
  queries.push(sql`UPDATE listening_manifest_meta SET version=version+1,updated_at=now() WHERE id=true`);
  try { await sql.transaction(queries); } catch (error) { return postgresErrorCode(error) === "23505" ? json({ error: "lesson_canonical_path_exists" }, 409) : json({ error: "lesson_update_failed" }, 500); }
  return json({ ok: true, path: newPath });
}

async function deleteLesson(env: Env, url: URL) {
  const lessonId = validId(url.pathname.slice("/api/listening/admin/lessons/".length)); if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  const sql = sqlFor(env), rows = await sql`SELECT id,audio_key,import_job_id FROM listening_lessons WHERE id=${lessonId}`; const lesson = rows[0]; if (!lesson) return json({ error: "not_found" }, 404);
  const audioKey = lesson.audio_key ? String(lesson.audio_key) : null;
  let audioBackup: { body: ArrayBuffer; httpMetadata?: R2HTTPMetadata; customMetadata?: Record<string,string> } | null = null;
  if (audioKey) {
    try {
      const object = await env.LISTENING_AUDIO.get(audioKey);
      if (object) audioBackup = { body: await object.arrayBuffer(), httpMetadata: object.httpMetadata, customMetadata: object.customMetadata };
      await env.LISTENING_AUDIO.delete(audioKey);
    } catch { return json({ error: "resource_cleanup_failed", requestId: lessonId }, 500); }
  }
  try {
    await sql.transaction([
      sql`DELETE FROM listening_sentences WHERE lesson_id=${lessonId}`,
      sql`DELETE FROM listening_lesson_progress WHERE lesson_id=${lessonId}`,
      sql`DELETE FROM listening_lessons WHERE id=${lessonId}`,
      sql`DELETE FROM listening_import_jobs WHERE id=${lesson.import_job_id}`,
      sql`DELETE FROM listening_lesson_redirects WHERE lesson_id=${lessonId}`,
      sql`UPDATE listening_manifest_meta SET version=version+1,updated_at=now() WHERE id=true`,
    ]);
  } catch {
    if (audioKey && audioBackup) {
      try { await env.LISTENING_AUDIO.put(audioKey, audioBackup.body, { httpMetadata: audioBackup.httpMetadata, customMetadata: audioBackup.customMetadata }); }
      catch (restoreError) { console.error(JSON.stringify({ event:"lesson_delete_audio_restore_failed",lessonId,audioKey,message:restoreError instanceof Error?restoreError.message:"unknown" })); return json({ error:"lesson_delete_rollback_failed",requestId:lessonId },500); }
    }
    return json({ error: "lesson_delete_failed" }, 500);
  }
  return json({ ok: true });
}

async function cleanupFailedImport(env: Env, sql: ReturnType<typeof sqlFor>, resources: { lessonId: string; jobId: string; audioKey: string }): Promise<boolean> {
  const { lessonId, jobId, audioKey } = resources;
  try {
    const cleanupQueries: TransactionQuery[] = [
      sql`DELETE FROM listening_sentences WHERE lesson_id=${lessonId}`,
      sql`DELETE FROM listening_lessons WHERE id=${lessonId}`,
      sql`DELETE FROM listening_import_jobs WHERE id=${jobId}`,
    ];
    await sql.transaction(cleanupQueries);
  } catch (error) {
    console.error(JSON.stringify({ event: "listening_import_database_cleanup_failed", lessonId, jobId, message: error instanceof Error ? error.message : "unknown" }));
    for (const [resource, query] of [
      ["sentences", sql`DELETE FROM listening_sentences WHERE lesson_id=${lessonId}`],
      ["lesson", sql`DELETE FROM listening_lessons WHERE id=${lessonId}`],
      ["job", sql`DELETE FROM listening_import_jobs WHERE id=${jobId}`],
    ] as const) {
      try { await query; }
      catch (fallbackError) { console.error(JSON.stringify({ event: "listening_import_database_fallback_cleanup_failed", resource, lessonId, jobId, message: fallbackError instanceof Error ? fallbackError.message : "unknown" })); }
    }
  }

  try { await env.LISTENING_AUDIO.delete(audioKey); }
  catch (error) { console.error(JSON.stringify({ event: "listening_import_audio_cleanup_failed", audioKey, message: error instanceof Error ? error.message : "unknown" })); }

  try {
    const rows = await sql`SELECT EXISTS(SELECT 1 FROM listening_sentences WHERE lesson_id=${lessonId}) OR EXISTS(SELECT 1 FROM listening_lessons WHERE id=${lessonId}) OR EXISTS(SELECT 1 FROM listening_import_jobs WHERE id=${jobId}) AS has_database_resources`;
    const audioExists = await env.LISTENING_AUDIO.head(audioKey);
    const complete = rows[0]?.has_database_resources !== true && audioExists === null;
    if (!complete) console.error(JSON.stringify({ event: "listening_import_cleanup_incomplete", lessonId, jobId, audioKey, databaseResourcesRemain: rows[0]?.has_database_resources === true, audioRemains: audioExists !== null }));
    return complete;
  } catch (error) {
    console.error(JSON.stringify({ event: "listening_import_cleanup_verification_failed", lessonId, jobId, audioKey, message: error instanceof Error ? error.message : "unknown" }));
    return false;
  }
}

function postgresErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function alignmentErrorResponse(error: unknown): Response {
  const code = error instanceof Error ? error.message : "alignment_failed";
  if (code === "workers_ai_not_configured" || code === "workers_ai_model_invalid") return json({ error: code }, 503);
  if (code.startsWith("workers_ai_")) return json({ error: "workers_ai_failed" }, 502);
  return json({ error: "alignment_failed" }, 422);
}

async function boundedJson<T>(request: Request): Promise<T> { if(!request.body)throw new RequestBodyError("missing_body",400);const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;while(true){const{value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_JSON_BYTES){await reader.cancel();throw new RequestBodyError("body_too_large",413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return JSON.parse(new TextDecoder().decode(bytes)) as T; }
