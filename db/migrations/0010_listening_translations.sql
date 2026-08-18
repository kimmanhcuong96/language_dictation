CREATE TABLE IF NOT EXISTS listening_translation_languages (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-z]{2,3}(-[A-Za-z0-9]{1,8})*$'),
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  machine_translation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'DISABLED')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO listening_translation_languages(code,name,native_name,is_builtin,machine_translation_enabled,status)
VALUES ('vi','Vietnamese','Tiếng Việt',TRUE,TRUE,'ACTIVE'),
       ('zh-CN','Chinese (Simplified)','简体中文',TRUE,TRUE,'ACTIVE'),
       ('ja','Japanese','日本語',TRUE,TRUE,'ACTIVE')
ON CONFLICT(code) DO UPDATE SET
  name=EXCLUDED.name,
  native_name=EXCLUDED.native_name,
  is_builtin=TRUE,
  machine_translation_enabled=TRUE,
  status='ACTIVE',
  updated_at=now();

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_translation_language_code TEXT REFERENCES listening_translation_languages(code) ON DELETE SET NULL DEFAULT 'vi';

CREATE TABLE IF NOT EXISTS listening_lesson_translation_sets (
  lesson_id TEXT NOT NULL REFERENCES listening_lessons(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES listening_translation_languages(code) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING','PARTIALLY_APPROVED','APPROVED','FAILED')),
  machine_status TEXT NOT NULL DEFAULT 'NOT_REQUESTED' CHECK (machine_status IN ('NOT_REQUESTED','PENDING','PROCESSING','COMPLETED','FAILED','NOT_CONFIGURED')),
  requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(lesson_id, language_code)
);
CREATE INDEX IF NOT EXISTS listening_translation_sets_status_idx ON listening_lesson_translation_sets(status, updated_at DESC);

INSERT INTO listening_lesson_translation_sets(lesson_id,language_code,status,machine_status)
SELECT lesson.id,lang.code,'DRAFT','NOT_REQUESTED'
FROM listening_lessons lesson
JOIN listening_sections section ON section.id=lesson.section_id
JOIN listening_categories category ON category.id=section.category_id
JOIN languages source_language ON source_language.id=category.language_id
CROSS JOIN listening_translation_languages lang
WHERE lesson.is_published=TRUE
  AND lang.machine_translation_enabled=TRUE
  AND lang.status='ACTIVE'
  AND lang.code<>CASE WHEN source_language.code='zh' THEN 'zh-CN' ELSE source_language.code END
ON CONFLICT(lesson_id,language_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS listening_sentence_translation_versions (
  id TEXT PRIMARY KEY,
  sentence_id TEXT NOT NULL REFERENCES listening_sentences(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES listening_translation_languages(code) ON DELETE RESTRICT,
  translated_text TEXT NOT NULL CHECK (length(btrim(translated_text)) > 0),
  source TEXT NOT NULL CHECK (source IN ('GOOGLE','USER','ADMIN')),
  status TEXT NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED','SUPERSEDED','FAILED')),
  submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listening_sentence_translations_lookup_idx ON listening_sentence_translation_versions(sentence_id, language_code, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS listening_sentence_translations_language_idx ON listening_sentence_translation_versions(language_code, status, sentence_id);
CREATE INDEX IF NOT EXISTS listening_sentence_translations_review_idx ON listening_sentence_translation_versions(status, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS listening_sentence_translations_current_approved_idx ON listening_sentence_translation_versions(sentence_id, language_code) WHERE status='APPROVED';
CREATE UNIQUE INDEX IF NOT EXISTS listening_sentence_translations_user_pending_idx ON listening_sentence_translation_versions(sentence_id, language_code, submitted_by) WHERE status='PENDING' AND submitted_by IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS listening_sentence_translations_google_pending_idx ON listening_sentence_translation_versions(sentence_id, language_code) WHERE status='PENDING' AND source='GOOGLE';

CREATE TABLE IF NOT EXISTS listening_translation_audit_log (
  id TEXT PRIMARY KEY,
  translation_id TEXT REFERENCES listening_sentence_translation_versions(id) ON DELETE SET NULL,
  lesson_id TEXT NOT NULL REFERENCES listening_lessons(id) ON DELETE CASCADE,
  sentence_id TEXT REFERENCES listening_sentences(id) ON DELETE SET NULL,
  language_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('GENERATED','SUBMITTED','UPDATED','APPROVED','REJECTED','SUPERSEDED','BULK_APPROVED')),
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listening_translation_audit_lesson_idx ON listening_translation_audit_log(lesson_id, language_code, created_at DESC);
