CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 40),
  avatar_url TEXT,
  leaderboard_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS oauth_attempts (
  state_hash TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  return_to TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_attempts_expiry_idx ON oauth_attempts(expires_at);
CREATE TABLE IF NOT EXISTS progress_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en','zh','ja')),
  sentence_index INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 1 AND 300),
  completed BOOLEAN NOT NULL,
  occurred_at BIGINT NOT NULL,
  activity_day DATE NOT NULL
);
CREATE INDEX IF NOT EXISTS progress_events_period_idx ON progress_events(occurred_at, completed);
CREATE UNIQUE INDEX IF NOT EXISTS progress_events_daily_completion_idx ON progress_events(user_id, activity_day, lesson_id, sentence_index) WHERE completed = TRUE;
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en','zh','ja')),
  sentence_index INTEGER NOT NULL,
  best_score INTEGER NOT NULL CHECK (best_score BETWEEN 0 AND 100),
  attempts INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, lesson_id, language, sentence_index)
);
CREATE INDEX IF NOT EXISTS lesson_progress_user_idx ON lesson_progress(user_id, updated_at DESC);

INSERT INTO schema_migrations(version) VALUES ('0001_initial') ON CONFLICT DO NOTHING;
