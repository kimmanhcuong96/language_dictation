CREATE TABLE IF NOT EXISTS listening_canonical_paths (
  path TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL UNIQUE REFERENCES listening_lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO listening_canonical_paths(path, lesson_id)
SELECT '/lessons/' || COALESCE(NULLIF(trim(BOTH '-' FROM regexp_replace(lower(COALESCE(NULLIF(l.level, ''), 'all')), '[^a-z0-9]+', '-', 'g')), ''), 'all') || '/' || c.slug || '/' || l.slug,
       l.id
FROM listening_lessons l
JOIN listening_sections s ON s.id=l.section_id
JOIN listening_categories c ON c.id=s.category_id
ON CONFLICT(lesson_id) DO UPDATE SET path=EXCLUDED.path, updated_at=now();
