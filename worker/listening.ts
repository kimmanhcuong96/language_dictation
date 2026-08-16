import { neon } from "@neondatabase/serverless";
import { validateAlignedSentences, type AlignedSentence } from "../src/lib/ingestion";
import { getNormalizer } from "../src/lib/dictation";
import { alignLessonImport } from "./listening-import";

export interface ListeningSession { id: string; email: string; }
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_JSON_BYTES = 128 * 1024;
class RequestBodyError extends Error { constructor(message: string, readonly status: number) { super(message); } }
const publicHeaders = { "Cache-Control": "public, max-age=60, stale-while-revalidate=300", "Content-Type": "application/json; charset=utf-8" };
const json = (body: unknown, status = 200, cache = false) => Response.json(body, { status, headers: cache ? publicHeaders : { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
const sqlFor = (env: Env) => neon(env.DATABASE_URL);
const validId = (value: string | null, max = 100) => value && new RegExp(`^[\\w-]{1,${max}}$`, "u").test(value) ? value : null;
const isAdmin = (env: Env, session: ListeningSession | null) => !!session && env.ADMIN_EMAILS.split(",").map((item) => item.trim().toLocaleLowerCase()).filter(Boolean).includes(session.email.toLocaleLowerCase());

export async function routeListening(request: Request, env: Env, url: URL, session: ListeningSession | null, mutationValid: boolean): Promise<Response> {
  if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith("/api/listening/audio/")) return serveAudio(request, env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/categories") return getCategories(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/sections") return getSections(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/lessons") return getLessons(env, url);
  if (request.method === "GET" && /^\/api\/listening\/lessons\/[\w-]+$/u.test(url.pathname)) return getLesson(env, url);
  if (request.method === "GET" && url.pathname === "/api/listening/progress") return getProgress(env, session, url);
  if (request.method === "POST" && url.pathname === "/api/listening/progress") return mutationValid ? saveProgress(request, env, session) : json({ error: session ? "invalid_csrf" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "GET" && url.pathname === "/api/listening/admin/bootstrap") return isAdmin(env, session) ? getAdminBootstrap(env) : json({ error: "forbidden" }, 403);
  if (request.method === "POST" && url.pathname === "/api/listening/admin/import") return isAdmin(env, session) && mutationValid ? importLesson(request, env, session!) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
  if (request.method === "PATCH" && /^\/api\/listening\/admin\/lessons\/[\w-]+$/u.test(url.pathname)) return isAdmin(env, session) && mutationValid ? reviewLesson(request, env, url) : json({ error: session ? "forbidden" : "unauthorized" }, session ? 403 : 401);
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
  const rows = await sqlFor(env)`SELECT l.id,l.slug,l.title,l.description,l.level,l.duration_ms,l.sentence_count,l.thumbnail_key,l.metadata,l.sort_order FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id WHERE s.id=${section} AND c.is_published=true AND s.is_published=true AND l.is_published=true ORDER BY l.sort_order,l.title`;
  return json({ lessons: rows }, 200, true);
}

async function getLesson(env: Env, url: URL) {
  const id = validId(decodeURIComponent(url.pathname.slice("/api/listening/lessons/".length))); if (!id) return json({ error: "invalid_lesson" }, 422);
  const rows = await sqlFor(env)`SELECT l.id,l.slug,l.title,l.description,l.level,l.audio_key,l.duration_ms,l.sentence_count,l.thumbnail_key,l.metadata,c.slug AS category_slug,s.id AS section_id,s.number AS section_number FROM listening_lessons l JOIN listening_sections s ON s.id=l.section_id JOIN listening_categories c ON c.id=s.category_id WHERE (l.id=${id} OR l.slug=${id}) AND c.is_published=true AND s.is_published=true AND l.is_published=true`;
  const lesson = rows[0]; if (!lesson) return json({ error: "not_found" }, 404);
  const sentences = await sqlFor(env)`SELECT id,position,transcript,start_ms,end_ms,metadata FROM listening_sentences WHERE lesson_id=${lesson.id} ORDER BY position`;
  return json({ lesson: { ...lesson, audio_url: lesson.audio_key ? `/api/listening/audio/${String(lesson.audio_key).split("/").map(encodeURIComponent).join("/")}` : null, sentences } }, 200, true);
}

async function serveAudio(request: Request, env: Env, url: URL) {
  const key = url.pathname.slice("/api/listening/audio/".length).split("/").map(decodeURIComponent).join("/");
  if (!key.startsWith("listening/") || key.includes("..") || key.length > 1024) return json({ error: "invalid_audio_key" }, 422);
  const object = await env.LISTENING_AUDIO.get(key, { range: request.headers, onlyIf: request.headers });
  if (!object) return json({ error: "audio_not_found" }, 404);
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("etag", object.httpEtag); headers.set("accept-ranges", "bytes"); headers.set("cache-control", "public, max-age=86400");
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  let status = 200;
  if (object.range) { const start = "suffix" in object.range ? Math.max(0, object.size - object.range.suffix) : (object.range.offset ?? 0); const length = "suffix" in object.range ? Math.min(object.size, object.range.suffix) : (object.range.length ?? object.size - start); headers.set("content-range", `bytes ${start}-${start + length - 1}/${object.size}`); headers.set("content-length", String(length)); status = 206; }
  if (request.method === "HEAD") return new Response(null, { status, headers });
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
  await sql.transaction(async tx => {
    await tx`INSERT INTO listening_sentence_progress(user_id,sentence_id,attempt_count,is_completed,first_try_correct,completed_at) VALUES(${session.id},${sentenceId},${attemptCount},true,${firstTryCorrect},now()) ON CONFLICT(user_id,sentence_id) DO UPDATE SET attempt_count=GREATEST(listening_sentence_progress.attempt_count,EXCLUDED.attempt_count),is_completed=true,first_try_correct=COALESCE(listening_sentence_progress.first_try_correct,EXCLUDED.first_try_correct),updated_at=now(),completed_at=COALESCE(listening_sentence_progress.completed_at,now())`;
    const counts = await tx`SELECT COUNT(*)::int AS completed_count,(SELECT sentence_count FROM listening_lessons WHERE id=${lessonId})::int AS total FROM listening_sentence_progress sp JOIN listening_sentences s ON s.id=sp.sentence_id WHERE sp.user_id=${session.id} AND s.lesson_id=${lessonId} AND sp.is_completed=true`; const completed = Number(counts[0].completed_count), total = Number(counts[0].total);
    await tx`INSERT INTO listening_lesson_progress(user_id,lesson_id,current_sentence_position,completed_sentence_count,is_completed,completed_at) VALUES(${session.id},${lessonId},${Math.min(total,position+1)},${completed},${completed>=total},${completed>=total?new Date():null}) ON CONFLICT(user_id,lesson_id) DO UPDATE SET current_sentence_position=GREATEST(listening_lesson_progress.current_sentence_position,EXCLUDED.current_sentence_position),completed_sentence_count=EXCLUDED.completed_sentence_count,is_completed=EXCLUDED.is_completed,updated_at=now(),completed_at=COALESCE(listening_lesson_progress.completed_at,EXCLUDED.completed_at)`;
  });
  return json({ ok: true });
}

async function getAdminBootstrap(env: Env) {
  const rows = await sqlFor(env)`SELECT l.code AS language_code,c.id AS category_id,c.name AS category_name,s.id AS section_id,s.title AS section_title FROM languages l JOIN listening_categories c ON c.language_id=l.id JOIN listening_sections s ON s.category_id=c.id WHERE l.code='en' ORDER BY c.sort_order,s.sort_order`;
  return json({ sections: rows });
}

async function importLesson(request: Request, env: Env, session: ListeningSession) {
  const length = Number(request.headers.get("content-length") ?? 0); if (!Number.isFinite(length) || length <= 0) return json({ error: "content_length_required" }, 411); if (length > MAX_AUDIO_BYTES + 256 * 1024) return json({ error: "upload_too_large" }, 413);
  const form = await request.formData(), audio = form.get("audio"), transcript = form.get("transcript"), sectionId = form.get("sectionId"), title = form.get("title"), slug = form.get("slug"), level = form.get("level"), durationRaw = form.get("durationMs");
  const durationMs = typeof durationRaw === "string" ? Number(durationRaw) : NaN;
  if (!(audio instanceof File) || audio.size <= 0 || audio.size > MAX_AUDIO_BYTES || !["audio/mpeg","audio/mp3","audio/wav","audio/x-wav","audio/mp4","audio/ogg","audio/webm"].includes(audio.type)) return json({ error: "invalid_audio" }, 422);
  if (typeof transcript !== "string" || !transcript.trim() || transcript.length > 50_000 || typeof sectionId !== "string" || !validId(sectionId) || typeof title !== "string" || !title.trim() || title.length > 200 || typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) || typeof level !== "string" || level.length > 30 || !Number.isInteger(durationMs) || durationMs <= 0 || durationMs > 3_600_000) return json({ error: "invalid_import_metadata" }, 422);
  const sql = sqlFor(env), sectionRows = await sql`SELECT s.id FROM listening_sections s JOIN listening_categories c ON c.id=s.category_id JOIN languages l ON l.id=c.language_id WHERE s.id=${sectionId} AND l.code='en'`; if (!sectionRows.length) return json({ error: "invalid_section" }, 422);
  const lessonId = crypto.randomUUID(), jobId = crypto.randomUUID(), extension = audio.name.toLocaleLowerCase().split(".").at(-1)?.replace(/[^a-z0-9]/gu, "") || "mp3", audioKey = `listening/en/lessons/${lessonId}/audio.${extension}`;
  await env.LISTENING_AUDIO.put(audioKey, audio, { httpMetadata: { contentType: audio.type, cacheControl: "public, max-age=86400" } });
  await sql`INSERT INTO listening_import_jobs(id,created_by,status,source_audio_key,source_transcript) VALUES(${jobId},${session.id},'ALIGNING',${audioKey},${transcript.trim()})`;
  try {
    const sentences = await alignLessonImport(env, audio, transcript, durationMs);
    await sql.transaction(async tx => {
      await tx`INSERT INTO listening_lessons(id,section_id,slug,title,level,audio_key,duration_ms,sentence_count,metadata,sort_order,is_published,import_job_id) VALUES(${lessonId},${sectionId},${slug},${title.trim()},${level||null},${audioKey},${durationMs},${sentences.length},${JSON.stringify({alignmentProvider:"workers-ai-whisper"})}::jsonb,999,false,${jobId})`;
      for (const sentence of sentences) await tx`INSERT INTO listening_sentences(id,lesson_id,position,transcript,normalized_transcript,start_ms,end_ms,metadata) VALUES(${crypto.randomUUID()},${lessonId},${sentence.position},${sentence.text},${getNormalizer("en").normalize(sentence.text)},${sentence.startMs},${sentence.endMs},${JSON.stringify({confidence:sentence.confidence??null})}::jsonb)`;
      await tx`UPDATE listening_import_jobs SET lesson_id=${lessonId},status='READY_FOR_REVIEW',updated_at=now() WHERE id=${jobId}`;
    });
    const reviewRows = await sql`SELECT id,position,transcript AS text,start_ms AS "startMs",end_ms AS "endMs" FROM listening_sentences WHERE lesson_id=${lessonId} ORDER BY position`;
    return json({ jobId, lessonId, status: "READY_FOR_REVIEW", sentences: reviewRows });
  } catch (error) { const message = error instanceof Error ? error.message.slice(0,500) : "alignment_failed"; await sql`UPDATE listening_import_jobs SET status='FAILED',error_message=${message},updated_at=now() WHERE id=${jobId}`; return json({ error: "alignment_failed", jobId }, 422); }
}

async function reviewLesson(request: Request, env: Env, url: URL) {
  const lessonId = validId(url.pathname.slice("/api/listening/admin/lessons/".length)); if (!lessonId) return json({ error: "invalid_lesson" }, 422);
  let body: Record<string, unknown>;
  try { body = await boundedJson<Record<string, unknown>>(request); }
  catch (error) { return error instanceof RequestBodyError ? json({ error: error.message }, error.status) : json({ error: "invalid_json" }, 400); }
  if (!Array.isArray(body.sentences) || body.sentences.length < 1 || body.sentences.length > 1000 || typeof body.publish !== "boolean") return json({ error: "invalid_review" }, 422);
  const sentences: Array<AlignedSentence & { id: string }> = [];
  for (const raw of body.sentences) { if (!raw || typeof raw !== "object") return json({ error: "invalid_review" }, 422); const item = raw as Record<string,unknown>; if (typeof item.id !== "string" || !validId(item.id) || typeof item.text !== "string" || !item.text.trim() || !Number.isInteger(item.position) || !Number.isInteger(item.startMs) || !Number.isInteger(item.endMs)) return json({ error: "invalid_review" }, 422); sentences.push({ id:item.id, text:item.text.trim(), position:Number(item.position), startMs:Number(item.startMs), endMs:Number(item.endMs) }); }
  const sql = sqlFor(env), lessonRows = await sql`SELECT duration_ms,audio_key,import_job_id FROM listening_lessons WHERE id=${lessonId} AND is_published=false`; if (!lessonRows.length) return json({ error: "not_found" }, 404);
  const existingRows=await sql`SELECT id FROM listening_sentences WHERE lesson_id=${lessonId}`;const existingIds=new Set(existingRows.map(row=>String(row.id)));if(existingIds.size!==sentences.length||sentences.some(sentence=>!existingIds.has(sentence.id)))return json({error:"sentence_set_mismatch"},422);
  const errors = validateAlignedSentences(sentences, Number(lessonRows[0].duration_ms)); if (errors.length) return json({ error: "validation_failed", details: errors }, 422);
  if (body.publish && !(await env.LISTENING_AUDIO.head(String(lessonRows[0].audio_key)))) return json({ error: "audio_missing" }, 422);
  await sql.transaction(async tx => { for (const sentence of sentences) await tx`UPDATE listening_sentences SET position=${sentence.position},transcript=${sentence.text},normalized_transcript=${getNormalizer("en").normalize(sentence.text)},start_ms=${sentence.startMs},end_ms=${sentence.endMs},updated_at=now() WHERE id=${sentence.id} AND lesson_id=${lessonId}`; await tx`UPDATE listening_lessons SET sentence_count=${sentences.length},is_published=${body.publish},updated_at=now() WHERE id=${lessonId}`; if (body.publish) await tx`UPDATE listening_import_jobs SET status='PUBLISHED',updated_at=now() WHERE id=${lessonRows[0].import_job_id}`; });
  return json({ ok: true, published: body.publish });
}

async function boundedJson<T>(request: Request): Promise<T> { if(!request.body)throw new RequestBodyError("missing_body",400);const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;while(true){const{value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_JSON_BYTES){await reader.cancel();throw new RequestBodyError("body_too_large",413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return JSON.parse(new TextDecoder().decode(bytes)) as T; }
