CREATE TABLE IF NOT EXISTS languages (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listening_categories (
  id TEXT PRIMARY KEY,
  language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(language_id, slug)
);
CREATE INDEX IF NOT EXISTS listening_categories_language_idx ON listening_categories(language_id, sort_order);

CREATE TABLE IF NOT EXISTS listening_sections (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES listening_categories(id) ON DELETE RESTRICT,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, number)
);
CREATE INDEX IF NOT EXISTS listening_sections_category_idx ON listening_sections(category_id, sort_order);

CREATE TABLE IF NOT EXISTS listening_lessons (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES listening_sections(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT,
  audio_key TEXT,
  duration_ms INTEGER,
  sentence_count INTEGER NOT NULL DEFAULT 0,
  thumbnail_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section_id, slug)
);
CREATE INDEX IF NOT EXISTS listening_lessons_section_idx ON listening_lessons(section_id, sort_order);

CREATE TABLE IF NOT EXISTS listening_sentences (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES listening_lessons(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  transcript TEXT NOT NULL,
  normalized_transcript TEXT NOT NULL,
  start_ms INTEGER NOT NULL CHECK (start_ms >= 0),
  end_ms INTEGER NOT NULL CHECK (end_ms > start_ms),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, position)
);
CREATE INDEX IF NOT EXISTS listening_sentences_lesson_idx ON listening_sentences(lesson_id, position);

CREATE TABLE IF NOT EXISTS listening_lesson_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES listening_lessons(id) ON DELETE CASCADE,
  current_sentence_position INTEGER NOT NULL DEFAULT 1,
  completed_sentence_count INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY(user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS listening_lesson_progress_user_idx ON listening_lesson_progress(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS listening_sentence_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sentence_id TEXT NOT NULL REFERENCES listening_sentences(id) ON DELETE CASCADE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  first_try_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY(user_id, sentence_id)
);

CREATE TABLE IF NOT EXISTS listening_manifest_meta (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO listening_manifest_meta(id, version) VALUES (TRUE, 1)
ON CONFLICT(id) DO NOTHING;

INSERT INTO languages(id, code, name, native_name, sort_order, is_enabled)
VALUES ('language-en', 'en', 'English', 'English', 1, TRUE),
       ('language-ja', 'ja', 'Japanese', '日本語', 2, TRUE),
       ('language-zh', 'zh', 'Chinese', '中文', 3, TRUE)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name, native_name=EXCLUDED.native_name, is_enabled=EXCLUDED.is_enabled, updated_at=now();

INSERT INTO listening_categories(id, language_id, slug, name, sort_order, is_published)
SELECT 'category-en-' || item.slug, l.id, item.slug, item.name, item.sort_order, TRUE
FROM languages l
CROSS JOIN (VALUES ('short-stories','Short Stories',1),('long-listening','Long Listening',2),('conversations','Conversations',3)) AS item(slug,name,sort_order)
WHERE l.code='en'
ON CONFLICT(language_id, slug) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order, is_published=TRUE, updated_at=now();

INSERT INTO listening_sections(id, category_id, number, title, sort_order, is_published)
SELECT 'section-en-' || c.slug || '-1', c.id, 1, 'Section 1', 1, TRUE
FROM listening_categories c
JOIN languages l ON l.id=c.language_id
WHERE l.code='en'
ON CONFLICT(category_id, number) DO UPDATE SET is_published=TRUE, updated_at=now();
