PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 2 AND 40),
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE oauth_attempts (
  state_hash TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  return_to TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX oauth_attempts_expires_at_idx ON oauth_attempts(expires_at);

CREATE TABLE progress_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK(language IN ('en', 'zh', 'ja')),
  sentence_index INTEGER NOT NULL CHECK(sentence_index >= 0),
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
  duration_seconds INTEGER NOT NULL CHECK(duration_seconds BETWEEN 1 AND 300),
  completed INTEGER NOT NULL CHECK(completed IN (0, 1)),
  occurred_at INTEGER NOT NULL,
  activity_day TEXT NOT NULL
);

CREATE INDEX progress_events_user_time_idx ON progress_events(user_id, occurred_at DESC);
CREATE INDEX progress_events_period_idx ON progress_events(occurred_at DESC, user_id);
CREATE INDEX progress_events_lesson_idx ON progress_events(user_id, lesson_id, sentence_index);
CREATE UNIQUE INDEX progress_events_daily_completion_idx
  ON progress_events(user_id, activity_day, lesson_id, sentence_index)
  WHERE completed = 1;

CREATE TABLE lesson_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK(language IN ('en', 'zh', 'ja')),
  sentence_index INTEGER NOT NULL,
  best_score INTEGER NOT NULL CHECK(best_score BETWEEN 0 AND 100),
  attempts INTEGER NOT NULL DEFAULT 1,
  completed INTEGER NOT NULL CHECK(completed IN (0, 1)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, lesson_id, sentence_index)
);

CREATE INDEX lesson_progress_user_idx ON lesson_progress(user_id, language, updated_at DESC);
