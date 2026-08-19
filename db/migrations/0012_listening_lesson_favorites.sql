CREATE TABLE IF NOT EXISTS listening_lesson_favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES listening_lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS listening_lesson_favorites_lesson_idx
  ON listening_lesson_favorites(lesson_id, created_at DESC);

CREATE INDEX IF NOT EXISTS listening_lesson_favorites_user_idx
  ON listening_lesson_favorites(user_id, created_at DESC);
