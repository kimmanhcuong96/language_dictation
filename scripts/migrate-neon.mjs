import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const sql = postgres(connectionString, { max: 1, prepare: false });
try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await sql`SELECT pg_advisory_lock(714923)`;
  const files = (await readdir("db/migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const applied = await sql`SELECT 1 FROM schema_migrations WHERE version = ${version}`;
    if (applied.length) continue;
    const contents = await readFile(`db/migrations/${file}`, "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(contents);
      await tx`INSERT INTO schema_migrations(version) VALUES(${version}) ON CONFLICT DO NOTHING`;
    });
    console.log(`Applied ${file}`);
  }
  await sql`SELECT pg_advisory_unlock(714923)`;
} finally { await sql.end({ timeout: 5 }); }
