import { neon } from "@neondatabase/serverless";
import { unzipSync, zipSync } from "fflate";
import { validateAlignedSentences, type AlignedSentence } from "../src/lib/ingestion";
import { normalizeOptionalLevel } from "../src/lib/importMetadata";
import { allocateImportCandidateSlugs, describeImportResource, NON_AI_IMPORT_LIMITS, pairImportResources, parseNonAiSrt } from "../src/lib/nonAiImport";
import { getNormalizer } from "../src/lib/dictation";
import { slugifyTitle, uniqueSlug } from "../src/lib/slug";
import { alignLessonImport } from "./listening-import";
import { routeListeningTranslations, scheduleAutomaticTranslations } from "./listening-translations";

export interface ListeningSession { id: string; email: string; }
const MAX_AUDIO_BYTES = NON_AI_IMPORT_LIMITS.maxAudioBytes;
const MAX_JSON_BYTES = 128 * 1024;
const MAX_BATCH_REQUEST_BYTES = NON_AI_IMPORT_LIMITS.maxArchiveBytes + 2 * 1024 * 1024;
const BATCH_ITEM_STALE_SECONDS = 10 * 60;
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

export async function routeListening(request: Request, env: Env, url: URL, session: ListeningSession | null, mutationValid: boolean, ctx:ExecutionContext): Promise<Response> {
  const translationResponse=await routeListeningTranslations(request,env,url,session,isAdmin(env,session),mutationValid,ctx);if(translationResponse)return translationResponse;
  if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith("/api/listening/audio/")) return serveAudio(request, env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/categories") return getCategories(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/sections") return getSections(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/manifest") return getManifest(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/lessons") return getLessons(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/lessons/by-path") return getLessonByPath(env, url);
  if (request.method === "GET" && /^\/api\/listening\/lessons\/[\w-]+$/u.test(url.pathname)) return getLesson(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/lesson-states") return getLessonStates(env, session, url);
  if (request.method === "GET" && url.pathname === "/api/listening/progress") return getProgress(env, session, url);
  if (request.method === "POST" && url.pathname === "/api/listening/progress") return mutationValid ? saveProgress(request, env, session) : json({ error: session ? "invalid_csrf" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "DELETE" && url.pathname === "/api/listening/progress") return mutationValid ? resetProgress(request, env, session) : json({ error: session ? "invalid_csrf" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "DELETE" && url.pathname === "/api/listening/progress/lesson") return mutationValid ? resetLessonProgress(request, env, session) : json({ error: session ? "invalid_csrf" : "unauthorized" }, session ? 403 : 401);
  if ((request.method === "PUT" || request.method === "DELETE") && /^\/api\/listening\/lessons\/[\w-]+\/favorite$/u.test(url.pathname)) return mutationValid ? setLessonFavorite(request, env, session, url) : json({ error: session ? "invalid_csrf" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "GET" && url.pathname === "/api/listening/admin/bootstrap") return isAdmin(env, session) ? getAdminBootstrap(env) : json({ error: "forbidden" }, 403);
  if (request.method === "POST" && url.pathname === "/api/listening/admin/sections") return isAdmin(env, session) && mutationValid ? createAdminSection(request, env) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "GET" && url.pathname === "/api/listening/admin/lessons") return isAdmin(env, session) ? getAdminLessons(env, url) : json({ error: "forbidden" }, 403);
  if (request.method === "GET" && /^\/api\/listening\/admin\/lessons\/[\w-]+$/u.test(url.pathname)) return isAdmin(env, session) ? getAdminLesson(env, url) : json({ error: "forbidden" }, 403);
  if (request.method === "POST" && url.pathname === "/api/listening/admin/import") return isAdmin(env, session) && mutationValid ? importLesson(request, env, session!) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "POST" && url.pathname === "/api/listening/admin/import-batches/validate") return isAdmin(env, session) && mutationValid ? validateImportBatch(request, env, session!) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "GET" && /^\/api\/listening\/admin\/import-batches\/[\w-]+$/u.test(url.pathname)) return isAdmin(env, session) ? getImportBatch(env, session!, url) : json({ error: "forbidden" }, 403);
  if (request.method === "POST" && /^\/api\/listening\/admin\/import-batches\/[\w-]+\/confirm$/u.test(url.pathname)) return isAdmin(env, session) && mutationValid ? confirmImportBatch(env, session!, url) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "POST" && /^\/api\/listening\/admin\/import-batches\/[\w-]+\/items\/[\w-]+\/process$/u.test(url.pathname)) return isAdmin(env, session) && mutationValid ? processImportBatchItem(env, session!, url,ctx) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "PATCH" && /^\/api\/listening\/admin\/lessons\/[\w-]+\/review$/u.test(url.pathname)) return isAdmin(env, session) && mutationValid ? reviewLesson(request, env, url,ctx,session!) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "PATCH" && /^\/api\/listening\/admin\/lessons\/[\w-]+$/u.test(url.pathname)) return isAdmin(env, session) && mutationValid ? updateLesson(request, env, url,ctx,session!) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "DELETE" && url.pathname === "/api/listening/admin/lessons") return isAdmin(env, session) && mutationValid ? deleteLessons(request, env) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
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
  const rows = await sql`SELECT l.id,l.slug,l.title,l.level,l.sentence_count,l.sort_order,l.updated_at,p.path,c.slug AS category_slug,c.name AS category_name,s.id AS section_id,s.number AS section_number,s.title AS section_title,lang.code AS language_code FROM listening_canonical_paths p JOIN listening_lessons l ON l.id=p.lesson_id JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE l.is_published=true AND s.is_published=true AND c.is_published=true AND lang.is_enabled=true ORDER BY lang.sort_order,c.sort_order,s.sort_order,l.sort_order,l.title`;
  return json({ version, lessons: rows.map((row) => ({ id: row.id, name: row.title, slug: row.slug, path: row.path, parentId: `${row.language_code}-${row.section_id}`, language: row.language_code, level: row.level, categorySlug: row.category_slug, categoryName: row.category_name, sectionId: row.section_id, sectionNumber: row.section_number, sectionTitle: row.section_title, order: row.sort_order, sentenceCount: row.sentence_count, updatedAt: row.updated_at })) }, 200, false);
}

async function getLesson(env: Env, url: URL) {
  const id = validId(decodeURIComponent(url.pathname.slice("/api/listening/lessons/".length))); if (!id) return json({ error: "invalid_lesson" }, 422);
  const rows = await sqlFor(env)`SELECT l.id,l.slug,l.title,l.description,l.level,l.audio_key,l.duration_ms,l.sentence_count,l.thumbnail_key,l.metadata,c.slug AS category_slug,s.id AS section_id,s.number AS section_number,lang.code AS language_code FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE (l.id=${id} OR l.slug=${id}) AND lang.is_enabled=true AND c.is_published=true AND s.is_published=true AND l.is_published=true`;
  const lesson = rows[0]; if (!lesson) return json({ error: "not_found" }, 404);
  const sentences = await sqlFor(env)`SELECT id,position,transcript,start_ms,end_ms,metadata FROM listening_sentences WHERE lesson_id=${lesson.id} ORDER BY position`;
  return json({ lesson: serializeLesson(lesson, sentences) }, 200, true);
}

async function getLessonByPath(env: Env, url: URL) {
  const level = url.searchParams.get("level"), category = url.searchParams.get("category"), slug = url.searchParams.get("slug");
  if (!level || !category || !slug || !validPathPart(level) || !validPathPart(category) || !validPathPart(slug)) return json({ error: "invalid_lesson_path" }, 422);
  const sql = sqlFor(env);
  const path = lessonPath(level, category, slug);
  const rows = await sql`SELECT l.id,l.slug,l.title,l.description,l.level,l.audio_key,l.duration_ms,l.sentence_count,l.thumbnail_key,l.metadata,c.slug AS category_slug,s.id AS section_id,s.number AS section_number,lang.code AS language_code FROM listening_canonical_paths p JOIN listening_lessons l ON l.id=p.lesson_id JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE p.path=${path} AND lang.is_enabled=true AND c.is_published=true AND s.is_published=true AND l.is_published=true`;
  const lesson = rows[0]; if (!lesson) return json({ error: "not_found" }, 404);
  const sentences = await sql`SELECT id,position,transcript,start_ms,end_ms,metadata FROM listening_sentences WHERE lesson_id=${lesson.id} ORDER BY position`;
  return json({ lesson: serializeLesson(lesson, sentences) }, 200, true);
}

const seoLanguageNames: Record<string, string> = { en: "English", ja: "Japanese", zh: "Chinese" };

export async function serveSeoLibrary(request: Request, env: Env, url: URL): Promise<Response | null> {
  const parts = url.pathname.split("/").filter(Boolean).map((part) => { try { return decodeURIComponent(part); } catch { return ""; } });
  if ((parts.length !== 1 && parts.length !== 2) || !["en", "ja", "zh"].includes(parts[0]) || (parts[1] && !validPathPart(parts[1]))) return null;
  const [language, categorySlug] = parts, languageName = seoLanguageNames[language], sql = sqlFor(env);
  const canonical = new URL(url.pathname, request.url).toString();

  if (!categorySlug) {
    const categories = await sql`SELECT c.slug,c.name,c.description,COUNT(l.id)::int AS lesson_count FROM languages lang JOIN listening_categories c ON c.language_id=lang.id AND c.is_published=true LEFT JOIN listening_sections s ON s.category_id=c.id AND s.is_published=true LEFT JOIN listening_lessons l ON l.section_id=s.id AND l.is_published=true WHERE lang.code=${language} AND lang.is_enabled=true GROUP BY c.id ORDER BY c.sort_order,c.name`;
    const links = categories.map((row) => `<li><a href="/${language}/${escapeHtml(String(row.slug))}"><h2>${escapeHtml(String(row.name))}</h2>${row.description?`<p>${escapeHtml(String(row.description))}</p>`:""}<p>${Number(row.lesson_count)} lessons</p></a></li>`).join("");
    const content = `<main class="seo-library"><h1>${escapeHtml(languageName)} listening lessons</h1><p>Practice listening and dictation by topic.</p>${links?`<ul>${links}</ul>`:"<p>Lessons are coming soon.</p>"}</main>`;
    return seoHtml(request, env, { title: `${languageName} listening lessons`, description: `Practice ${languageName} listening and dictation with lessons organized by topic.`, canonical, content, language });
  }

  const categoryRows = await sql`SELECT c.id,c.name,c.description FROM languages lang JOIN listening_categories c ON c.language_id=lang.id WHERE lang.code=${language} AND lang.is_enabled=true AND c.slug=${categorySlug} AND c.is_published=true LIMIT 1`;
  const category = categoryRows[0];
  if (!category) return seoHtml(request, env, { status: 404, title: "Topic not found", description: "This listening topic is not available.", language });
  const rows = await sql`SELECT s.id,s.number,s.title,l.title AS lesson_title,l.slug AS lesson_slug,l.level,l.sentence_count FROM listening_sections s LEFT JOIN listening_lessons l ON l.section_id=s.id AND l.is_published=true WHERE s.category_id=${category.id} AND s.is_published=true ORDER BY s.sort_order,s.number,l.sort_order,l.title`;
  const sections = new Map<string, { number: number; title: string; lessons: Record<string, unknown>[] }>();
  for (const row of rows) {
    const id = String(row.id), current = sections.get(id) ?? { number: Number(row.number), title: String(row.title), lessons: [] };
    if (row.lesson_slug) current.lessons.push(row);
    sections.set(id, current);
  }
  const sectionHtml = [...sections.values()].map((section) => `<section><h2>${escapeHtml(section.title || `Section ${section.number}`)}</h2>${section.lessons.length?`<ul>${section.lessons.map((lesson) => `<li><a href="${escapeHtml(lessonPath(String(lesson.level ?? "all"), categorySlug, String(lesson.lesson_slug)))}">${escapeHtml(String(lesson.lesson_title))}</a> <span>${escapeHtml(String(lesson.level ?? "All"))} · ${Number(lesson.sentence_count)} sentences</span></li>`).join("")}</ul>`:"<p>Lessons are coming soon.</p>"}</section>`).join("");
  const description = String(category.description ?? `${languageName} ${category.name} listening and dictation lessons.`).slice(0, 160);
  const content = `<main class="seo-library"><nav><a href="/${language}">${escapeHtml(languageName)} topics</a></nav><h1>${escapeHtml(String(category.name))}</h1><p>${escapeHtml(description)}</p>${sectionHtml || "<p>Lessons are coming soon.</p>"}</main>`;
  return seoHtml(request, env, { title: `${category.name} · ${languageName}`, description, canonical, content, language });
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
  const sql = sqlFor(env);
  const [rows, categories] = await Promise.all([
    sql`SELECT p.path,l.updated_at FROM listening_canonical_paths p JOIN listening_lessons l ON l.id=p.lesson_id JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE l.is_published=true AND s.is_published=true AND c.is_published=true AND lang.is_enabled=true ORDER BY l.updated_at DESC`,
    sql`SELECT lang.code,c.slug FROM languages lang JOIN listening_categories c ON c.language_id=lang.id WHERE lang.code IN ('en','ja','zh') AND lang.is_enabled=true AND c.is_published=true ORDER BY lang.sort_order,c.sort_order`,
  ]);
  const base = new URL(request.url).origin;
  const libraryUrls = ["en", "ja", "zh"].map((language) => `<url><loc>${escapeHtml(`${base}/${language}`)}</loc></url>`).join("") + categories.map((row) => `<url><loc>${escapeHtml(`${base}/${String(row.code)}/${String(row.slug)}`)}</loc></url>`).join("");
  const urls = libraryUrls + rows.map((row) => `<url><loc>${escapeHtml(`${base}${String(row.path)}`)}</loc><lastmod>${new Date(String(row.updated_at)).toISOString()}</lastmod></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}

export function serveRobots(request: Request): Response { return new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap.xml", request.url).toString()}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } }); }

async function seoHtml(request: Request, env: Env, options: { status?: number; title: string; description: string; canonical?: string; content?: string; language?: string }): Promise<Response> {
  const shellResponse = await env.ASSETS.fetch(new Request(new URL("/", request.url), request));
  let html = await shellResponse.text();
  html = html.replace(/<title>[^<]*<\/title>/u, `<title>${escapeHtml(options.title)} | Me2Listen</title>`).replace(/<meta name="description" content="[^"]*"\s*\/>/u, `<meta name="description" content="${escapeHtml(options.description)}" />`);
  if (options.language) html = html.replace(/<html lang="[^"]*">/u, `<html lang="${escapeHtml(options.language)}">`);
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
    const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("etag", object.httpEtag); headers.set("accept-ranges", "none"); headers.set("content-length", String(object.size)); headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(null, { status: 200, headers });
  }
  // Audio files are small and versioned by lesson UUID. Ignore Range deliberately so a cold playback streams one full R2 object in one 200 response.
  const object = await env.LISTENING_AUDIO.get(key, { onlyIf: request.headers });
  if (!object) return json({ error: "audio_not_found" }, 404);
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("etag", object.httpEtag); headers.set("accept-ranges", "none"); headers.set("cache-control", "public, max-age=31536000, immutable");
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  headers.set("content-length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}

async function getProgress(env: Env, session: ListeningSession | null, url: URL) {
  if (!session) return json({ error: "unauthorized" }, 401); const lessonId = validId(url.searchParams.get("lesson")); if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  const sql = sqlFor(env); const lessonRows = await sql`SELECT current_sentence_position,completed_sentence_count,is_completed,updated_at,completed_at FROM listening_lesson_progress WHERE user_id=${session.id} AND lesson_id=${lessonId}`;
  const sentenceRows = await sql`SELECT sp.sentence_id,sp.attempt_count,sp.is_completed,sp.first_try_correct,sp.completed_at FROM listening_sentence_progress sp JOIN listening_sentences s ON s.id=sp.sentence_id WHERE sp.user_id=${session.id} AND s.lesson_id=${lessonId}`;
  return json({ lesson: lessonRows[0] ?? null, sentences: sentenceRows });
}

async function getLessonStates(env: Env, session: ListeningSession | null, url: URL) {
  const language = url.searchParams.get("language") ?? "en";
  if (!(["en", "zh", "ja"] as const).includes(language as "en" | "zh" | "ja")) return json({ error: "invalid_language" }, 422);
  const userId = session?.id ?? "";
  const rows = await sqlFor(env)`
    SELECT lesson.id AS lesson_id,
      COALESCE(stars.star_count,0)::int AS star_count,
      (user_star.user_id IS NOT NULL) AS is_starred,
      COALESCE(progress.is_completed,false) AS is_completed
    FROM listening_lessons lesson
    JOIN listening_sections section ON section.id=lesson.section_id
    JOIN listening_categories category ON category.id=section.category_id
    JOIN languages source_language ON source_language.id=category.language_id
    LEFT JOIN (
      SELECT lesson_id,COUNT(*)::int AS star_count
      FROM listening_lesson_favorites
      GROUP BY lesson_id
    ) stars ON stars.lesson_id=lesson.id
    LEFT JOIN listening_lesson_favorites user_star ON user_star.lesson_id=lesson.id AND user_star.user_id=${userId}
    LEFT JOIN listening_lesson_progress progress ON progress.lesson_id=lesson.id AND progress.user_id=${userId}
    WHERE source_language.code=${language} AND source_language.is_enabled=true
      AND category.is_published=true AND section.is_published=true AND lesson.is_published=true
    ORDER BY category.sort_order,section.sort_order,lesson.sort_order,lesson.title`;
  return json({ lessons: rows.map(row => ({ lessonId:row.lesson_id,starCount:Number(row.star_count),isStarred:Boolean(row.is_starred),isCompleted:Boolean(row.is_completed) })) });
}

async function setLessonFavorite(request: Request, env: Env, session: ListeningSession | null, url: URL) {
  if (!session) return json({ error: "unauthorized" }, 401);
  const lessonId = validId(url.pathname.match(/^\/api\/listening\/lessons\/([\w-]+)\/favorite$/u)?.[1] ?? null);
  if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  const sql = sqlFor(env), lessonRows = await sql`SELECT 1 FROM listening_lessons WHERE id=${lessonId} AND is_published=true`;
  if (!lessonRows.length) return json({ error: "not_found" }, 404);
  if (request.method === "PUT") await sql`INSERT INTO listening_lesson_favorites(user_id,lesson_id) VALUES(${session.id},${lessonId}) ON CONFLICT(user_id,lesson_id) DO NOTHING`;
  else await sql`DELETE FROM listening_lesson_favorites WHERE user_id=${session.id} AND lesson_id=${lessonId}`;
  const countRows = await sql`SELECT COUNT(*)::int AS star_count FROM listening_lesson_favorites WHERE lesson_id=${lessonId}`;
  return json({ lessonId, starCount:Number(countRows[0]?.star_count ?? 0), isStarred:request.method === "PUT" });
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

async function resetProgress(request: Request, env: Env, session: ListeningSession | null) {
  if (!session) return json({ error: "unauthorized" }, 401);
  let body: Record<string, unknown>;
  try { body = await boundedJson<Record<string, unknown>>(request); }
  catch (error) { return error instanceof RequestBodyError ? json({ error: error.message }, error.status) : json({ error: "invalid_json" }, 400); }
  const lessonId = typeof body.lessonId === "string" ? validId(body.lessonId) : null, sentenceId = typeof body.sentenceId === "string" ? validId(body.sentenceId) : null;
  const position = Number.isInteger(body.position) && Number(body.position) > 0 && Number(body.position) <= 1000 ? Number(body.position) : null;
  if (!lessonId || !sentenceId || !position) return json({ error: "invalid_progress" }, 422);
  const sql = sqlFor(env), validRows = await sql`SELECT 1 FROM listening_sentences WHERE id=${sentenceId} AND lesson_id=${lessonId} AND position=${position}`;
  if (!validRows.length) return json({ error: "invalid_progress" }, 422);
  await sql`
    WITH removed AS (
      DELETE FROM listening_sentence_progress
      WHERE user_id=${session.id} AND sentence_id=${sentenceId}
      RETURNING sentence_id
    ), counts AS (
      SELECT COUNT(*)::int AS completed_count
      FROM listening_sentence_progress sp
      JOIN listening_sentences s ON s.id=sp.sentence_id
      WHERE sp.user_id=${session.id} AND s.lesson_id=${lessonId} AND sp.is_completed=true AND sp.sentence_id<>${sentenceId}
    )
    UPDATE listening_lesson_progress
    SET current_sentence_position=${position},
        completed_sentence_count=counts.completed_count,
        is_completed=false,
        completed_at=NULL,
        updated_at=now()
    FROM counts
    WHERE user_id=${session.id} AND lesson_id=${lessonId}`;
  return json({ ok: true });
}

async function resetLessonProgress(request: Request, env: Env, session: ListeningSession | null) {
  if (!session) return json({ error: "unauthorized" }, 401);
  let body: Record<string, unknown>;
  try { body = await boundedJson<Record<string, unknown>>(request); }
  catch (error) { return error instanceof RequestBodyError ? json({ error: error.message }, error.status) : json({ error: "invalid_json" }, 400); }
  const lessonId = typeof body.lessonId === "string" ? validId(body.lessonId) : null;
  if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  const sql = sqlFor(env), lessonRows = await sql`SELECT 1 FROM listening_lessons WHERE id=${lessonId}`;
  if (!lessonRows.length) return json({ error: "not_found" }, 404);
  await sql`
    WITH lesson_sentences AS (
      SELECT id FROM listening_sentences WHERE lesson_id=${lessonId}
    ), removed_sentences AS (
      DELETE FROM listening_sentence_progress
      WHERE user_id=${session.id} AND sentence_id IN (SELECT id FROM lesson_sentences)
      RETURNING sentence_id
    ), removed_lesson AS (
      DELETE FROM listening_lesson_progress
      WHERE user_id=${session.id} AND lesson_id=${lessonId}
      RETURNING lesson_id
    )
    SELECT
      (SELECT COUNT(*)::int FROM removed_sentences) AS removed_sentences,
      EXISTS(SELECT 1 FROM removed_lesson) AS removed_lesson`;
  return json({ ok: true });
}

async function getAdminBootstrap(env: Env) {
  const sql = sqlFor(env);
  const [categories,sections] = await Promise.all([
    sql`SELECT l.code AS language_code,c.id AS category_id,c.name AS category_name FROM languages l JOIN listening_categories c ON c.language_id=l.id WHERE l.is_enabled=true ORDER BY l.sort_order,c.sort_order,c.name`,
    sql`SELECT l.code AS language_code,c.id AS category_id,c.name AS category_name,s.id AS section_id,s.title AS section_title FROM languages l JOIN listening_categories c ON c.language_id=l.id JOIN listening_sections s ON s.category_id=c.id WHERE l.is_enabled=true ORDER BY l.sort_order,c.sort_order,s.sort_order,s.number`,
  ]);
  return json({ categories,sections });
}

async function createAdminSection(request: Request, env: Env) {
  let body: Record<string, unknown>;
  try { body = await boundedJson<Record<string, unknown>>(request); }
  catch (error) { return error instanceof RequestBodyError ? json({ error: error.message }, error.status) : json({ error: "invalid_json" }, 400); }
  const categoryId = typeof body.categoryId === "string" ? validId(body.categoryId) : null;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!categoryId || !title || title.length > 200 || description.length > 1000) return json({ error: "invalid_section_metadata" }, 422);
  const sql = sqlFor(env);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const id = crypto.randomUUID();
      const rows = await sql`WITH next_section AS (
        SELECT c.id AS category_id,COALESCE(MAX(s.number),0)::int+1 AS number,COALESCE(MAX(s.sort_order),0)::int+1 AS sort_order,l.code AS language_code,c.name AS category_name
        FROM listening_categories c JOIN languages l ON l.id=c.language_id LEFT JOIN listening_sections s ON s.category_id=c.id
        WHERE c.id=${categoryId} AND l.is_enabled=true GROUP BY c.id,l.code
      ), inserted AS (
        INSERT INTO listening_sections(id,category_id,number,title,description,sort_order,is_published)
        SELECT ${id},category_id,number,${title},${description || null},sort_order,true FROM next_section
        RETURNING id,category_id,title
      ), bumped AS (
        UPDATE listening_manifest_meta SET version=version+1,updated_at=now() WHERE id=true AND EXISTS(SELECT 1 FROM inserted)
      )
      SELECT i.id AS section_id,i.category_id,i.title AS section_title,n.language_code,n.category_name FROM inserted i JOIN next_section n ON n.category_id=i.category_id`;
      if (!rows.length) return json({ error: "invalid_category" }, 422);
      return json({ section: rows[0] }, 201);
    } catch (error) {
      if (postgresErrorCode(error) !== "23505" || attempt === 1) return json({ error: "section_create_failed" }, 500);
    }
  }
  return json({ error: "section_create_failed" }, 500);
}

async function getAdminLessons(env: Env, url: URL) {
  const query = url.searchParams.get("q")?.trim() ?? "", exactPath = url.searchParams.get("path")?.trim() ?? "", language = url.searchParams.get("language") ?? "all", status = url.searchParams.get("status") ?? "all";
  if (exactPath.length > 400) return json({ error: "invalid_path" }, 422);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100));
  const sql = sqlFor(env);
  const rows = await sql`SELECT l.id,l.slug,l.title,l.description,l.level,l.duration_ms,l.sentence_count,l.sort_order,l.is_published,l.updated_at,l.audio_key,p.path,c.slug AS category_slug,c.name AS category_name,s.id AS section_id,s.title AS section_title,lang.code AS language_code FROM listening_lessons l JOIN listening_canonical_paths p ON p.lesson_id=l.id JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE (${query}='' OR l.title ILIKE ${`%${query}%`} OR l.slug ILIKE ${`%${query}%`} OR p.path ILIKE ${`%${query}%`}) AND (${exactPath}='' OR p.path=${exactPath}) AND (${language}='all' OR lang.code=${language}) AND (${status}='all' OR (${status}='published' AND l.is_published=true) OR (${status}='draft' AND l.is_published=false)) ORDER BY p.path,l.title LIMIT ${limit}`;
  return json({ lessons: rows });
}

async function getAdminLesson(env: Env, url: URL) {
  const lessonId = validId(url.pathname.slice("/api/listening/admin/lessons/".length)); if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  const sql = sqlFor(env);
  const rows = await sql`SELECT l.id,l.slug,l.title,l.description,l.level,l.duration_ms,l.sentence_count,l.sort_order,l.is_published,l.updated_at,l.audio_key,p.path,c.slug AS category_slug,c.name AS category_name,s.id AS section_id,s.title AS section_title,lang.code AS language_code FROM listening_lessons l JOIN listening_canonical_paths p ON p.lesson_id=l.id JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages lang ON lang.id=c.language_id WHERE l.id=${lessonId}`;
  if (!rows.length) return json({ error: "not_found" }, 404);
  const sentences = await sql`SELECT id,position,transcript AS text,start_ms AS "startMs",end_ms AS "endMs" FROM listening_sentences WHERE lesson_id=${lessonId} ORDER BY position`;
  return json({ lesson: { ...rows[0], sentences } });
}

interface BatchSourceFile { name: string; file: File; }
interface NormalizedBatchSource { files:BatchSourceFile[]; descriptors:ReturnType<typeof describeImportResource>[]; originalArchive?:File; }
interface PreparedBatchItem {
  id: string;
  normalizedBasename: string;
  lessonName: string;
  slug: string | null;
  audioName: string | null;
  srtName: string | null;
  durationMs: number | null;
  segmentCount: number | null;
  sortOrder: number;
  status: "INVALID" | "QUEUED";
  errors: string[];
}

async function validateImportBatch(request: Request, env: Env, session: ListeningSession) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength <= 0) return json({ error: "content_length_required" }, 411);
  if (contentLength > MAX_BATCH_REQUEST_BYTES) return json({ error: "batch_upload_too_large" }, 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: "invalid_multipart_form" }, 400); }
  const sectionId = typeof form.get("sectionId") === "string" ? validId(String(form.get("sectionId"))) : null;
  const inputMethod = form.get("inputMethod");
  const level = normalizeOptionalLevel(form.get("level"));
  if (!sectionId || (inputMethod !== "files" && inputMethod !== "zip") || level.length > 30) return json({ error: "invalid_batch_metadata" }, 422);
  const durations = parseDurationMap(form.get("durations"));
  let source: NormalizedBatchSource;
  try { source = inputMethod === "zip" ? await extractZipResources(form.get("archive")) : collectUploadedResources(form.getAll("files")); }
  catch (error) { return json({ error: "invalid_import_resources", details: error instanceof Error ? error.message : "resource_read_failed" }, 422); }
  if (!source.descriptors.length) return json({ error: "batch_resources_missing" }, 422);
  if (source.descriptors.length > NON_AI_IMPORT_LIMITS.maxResources) return json({ error: "too_many_resources" }, 413);
  const candidates = pairImportResources(source.descriptors);
  if (candidates.filter((candidate) => candidate.slug).length > NON_AI_IMPORT_LIMITS.maxLessons) return json({ error: "too_many_lessons" }, 413);
  const sql = sqlFor(env);
  const sectionRows = await sql`SELECT s.id,c.id AS category_id,c.slug AS category_slug FROM listening_sections s JOIN listening_categories c ON c.id=s.category_id JOIN languages l ON l.id=c.language_id WHERE s.id=${sectionId} AND l.is_enabled=true`;
  const section = sectionRows[0]; if (!section) return json({ error: "invalid_section" }, 422);
  const existingLessonRows = await sql`SELECT slug FROM listening_lessons WHERE section_id=${sectionId}`;
  const existingPathRows = await sql`SELECT p.path FROM listening_canonical_paths p JOIN listening_lessons lesson ON lesson.id=p.lesson_id JOIN listening_sections s ON s.id=lesson.section_id WHERE s.category_id=${section.category_id}`;
  const orderRows = await sql`SELECT COALESCE(MAX(sort_order),0)::int AS max_sort_order FROM listening_lessons WHERE section_id=${sectionId}`;
  const existingSlugs = new Set(existingLessonRows.map(row=>String(row.slug))),existingPaths = new Set(existingPathRows.map(row=>String(row.path)));
  const sourceFiles = new Map(source.files.map((entry) => [entry.name, entry.file]));
  const batchId = crypto.randomUUID();
  const initialSortOrder = Number(orderRows[0]?.max_sort_order ?? 0);
  const validated = [] as Array<{ candidate: typeof candidates[number]; durationMs: number | null; segmentCount: number | null }>;
  for (const candidate of candidates) {
    const errors = [...candidate.errors];
    const audio = candidate.audioName ? sourceFiles.get(candidate.audioName) : undefined;
    const srt = candidate.srtName ? sourceFiles.get(candidate.srtName) : undefined;
    let durationMs = candidate.audioName ? durations.get(candidate.audioName) ?? null : null;
    let segmentCount: number | null = null;
    if (durationMs !== null && (!Number.isInteger(durationMs) || durationMs <= 0 || durationMs > 3_600_000)) { errors.push("invalid_audio_duration"); durationMs = null; }
    if (audio && srt && !errors.length) {
      try {
        const srtText = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(await srt.arrayBuffer());
        const sentences = parseNonAiSrt(srtText, durationMs ?? undefined);
        segmentCount = sentences.length;
        durationMs ??= sentences.at(-1)!.endMs;
      } catch (error) { errors.push(error instanceof Error ? error.message : "invalid_srt"); }
    }
    validated.push({ candidate:{ ...candidate, errors:[...new Set(errors)] }, durationMs, segmentCount });
  }
  const allocatedCandidates = allocateImportCandidateSlugs(validated.map((item) => item.candidate), (slug) => existingSlugs.has(slug) || existingPaths.has(lessonPath(level || "all", String(section.category_slug), slug)));
  const prepared: PreparedBatchItem[] = allocatedCandidates.map((candidate,index) => ({
    id:crypto.randomUUID(), normalizedBasename:`${candidate.key}:${index}`, lessonName:candidate.lessonName, slug:candidate.slug || null,
    audioName:candidate.audioName ?? null, srtName:candidate.srtName ?? null, durationMs:validated[index].durationMs,
    segmentCount:validated[index].segmentCount, sortOrder:initialSortOrder + index + 1,
    status:candidate.errors.length ? "INVALID" : "QUEUED", errors:candidate.errors,
  }));
  const sourceArchiveKey=prepared.some(item=>item.status==="QUEUED")?`listening/import-staging/${batchId}/resources.zip`:null;
  try {
    if(sourceArchiveKey){const archive=source.originalArchive??await createResourceArchive(source.files);await env.LISTENING_AUDIO.put(sourceArchiveKey,archive,{httpMetadata:{contentType:"application/zip",cacheControl:"no-store"}});}
    const queries: TransactionQuery[] = [
      sql`INSERT INTO listening_import_batches(id,created_by,section_id,input_method,source_archive_key,level,status) VALUES(${batchId},${session.id},${sectionId},${inputMethod},${sourceArchiveKey},${level||null},'VALIDATED')`,
      ...prepared.map((item) => sql`INSERT INTO listening_import_batch_items(id,batch_id,normalized_basename,lesson_name,slug,original_audio_name,original_srt_name,audio_duration_ms,segment_count,sort_order,status,validation_errors) VALUES(${item.id},${batchId},${item.normalizedBasename},${item.lessonName},${item.slug},${item.audioName},${item.srtName},${item.durationMs},${item.segmentCount},${item.sortOrder},${item.status},${JSON.stringify(item.errors)}::jsonb)`),
    ];
    await sql.transaction(queries);
  } catch (error) {
    if(sourceArchiveKey)await env.LISTENING_AUDIO.delete(sourceArchiveKey).catch(()=>undefined);
    console.error(JSON.stringify({ event: "batch_import_validation_persistence_failed", batchId, message: error instanceof Error ? error.message : "unknown" }));
    return json({ error: "batch_validation_failed" }, 500);
  }
  return getImportBatchById(env, session, batchId);
}

function collectUploadedResources(values: Array<string | File>): NormalizedBatchSource {
  const files = values.filter((value): value is File => value instanceof File);
  return { files: files.map((file) => ({ name:file.name, file })), descriptors: files.map((file) => describeImportResource(file.name, file.size)) };
}

async function extractZipResources(value: string | File | null): Promise<NormalizedBatchSource> {
  if (!(value instanceof File) || !value.name.toLocaleLowerCase().endsWith(".zip") || value.size <= 0 || value.size > NON_AI_IMPORT_LIMITS.maxArchiveBytes) throw new Error("invalid_zip_file");
  const descriptors: ReturnType<typeof describeImportResource>[] = [];
  let extractedBytes = 0, resourceCount = 0;
  const extracted = unzipSync(new Uint8Array(await value.arrayBuffer()), { filter: (entry) => {
    if (entry.name.endsWith("/")) return false;
    if (!isSafeArchivePath(entry.name)) throw new Error("unsafe_zip_path");
    resourceCount += 1; extractedBytes += entry.originalSize;
    if (resourceCount > NON_AI_IMPORT_LIMITS.maxResources) throw new Error("too_many_resources");
    if (extractedBytes > NON_AI_IMPORT_LIMITS.maxExtractedBytes) throw new Error("zip_extracted_size_exceeded");
    const descriptor = describeImportResource(entry.name, entry.originalSize); descriptors.push(descriptor);
    return descriptor.kind !== "unsupported";
  } });
  const files = Object.entries(extracted).map(([name, bytes]) => ({ name, file:new File([bytes], name, { type:name.toLocaleLowerCase().endsWith(".mp3") ? "audio/mpeg" : "application/x-subrip" }) }));
  return { files, descriptors, originalArchive:value };
}

async function createResourceArchive(files:BatchSourceFile[]):Promise<Uint8Array>{const entries:Record<string,Uint8Array>={};for(const entry of files){const descriptor=describeImportResource(entry.name,entry.file.size);if(descriptor.kind!=="unsupported")entries[entry.name]=new Uint8Array(await entry.file.arrayBuffer());}return zipSync(entries,{level:0});}

function isSafeArchivePath(name: string): boolean {
  if (!name || name.includes("\0") || name.startsWith("/") || name.startsWith("\\") || /^[a-z]:/iu.test(name)) return false;
  return !name.replace(/\\/gu, "/").split("/").some((part) => part === "..");
}

function parseDurationMap(value: string | File | null): Map<string, number> {
  if (typeof value !== "string" || value.length > 100_000) return new Map();
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return new Map();
    return new Map(parsed.flatMap((item) => item && typeof item === "object" && typeof (item as {name?:unknown}).name === "string" && Number.isInteger((item as {durationMs?:unknown}).durationMs) ? [[(item as {name:string}).name, Number((item as {durationMs:number}).durationMs)] as const] : []));
  } catch { return new Map(); }
}

async function getImportBatch(env: Env, session: ListeningSession, url: URL) {
  const batchId = validId(url.pathname.slice("/api/listening/admin/import-batches/".length));
  return batchId ? getImportBatchById(env, session, batchId) : json({ error:"invalid_batch" },422);
}

async function getImportBatchById(env: Env, session: ListeningSession, batchId: string) {
  const sql = sqlFor(env);
  const batches = await sql`SELECT b.id,b.input_method,b.level,b.status,b.confirmed_at,b.created_at,l.code AS language_code,l.name AS language_name,c.name AS category_name,s.title AS section_title,s.id AS section_id FROM listening_import_batches b JOIN listening_sections s ON s.id=b.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages l ON l.id=c.language_id WHERE b.id=${batchId} AND b.created_by=${session.id}`;
  if (!batches.length) return json({ error:"not_found" },404);
  const items = await sql`SELECT id,lesson_name AS "lessonName",slug,original_audio_name AS "audioName",original_srt_name AS "srtName",audio_duration_ms AS "durationMs",segment_count AS "segmentCount",status,validation_errors AS errors,error_message AS "errorMessage",lesson_id AS "lessonId",attempt_count AS "attemptCount",sort_order AS "sortOrder" FROM listening_import_batch_items WHERE batch_id=${batchId} ORDER BY sort_order,id`;
  const counts = { total:items.length, valid:items.filter((item) => item.status !== "INVALID").length, invalid:items.filter((item) => item.status === "INVALID").length, queued:items.filter((item) => item.status === "QUEUED").length, processing:items.filter((item) => item.status === "PROCESSING").length, completed:items.filter((item) => item.status === "COMPLETED").length, failed:items.filter((item) => item.status === "FAILED").length };
  return json({ batch:{ ...batches[0], items, counts } });
}

async function confirmImportBatch(env: Env, session: ListeningSession, url: URL) {
  const batchId = validId(url.pathname.slice("/api/listening/admin/import-batches/".length).replace(/\/confirm$/u,"")); if (!batchId) return json({error:"invalid_batch"},422);
  const sql = sqlFor(env);
  const rows = await sql`UPDATE listening_import_batches b SET confirmed_at=COALESCE(confirmed_at,now()),status='PROCESSING',updated_at=now() WHERE b.id=${batchId} AND b.created_by=${session.id} AND b.status IN ('VALIDATED','PROCESSING','PARTIAL','FAILED') AND EXISTS(SELECT 1 FROM listening_import_batch_items i WHERE i.batch_id=b.id AND i.status IN ('QUEUED','FAILED','PROCESSING')) RETURNING b.id`;
  if (!rows.length) return json({error:"batch_not_confirmable"},409);
  return getImportBatchById(env,session,batchId);
}

async function processImportBatchItem(env: Env, session: ListeningSession, url: URL,ctx:ExecutionContext) {
  const match = url.pathname.match(/^\/api\/listening\/admin\/import-batches\/([\w-]+)\/items\/([\w-]+)\/process$/u); if (!match) return json({error:"invalid_batch_item"},422);
  const [,batchId,itemId]=match,sql=sqlFor(env);
  const completed = await sql`SELECT i.lesson_id FROM listening_import_batch_items i JOIN listening_import_batches b ON b.id=i.batch_id WHERE i.id=${itemId} AND i.batch_id=${batchId} AND b.created_by=${session.id} AND i.status='COMPLETED'`;
  if (completed.length) return getImportBatchById(env,session,batchId);
  const claimed = await sql`UPDATE listening_import_batch_items i SET status='PROCESSING',attempt_count=attempt_count+1,error_message=NULL,updated_at=now() FROM listening_import_batches b WHERE i.id=${itemId} AND i.batch_id=${batchId} AND b.id=i.batch_id AND b.created_by=${session.id} AND b.confirmed_at IS NOT NULL AND (i.status IN ('QUEUED','FAILED') OR (i.status='PROCESSING' AND i.updated_at < now()-(${BATCH_ITEM_STALE_SECONDS} * interval '1 second'))) RETURNING i.*`;
  const item=claimed[0]; if(!item)return json({error:"batch_item_not_processable"},409);
  const batchRows=await sql`SELECT b.level,b.section_id,b.source_archive_key,c.slug AS category_slug,l.code AS language_code FROM listening_import_batches b JOIN listening_sections s ON s.id=b.section_id JOIN listening_categories c ON c.id=s.category_id JOIN languages l ON l.id=c.language_id WHERE b.id=${batchId}`;
  const batch=batchRows[0]; if(!batch)return json({error:"not_found"},404);
  try {
    const archiveObject=await env.LISTENING_AUDIO.get(String(batch.source_archive_key));if(!archiveObject)throw new Error("staged_resource_missing");
    const selected=extractSelectedResources(new Uint8Array(await archiveObject.arrayBuffer()),String(item.original_audio_name),String(item.original_srt_name));
    const srtText=new TextDecoder("utf-8",{fatal:true,ignoreBOM:false}).decode(selected.srt);
    const sentences=parseNonAiSrt(srtText,Number(item.audio_duration_ms));
    const requestedSlug=slugifyTitle(String(item.lesson_name));if(!requestedSlug)throw new Error("invalid_filename");
    const result=await persistImportedLesson(env,sql,session,{audio:new Blob([selected.audio],{type:"audio/mpeg"}),audioFileName:String(item.original_audio_name),transcript:sentences.map(sentence=>sentence.text).join("\n"),sectionId:String(batch.section_id),title:String(item.lesson_name),slug:requestedSlug,level:String(batch.level??""),durationMs:Number(item.audio_duration_ms),sentences,languageCode:String(batch.language_code),categorySlug:String(batch.category_slug),sortOrder:Number(item.sort_order),publish:true,batchItemId:itemId,source:"srt"});
    await scheduleTranslationsAfterContentChange(env,ctx,result.lessonId,session.id);
    await refreshBatchStatus(sql,batchId);
    await cleanupFinishedBatchArchive(env,sql,batchId);
    return json({ok:true,lessonId:result.lessonId,batch:(await batchPayload(env,session,batchId))});
  } catch(error) {
    const message=postgresErrorCode(error)==="23505"?"duplicate_lesson_slug":error instanceof Error?error.message:"unexpected_server_error";
    await sql`UPDATE listening_import_batch_items SET status='FAILED',error_message=${message.slice(0,500)},updated_at=now() WHERE id=${itemId} AND status='PROCESSING'`;
    await refreshBatchStatus(sql,batchId);
    console.error(JSON.stringify({event:"batch_import_item_failed",batchId,itemId,message:message.slice(0,500)}));
    return json({error:"batch_item_failed",details:message},422);
  }
}

async function refreshBatchStatus(sql:TransactionSql,batchId:string){await sql`UPDATE listening_import_batches b SET status=CASE WHEN EXISTS(SELECT 1 FROM listening_import_batch_items i WHERE i.batch_id=b.id AND i.status IN ('QUEUED','PROCESSING')) THEN 'PROCESSING' WHEN EXISTS(SELECT 1 FROM listening_import_batch_items i WHERE i.batch_id=b.id AND i.status='FAILED') AND EXISTS(SELECT 1 FROM listening_import_batch_items i WHERE i.batch_id=b.id AND i.status='COMPLETED') THEN 'PARTIAL' WHEN EXISTS(SELECT 1 FROM listening_import_batch_items i WHERE i.batch_id=b.id AND i.status='FAILED') THEN 'FAILED' ELSE 'COMPLETED' END,updated_at=now() WHERE b.id=${batchId}`;}
function extractSelectedResources(archive:Uint8Array,audioName:string,srtName:string){const selected=unzipSync(archive,{filter:entry=>entry.name===audioName||entry.name===srtName});const audio=selected[audioName],srt=selected[srtName];if(!audio||!srt)throw new Error("staged_resource_missing");return {audio,srt};}
async function cleanupFinishedBatchArchive(env:Env,sql:TransactionSql,batchId:string){const rows=await sql`SELECT source_archive_key FROM listening_import_batches b WHERE b.id=${batchId} AND b.source_archive_key IS NOT NULL AND NOT EXISTS(SELECT 1 FROM listening_import_batch_items i WHERE i.batch_id=b.id AND i.status IN ('QUEUED','PROCESSING','FAILED'))`;const key=rows[0]?.source_archive_key;if(!key)return;try{await env.LISTENING_AUDIO.delete(String(key));await sql`UPDATE listening_import_batches SET source_archive_key=NULL,updated_at=now() WHERE id=${batchId}`;}catch(error){console.error(JSON.stringify({event:"batch_archive_cleanup_failed",batchId,message:error instanceof Error?error.message:"unknown"}));}}
async function batchPayload(env:Env,session:ListeningSession,batchId:string){const response=await getImportBatchById(env,session,batchId);return (await response.json() as {batch:unknown}).batch;}

async function importLesson(request: Request, env: Env, session: ListeningSession) {
  const length = Number(request.headers.get("content-length") ?? 0); if (!Number.isFinite(length) || length <= 0) return json({ error: "content_length_required" }, 411); if (length > MAX_AUDIO_BYTES + 256 * 1024) return json({ error: "upload_too_large" }, 413);
  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ error: "invalid_multipart_form" }, 400); }
  const audio = form.get("audio"), transcript = form.get("transcript"), sectionId = form.get("sectionId"), title = form.get("title"), levelValue = form.get("level"), durationRaw = form.get("durationMs"), importMode = form.get("importMode");
  const level = normalizeOptionalLevel(levelValue);
  const durationMs = typeof durationRaw === "string" ? Number(durationRaw) : NaN;
  if (!(audio instanceof File) || audio.size <= 0 || audio.size > MAX_AUDIO_BYTES || !["audio/mpeg","audio/mp3","audio/wav","audio/x-wav","audio/mp4","audio/ogg","audio/webm"].includes(audio.type)) return json({ error: "invalid_audio" }, 422);
  if (typeof transcript !== "string" || !transcript.trim() || transcript.length > 50_000 || typeof sectionId !== "string" || !validId(sectionId) || typeof title !== "string" || !title.trim() || title.length > 200 || level.length > 30 || !Number.isInteger(durationMs) || durationMs <= 0 || durationMs > 3_600_000) return json({ error: "invalid_import_metadata" }, 422);
  const slug = slugifyTitle(title.trim()); if (!slug) return json({ error: "title_cannot_create_slug" }, 422);
  const sql = sqlFor(env), sectionRows = await sql`SELECT s.id,c.slug AS category_slug,l.code AS language_code FROM listening_sections s JOIN listening_categories c ON c.id=s.category_id JOIN languages l ON l.id=c.language_id WHERE s.id=${sectionId} AND l.is_enabled=true`; if (!sectionRows.length) return json({ error: "invalid_section" }, 422);
  const languageCode = String(sectionRows[0].language_code), lessonId = crypto.randomUUID(), jobId = crypto.randomUUID(), extension = audio.name.toLocaleLowerCase().split(".").at(-1)?.replace(/[^a-z0-9]/gu, "") || "mp3", audioKey = `listening/${languageCode}/lessons/${lessonId}/audio.${extension}`;
  let sentences: AlignedSentence[];
  if (importMode !== "ai") return json({ error: "invalid_import_mode" }, 422);
  try { sentences = await alignLessonImport(env, audio, transcript, durationMs); }
  catch (error) {
    console.error(JSON.stringify({ event: "listening_import_alignment_failed", jobId, message: error instanceof Error ? error.message.slice(0, 500) : "unknown" }));
    return alignmentErrorResponse(error);
  }
  try {
    const result=await persistImportedLesson(env,sql,session,{audio,audioFileName:audio.name,transcript:transcript.trim(),sectionId,title:title.trim(),slug,level,durationMs,sentences,languageCode,categorySlug:String(sectionRows[0].category_slug),sortOrder:999,publish:false,source:"ai",lessonId,jobId,audioKey});
    const reviewRows = await sql`SELECT id,position,transcript AS text,start_ms AS "startMs",end_ms AS "endMs" FROM listening_sentences WHERE lesson_id=${lessonId} ORDER BY position`;
    return json({ jobId:result.jobId, lessonId:result.lessonId, slug:result.slug, path:result.canonicalPath, status: "READY_FOR_REVIEW", sentences: reviewRows });
  } catch (error) {
    console.error(JSON.stringify({ event: "listening_import_persistence_failed", lessonId, jobId, message: error instanceof Error ? error.message.slice(0, 500) : "unknown" }));
    if (error instanceof ImportPersistenceError && !error.cleanupComplete) return json({ error: "import_cleanup_failed", requestId: jobId }, 500);
    return postgresErrorCode(error) === "23505" ? json({ error: "lesson_canonical_path_exists" }, 409) : json({ error: "import_failed" }, 500);
  }
}

interface PersistImportedLessonInput {
  audio: Blob;
  audioFileName: string;
  transcript: string;
  sectionId: string;
  title: string;
  slug: string;
  level: string;
  durationMs: number;
  sentences: AlignedSentence[];
  languageCode: string;
  categorySlug: string;
  sortOrder: number;
  publish: boolean;
  source: "ai" | "srt";
  batchItemId?: string;
  lessonId?: string;
  jobId?: string;
  audioKey?: string;
}

class ImportPersistenceError extends Error { constructor(message:string,readonly cleanupComplete:boolean,readonly causeValue:unknown){super(message);} }

async function persistImportedLesson(env:Env,sql:TransactionSql,session:ListeningSession,input:PersistImportedLessonInput){
  const lessonId=input.lessonId??crypto.randomUUID(),jobId=input.jobId??crypto.randomUUID();
  const extension=input.audioFileName.toLocaleLowerCase().split(".").at(-1)?.replace(/[^a-z0-9]/gu,"")||"mp3";
  const audioKey=input.audioKey??`listening/${input.languageCode}/lessons/${lessonId}/audio.${extension}`;
  try{
    await env.LISTENING_AUDIO.put(audioKey,input.audio,{httpMetadata:{contentType:input.audio.type||"audio/mpeg",cacheControl:"public, max-age=31536000, immutable"}});
    const rejectedSlugs=new Set<string>();
    for(let attempt=0;attempt<100;attempt+=1){
      const slug=await findAvailableLessonSlug(sql,input.sectionId,input.categorySlug,input.level,input.slug,rejectedSlugs),canonicalPath=lessonPath(input.level||"all",input.categorySlug,slug),finalJobStatus=input.publish?"PUBLISHED":"READY_FOR_REVIEW";
      const importQueries:TransactionQuery[]=[
        sql`INSERT INTO listening_import_jobs(id,created_by,status,source_audio_key,source_transcript) VALUES(${jobId},${session.id},'VALIDATING',${audioKey},${input.transcript})`,
        sql`INSERT INTO listening_lessons(id,section_id,slug,title,level,audio_key,duration_ms,sentence_count,metadata,sort_order,is_published,import_job_id) VALUES(${lessonId},${input.sectionId},${slug},${input.title},${input.level||null},${audioKey},${input.durationMs},${input.sentences.length},${JSON.stringify({alignmentProvider:input.source==="ai"?"workers-ai-whisper":"standard-srt",importMode:input.source})}::jsonb,${input.sortOrder},${input.publish},${jobId})`,
        sql`INSERT INTO listening_canonical_paths(path,lesson_id) VALUES(${canonicalPath},${lessonId})`,
        ...input.sentences.map(sentence=>sql`INSERT INTO listening_sentences(id,lesson_id,position,transcript,normalized_transcript,start_ms,end_ms,metadata) VALUES(${crypto.randomUUID()},${lessonId},${sentence.position},${sentence.text},${getNormalizer(input.languageCode as "en"|"zh"|"ja").normalize(sentence.text)},${sentence.startMs},${sentence.endMs},${JSON.stringify({confidence:sentence.confidence??null})}::jsonb)`),
        sql`UPDATE listening_import_jobs SET lesson_id=${lessonId},status=${finalJobStatus},updated_at=now() WHERE id=${jobId}`,
      ];
      if(input.batchItemId)importQueries.push(sql`UPDATE listening_import_batch_items SET status='COMPLETED',slug=${slug},lesson_id=${lessonId},error_message=NULL,updated_at=now() WHERE id=${input.batchItemId} AND status='PROCESSING'`);
      importQueries.push(sql`UPDATE listening_manifest_meta SET version=version+1,updated_at=now() WHERE id=true`);
      try{await sql.transaction(importQueries);return {lessonId,jobId,audioKey,canonicalPath,slug};}
      catch(error){if(postgresErrorCode(error)!=="23505")throw error;rejectedSlugs.add(slug);}
    }
    throw new Error("slug_space_exhausted");
  }catch(error){
    const cleanupComplete=await cleanupFailedImport(env,sql,{lessonId,jobId,audioKey});
    throw new ImportPersistenceError(error instanceof Error?error.message:"import_failed",cleanupComplete,error);
  }
}

async function findAvailableLessonSlug(sql:TransactionSql,sectionId:string,categorySlug:string,level:string,baseSlug:string,rejected:Set<string>){
  const lessonRows=await sql`SELECT slug FROM listening_lessons WHERE section_id=${sectionId}`;
  const pathRows=await sql`SELECT p.path FROM listening_canonical_paths p JOIN listening_lessons lesson ON lesson.id=p.lesson_id JOIN listening_sections section ON section.id=lesson.section_id JOIN listening_categories category ON category.id=section.category_id WHERE category.slug=${categorySlug}`;
  const usedSlugs=new Set(lessonRows.map(row=>String(row.slug))),usedPaths=new Set(pathRows.map(row=>String(row.path)));
  return uniqueSlug(baseSlug,candidate=>rejected.has(candidate)||usedSlugs.has(candidate)||usedPaths.has(lessonPath(level||"all",categorySlug,candidate)));
}

async function reviewLesson(request: Request, env: Env, url: URL,ctx:ExecutionContext,session:ListeningSession) {
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
  if(body.publish)await scheduleTranslationsAfterContentChange(env,ctx,lessonId,session.id);
  return json({ ok: true, published: body.publish });
}

async function updateLesson(request: Request, env: Env, url: URL,ctx:ExecutionContext,session:ListeningSession) {
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
  let sentences: Array<{ id: string; position: number; text: string; startMs: number; endMs: number }> | null = null,changedSentenceIds:string[]=[];
  if (rawSentences !== undefined) {
    if (!Array.isArray(rawSentences) || !rawSentences.length || rawSentences.length > 1000) return json({ error: "invalid_sentences" }, 422);
    sentences = [];
    for (const raw of rawSentences) { if (!raw || typeof raw !== "object") return json({ error: "invalid_sentences" }, 422); const item = raw as Record<string, unknown>; if (typeof item.id !== "string" || !validId(item.id) || typeof item.text !== "string" || !item.text.trim() || !Number.isInteger(item.position) || !Number.isInteger(item.startMs) || !Number.isInteger(item.endMs)) return json({ error: "invalid_sentences" }, 422); sentences.push({ id: item.id, position: Number(item.position), text: item.text.trim(), startMs: Number(item.startMs), endMs: Number(item.endMs) }); }
    const errors = validateAlignedSentences(sentences, Number(current.duration_ms)); if (errors.length) return json({ error: "validation_failed", details: errors }, 422);
    const existingRows = await sql`SELECT id,transcript FROM listening_sentences WHERE lesson_id=${lessonId}`; const existingIds = new Set(existingRows.map((row) => String(row.id))); if (existingIds.size !== sentences.length || sentences.some((sentence) => !existingIds.has(sentence.id))) return json({ error: "sentence_set_mismatch" }, 422);const currentText=new Map(existingRows.map(row=>[String(row.id),String(row.transcript)]));changedSentenceIds=sentences.filter(sentence=>currentText.get(sentence.id)!==sentence.text).map(sentence=>sentence.id);
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
  if(changedSentenceIds.length){const staleRows=await sql`SELECT tr.id,tr.sentence_id,tr.language_code FROM listening_sentence_translation_versions tr WHERE tr.sentence_id=ANY(${changedSentenceIds}) AND tr.status IN ('APPROVED','PENDING')`;for(const row of staleRows){queries.push(sql`UPDATE listening_sentence_translation_versions SET status='SUPERSEDED',updated_at=now() WHERE id=${String(row.id)}`);queries.push(sql`INSERT INTO listening_translation_audit_log(id,translation_id,lesson_id,sentence_id,language_code,action,actor_id,details) VALUES(${crypto.randomUUID()},${String(row.id)},${lessonId},${String(row.sentence_id)},${String(row.language_code)},'SUPERSEDED',${session.id},${JSON.stringify({reason:"source_changed"})}::jsonb)`);}queries.push(sql`UPDATE listening_lesson_translation_sets SET status='DRAFT',machine_status=CASE WHEN language_code IN(SELECT code FROM listening_translation_languages WHERE machine_translation_enabled=true) THEN 'PENDING' ELSE machine_status END,updated_at=now() WHERE lesson_id=${lessonId}`);}
  queries.push(sql`UPDATE listening_manifest_meta SET version=version+1,updated_at=now() WHERE id=true`);
  try { await sql.transaction(queries); } catch (error) { return postgresErrorCode(error) === "23505" ? json({ error: "lesson_canonical_path_exists" }, 409) : json({ error: "lesson_update_failed" }, 500); }
  if(changedSentenceIds.length)await scheduleTranslationsAfterContentChange(env,ctx,lessonId,session.id);
  return json({ ok: true, path: newPath });
}

async function deleteLesson(env: Env, url: URL) {
  const lessonId = validId(url.pathname.slice("/api/listening/admin/lessons/".length)); if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  const result = await deleteLessonResource(env, lessonId);
  return result.ok ? json({ ok: true, deleted: [lessonId] }) : json({ error: result.error, requestId: lessonId }, result.status);
}

async function deleteLessons(request: Request, env: Env) {
  let body: Record<string, unknown>;
  try { body = await boundedJson<Record<string, unknown>>(request); }
  catch (error) { return error instanceof RequestBodyError ? json({ error: error.message }, error.status) : json({ error: "invalid_json" }, 400); }
  if (!Array.isArray(body.lessonIds)) return json({ error: "invalid_lesson_ids" }, 422);
  const lessonIds = [...new Set(body.lessonIds.map((item) => typeof item === "string" ? validId(item) : null))];
  if (!lessonIds.length || lessonIds.length > 50 || lessonIds.some((item) => !item)) return json({ error: "invalid_lesson_ids" }, 422);
  const deleted: string[] = [], failed: Array<{ lessonId: string; error: string }> = [];
  for (const lessonId of lessonIds as string[]) {
    const result = await deleteLessonResource(env, lessonId);
    if (result.ok) deleted.push(lessonId);
    else failed.push({ lessonId, error: result.error });
  }
  return json({ ok: !failed.length, deleted, failed }, failed.length ? 207 : 200);
}

type LessonDeleteResult = { ok: true } | { ok: false; error: string; status: number };

async function deleteLessonResource(env: Env, lessonId: string): Promise<LessonDeleteResult> {
  const sql = sqlFor(env), rows = await sql`SELECT id,audio_key,import_job_id FROM listening_lessons WHERE id=${lessonId}`; const lesson = rows[0]; if (!lesson) return { ok: false, error: "not_found", status: 404 };
  const audioKey = lesson.audio_key ? String(lesson.audio_key) : null;
  let audioBackup: { body: ArrayBuffer; httpMetadata?: R2HTTPMetadata; customMetadata?: Record<string,string> } | null = null;
  if (audioKey) {
    try {
      const object = await env.LISTENING_AUDIO.get(audioKey);
      if (object) audioBackup = { body: await object.arrayBuffer(), httpMetadata: object.httpMetadata, customMetadata: object.customMetadata };
      await env.LISTENING_AUDIO.delete(audioKey);
    } catch { return { ok: false, error: "resource_cleanup_failed", status: 500 }; }
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
      catch (restoreError) { console.error(JSON.stringify({ event:"lesson_delete_audio_restore_failed",lessonId,audioKey,message:restoreError instanceof Error?restoreError.message:"unknown" })); return { ok: false, error: "lesson_delete_rollback_failed", status: 500 }; }
    }
    return { ok: false, error: "lesson_delete_failed", status: 500 };
  }
  return { ok: true };
}

async function scheduleTranslationsAfterContentChange(env:Env,ctx:ExecutionContext,lessonId:string,requestedBy:string){
  try{await scheduleAutomaticTranslations(env,ctx,lessonId,undefined,requestedBy);}
  catch(error){console.error(JSON.stringify({event:"lesson_translation_schedule_failed",lessonId,message:error instanceof Error?error.message:"unknown"}));}
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
  if (error instanceof ImportPersistenceError) return postgresErrorCode(error.causeValue);
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function alignmentErrorResponse(error: unknown): Response {
  const code = error instanceof Error ? error.message : "alignment_failed";
  if (code === "workers_ai_not_configured" || code === "workers_ai_model_invalid") return json({ error: code }, 503);
  if (code.startsWith("workers_ai_")) return json({ error: "workers_ai_failed" }, 502);
  return json({ error: "alignment_failed", details: code.startsWith("transcript_alignment_") ? code : "alignment_failed" }, 422);
}

async function boundedJson<T>(request: Request): Promise<T> { if(!request.body)throw new RequestBodyError("missing_body",400);const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;while(true){const{value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_JSON_BYTES){await reader.cancel();throw new RequestBodyError("body_too_large",413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return JSON.parse(new TextDecoder().decode(bytes)) as T; }
