CREATE TABLE IF NOT EXISTS listening_lesson_redirects (
  old_path TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES listening_lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listening_lesson_redirects_lesson_idx ON listening_lesson_redirects(lesson_id);
