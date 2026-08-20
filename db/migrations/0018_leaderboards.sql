CREATE TABLE IF NOT EXISTS learning_activity_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('LEGACY_DICTATION', 'LISTENING')),
  resource_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 1 AND 300),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_activity_events_period_idx
  ON learning_activity_events(occurred_at DESC, user_id);

CREATE INDEX IF NOT EXISTS learning_activity_events_user_period_idx
  ON learning_activity_events(user_id, occurred_at DESC);

-- Preserve learning time already recorded by the original dictation flow.
INSERT INTO learning_activity_events(id, user_id, source, resource_id, duration_seconds, occurred_at)
SELECT 'legacy:' || id, user_id, 'LEGACY_DICTATION', lesson_id || ':' || sentence_index,
  LEAST(duration_seconds, 300), to_timestamp(occurred_at)
FROM progress_events
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS leaderboard_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
  study_7_day_limit INTEGER NOT NULL DEFAULT 50 CHECK (study_7_day_limit BETWEEN 1 AND 100),
  study_30_day_limit INTEGER NOT NULL DEFAULT 50 CHECK (study_30_day_limit BETWEEN 1 AND 100),
  translation_7_day_limit INTEGER NOT NULL DEFAULT 50 CHECK (translation_7_day_limit BETWEEN 1 AND 100),
  translation_30_day_limit INTEGER NOT NULL DEFAULT 50 CHECK (translation_30_day_limit BETWEEN 1 AND 100),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO leaderboard_settings(singleton) VALUES (TRUE)
ON CONFLICT(singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS leaderboard_settings_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  previous_settings JSONB NOT NULL,
  next_settings JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaderboard_settings_audit_created_idx
  ON leaderboard_settings_audit_log(created_at DESC);

-- Supports the contribution leaderboard without scanning imported/admin translations.
CREATE INDEX IF NOT EXISTS listening_translation_contributions_period_idx
  ON listening_sentence_translation_versions(approved_at DESC, submitted_by, sentence_id, language_code)
  WHERE source = 'USER' AND submitted_by IS NOT NULL AND approved_at IS NOT NULL;
