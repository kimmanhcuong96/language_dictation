import { readFile, readdir } from "node:fs/promises";
import postgres from "postgres";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL is required; production DATABASE_URL is intentionally ignored");

const schema = `migration_test_${crypto.randomUUID().replaceAll("-", "")}`;
const sql = postgres(connectionString, { max: 1, prepare: false });

async function apply(file) {
  const contents = await readFile(`db/migrations/${file}`, "utf8");
  await sql.begin((tx) => tx.unsafe(contents));
}

try {
  await sql.unsafe(`CREATE SCHEMA "${schema}"`);
  await sql.unsafe(`SET search_path TO "${schema}"`);
  const files = (await readdir("db/migrations")).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files.filter((file) => file < "0014_")) await apply(file);

  await sql`
    INSERT INTO listening_lessons(id, section_id, slug, title, audio_key, sort_order)
    VALUES
      ('legacy-zero-a', 'section-en-short-stories-1', 'legacy-zero-a', 'Legacy zero A', 'legacy/a.mp3', 0),
      ('legacy-zero-b', 'section-en-short-stories-1', 'legacy-zero-b', 'Legacy zero B', 'legacy/b.mp3', 0),
      ('legacy-two-a', 'section-en-short-stories-1', 'legacy-two-a', 'Legacy two A', 'legacy/c.mp3', 2),
      ('legacy-two-b', 'section-en-short-stories-1', 'legacy-two-b', 'Legacy two B', 'legacy/d.mp3', 2)
  `;

  for (const file of files.filter((file) => file >= "0014_")) await apply(file);
  await sql`SELECT original_names_name FROM listening_import_batch_items LIMIT 0`;
  await sql`SELECT id, sentence_id, user_id, body, status, created_at FROM listening_sentence_comments LIMIT 0`;
  await sql`SELECT id, comment_id, reporter_user_id, reason, details, created_at FROM listening_sentence_comment_reports LIMIT 0`;
  await sql`SELECT id, comment_id, target_user_id, actor_user_id, action, reason, body_snapshot FROM listening_sentence_comment_moderation_log LIMIT 0`;
  await sql`SELECT id, user_id, source, resource_id, duration_seconds, occurred_at FROM learning_activity_events LIMIT 0`;
  await sql`SELECT study_7_day_limit, study_30_day_limit, translation_7_day_limit, translation_30_day_limit FROM leaderboard_settings WHERE singleton=TRUE`;
  await sql`SELECT id, actor_user_id, previous_settings, next_settings, created_at FROM leaderboard_settings_audit_log LIMIT 0`;
  const leaderboardIndexes = await sql`SELECT indexdef FROM pg_indexes WHERE schemaname=current_schema() AND indexname='listening_translation_contributions_approved_period_idx'`;
  if (leaderboardIndexes.length !== 1 || !String(leaderboardIndexes[0].indexdef).includes("approved_at")) {
    throw new Error("approved translation contribution leaderboard index is missing or invalid");
  }
  await sql`INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('migration-leaderboard-admin','migration-leaderboard-admin','migration-leaderboard-admin@example.test','Migration Admin',0,0)`;
  await sql`UPDATE leaderboard_settings SET study_7_day_limit=37,updated_by='migration-leaderboard-admin' WHERE singleton=TRUE`;
  const leaderboardAudits = await sql`SELECT actor_user_id,previous_settings,next_settings FROM leaderboard_settings_audit_log ORDER BY created_at DESC LIMIT 1`;
  if (leaderboardAudits.length !== 1
    || leaderboardAudits[0].actor_user_id !== "migration-leaderboard-admin"
    || Number(leaderboardAudits[0].previous_settings.study7DayLimit) !== 50
    || Number(leaderboardAudits[0].next_settings.study7DayLimit) !== 37) {
    throw new Error(`leaderboard settings audit trigger failed: ${JSON.stringify(leaderboardAudits)}`);
  }

  const lessons = await sql`SELECT id, sort_order, template_type, media_type FROM listening_lessons ORDER BY id`;
  const orders = lessons.map((lesson) => Number(lesson.sort_order));
  if (new Set(orders).size !== lessons.length || orders.some((order) => order < 1 || order > 99)) {
    throw new Error(`lesson order migration invariant failed: ${JSON.stringify(lessons)}`);
  }
  if (lessons.some((lesson) => lesson.template_type !== "audio" || lesson.media_type !== "r2_audio")) {
    throw new Error(`YouTube migration audio backfill failed: ${JSON.stringify(lessons)}`);
  }
  const audits = await sql`SELECT lesson_id, previous_sort_order, assigned_sort_order, reason FROM listening_lesson_order_migration_audit ORDER BY lesson_id`;
  if (audits.length !== 3 || audits.some((audit) => Number(audit.previous_sort_order) === Number(audit.assigned_sort_order))) {
    throw new Error(`legacy order audit failed: ${JSON.stringify(audits)}`);
  }
  console.log(`Migration integration test passed with ${lessons.length} legacy lessons and ${audits.length} audited rewrites`);
} finally {
  if (/^migration_test_[a-f0-9]{32}$/u.test(schema)) await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await sql.end({ timeout: 5 });
}
