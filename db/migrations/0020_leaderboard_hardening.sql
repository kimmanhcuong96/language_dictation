-- Forward-only repair for databases that applied 0018 before leaderboard
-- settings auditing and approved-contribution indexing were introduced.
-- Transaction boundary is owned by scripts/migrate-neon.mjs.
CREATE TABLE IF NOT EXISTS leaderboard_settings_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  previous_settings JSONB NOT NULL,
  next_settings JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaderboard_settings_audit_created_idx
  ON leaderboard_settings_audit_log(created_at DESC);

-- Use a new index name so an older index with a different definition cannot
-- make IF NOT EXISTS silently retain the wrong access path.
CREATE INDEX IF NOT EXISTS listening_translation_contributions_approved_period_idx
  ON listening_sentence_translation_versions(approved_at DESC, submitted_by, sentence_id, language_code)
  WHERE source = 'USER' AND submitted_by IS NOT NULL AND approved_at IS NOT NULL;

DROP INDEX IF EXISTS listening_translation_contributions_period_idx;
