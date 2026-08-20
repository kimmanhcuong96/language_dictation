import { neon } from "@neondatabase/serverless";

export type LeaderboardMetric = "study_time" | "translations";
export type LeaderboardPeriod = "7d" | "30d";

export interface LeaderboardSettings {
  study7DayLimit: number;
  study30DayLimit: number;
  translation7DayLimit: number;
  translation30DayLimit: number;
  updatedAt: string;
}

type Sql = ReturnType<typeof neon>;
const sqlFor = (env: Env) => neon(env.DATABASE_URL);

export function rollingPeriodStart(period: LeaderboardPeriod, now = new Date()) {
  const days = period === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function getLeaderboard(env: Env, url: URL, currentUserId: string | null) {
  const metric = url.searchParams.get("metric") ?? "study_time";
  const period = url.searchParams.get("period") ?? "7d";
  if (metric !== "study_time" && metric !== "translations") return json({ error: "invalid_metric" }, 422);
  if (period !== "7d" && period !== "30d") return json({ error: "invalid_period" }, 422);

  const sql = sqlFor(env);
  const settings = await loadLeaderboardSettings(sql);
  const limit = leaderboardLimit(settings, metric, period);
  const startsAt = rollingPeriodStart(period);
  const rows = metric === "study_time"
    ? await sql`
      WITH totals AS (
        SELECT event.user_id, SUM(event.duration_seconds)::int AS value
        FROM learning_activity_events event
        WHERE event.occurred_at >= ${startsAt}
        GROUP BY event.user_id
      ), ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY totals.value DESC, users.created_at ASC, users.id ASC)::int AS rank,
          users.id AS user_id, users.display_name, users.avatar_url, totals.value
        FROM totals JOIN users ON users.id = totals.user_id
        WHERE users.leaderboard_visible = TRUE
      )
      SELECT rank, user_id, display_name, avatar_url, value
      FROM ranked
      WHERE rank <= ${limit} OR user_id = ${currentUserId ?? ""}
      ORDER BY rank ASC`
    : await sql`
      WITH totals AS (
        SELECT contribution.submitted_by AS user_id,
          COUNT(DISTINCT (contribution.sentence_id, contribution.language_code))::int AS value
        FROM listening_sentence_translation_versions contribution
        WHERE contribution.source = 'USER'
          AND contribution.submitted_by IS NOT NULL
          AND contribution.approved_at IS NOT NULL
          AND contribution.approved_at >= ${startsAt}
        GROUP BY contribution.submitted_by
      ), ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY totals.value DESC, users.created_at ASC, users.id ASC)::int AS rank,
          users.id AS user_id, users.display_name, users.avatar_url, totals.value
        FROM totals JOIN users ON users.id = totals.user_id
        WHERE users.leaderboard_visible = TRUE
      )
      SELECT rank, user_id, display_name, avatar_url, value
      FROM ranked
      WHERE rank <= ${limit} OR user_id = ${currentUserId ?? ""}
      ORDER BY rank ASC`;

  return json({ metric, period, limit, startsAt: startsAt.toISOString(), leaders: rows, currentUserId });
}

export async function getLeaderboardSettings(env: Env) {
  return json({ settings: await loadLeaderboardSettings(sqlFor(env)) });
}

export async function updateLeaderboardSettings(request: Request, env: Env, updatedBy: string) {
  let body: unknown;
  try { body = await boundedJson(request); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "invalid_json" }, 400); }
  const settings = parseSettings(body);
  if (!settings) return json({ error: "invalid_leaderboard_settings" }, 422);
  const sql = sqlFor(env);
  const auditId = crypto.randomUUID();
  const rows = await sql`
    WITH previous AS MATERIALIZED (
      SELECT singleton,study_7_day_limit,study_30_day_limit,translation_7_day_limit,translation_30_day_limit
      FROM leaderboard_settings WHERE singleton=TRUE
      FOR UPDATE
    ), updated AS (
      UPDATE leaderboard_settings AS target SET
        study_7_day_limit=${settings.study7DayLimit},
        study_30_day_limit=${settings.study30DayLimit},
        translation_7_day_limit=${settings.translation7DayLimit},
        translation_30_day_limit=${settings.translation30DayLimit},
        updated_by=${updatedBy}, updated_at=now()
      FROM previous
      WHERE target.singleton=previous.singleton
      RETURNING target.study_7_day_limit,target.study_30_day_limit,target.translation_7_day_limit,target.translation_30_day_limit,target.updated_at
    ), audit AS (
      INSERT INTO leaderboard_settings_audit_log(id,actor_user_id,previous_settings,next_settings)
      VALUES (${auditId},${updatedBy},
        (SELECT jsonb_build_object(
          'study7DayLimit',previous.study_7_day_limit,
          'study30DayLimit',previous.study_30_day_limit,
          'translation7DayLimit',previous.translation_7_day_limit,
          'translation30DayLimit',previous.translation_30_day_limit
        ) FROM previous),
        (SELECT jsonb_build_object(
          'study7DayLimit',updated.study_7_day_limit,
          'study30DayLimit',updated.study_30_day_limit,
          'translation7DayLimit',updated.translation_7_day_limit,
          'translation30DayLimit',updated.translation_30_day_limit
        ) FROM updated)
      )
      RETURNING id
    )
    SELECT updated.* FROM updated CROSS JOIN audit`;
  if (!rows[0]) throw new Error("leaderboard_settings_update_failed");
  return json({ settings: mapSettings(rows[0]) });
}

export async function pruneLeaderboardData(env: Env) {
  const rows = await sqlFor(env)`DELETE FROM learning_activity_events WHERE occurred_at < now() - INTERVAL '90 days' RETURNING id`;
  console.log(JSON.stringify({ event:"leaderboard_retention_pruned", deleted:rows.length }));
}

function leaderboardLimit(settings: LeaderboardSettings, metric: LeaderboardMetric, period: LeaderboardPeriod) {
  if (metric === "study_time") return period === "7d" ? settings.study7DayLimit : settings.study30DayLimit;
  return period === "7d" ? settings.translation7DayLimit : settings.translation30DayLimit;
}

async function loadLeaderboardSettings(sql: Sql): Promise<LeaderboardSettings> {
  const rows = await sql`SELECT study_7_day_limit,study_30_day_limit,translation_7_day_limit,translation_30_day_limit,updated_at FROM leaderboard_settings WHERE singleton=TRUE`;
  if (!rows[0]) throw new Error("leaderboard_settings_missing");
  return mapSettings(rows[0]);
}

function mapSettings(row: Record<string, unknown>): LeaderboardSettings {
  return {
    study7DayLimit: Number(row.study_7_day_limit),
    study30DayLimit: Number(row.study_30_day_limit),
    translation7DayLimit: Number(row.translation_7_day_limit),
    translation30DayLimit: Number(row.translation_30_day_limit),
    updatedAt: String(row.updated_at),
  };
}

function parseSettings(value: unknown): Omit<LeaderboardSettings, "updatedAt"> | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const keys = ["study7DayLimit", "study30DayLimit", "translation7DayLimit", "translation30DayLimit"] as const;
  if (keys.some((key) => !Number.isInteger(input[key]) || Number(input[key]) < 1 || Number(input[key]) > 100)) return null;
  return Object.fromEntries(keys.map((key) => [key, Number(input[key])])) as Omit<LeaderboardSettings, "updatedAt">;
}

async function boundedJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 16 * 1024) throw new Error("body_too_large");
  if (!request.body) throw new Error("missing_body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16 * 1024) { await reader.cancel(); throw new Error("body_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
  catch { throw new Error("invalid_json"); }
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
}
