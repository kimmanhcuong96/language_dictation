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
