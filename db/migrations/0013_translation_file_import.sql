-- Normalize the initial translation registry to the import contract and remove
-- machine-translation-only state. Existing Google-authored translation rows are
-- retained as historical content.
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_preferred_translation_language_code_fkey;
ALTER TABLE listening_lesson_translation_sets
  DROP CONSTRAINT IF EXISTS listening_lesson_translation_sets_language_code_fkey;
ALTER TABLE listening_sentence_translation_versions
  DROP CONSTRAINT IF EXISTS listening_sentence_translation_versions_language_code_fkey;

UPDATE listening_translation_languages
SET code = 'zh',
    name = 'Chinese',
    native_name = '中文',
    updated_at = now()
WHERE code = 'zh-CN'
  AND NOT EXISTS (SELECT 1 FROM listening_translation_languages WHERE code = 'zh');

UPDATE users SET preferred_translation_language_code = 'zh'
WHERE preferred_translation_language_code = 'zh-CN';
UPDATE listening_lesson_translation_sets SET language_code = 'zh'
WHERE language_code = 'zh-CN';
UPDATE listening_sentence_translation_versions SET language_code = 'zh'
WHERE language_code = 'zh-CN';
UPDATE listening_translation_audit_log SET language_code = 'zh'
WHERE language_code = 'zh-CN';
DELETE FROM listening_translation_languages WHERE code = 'zh-CN';

INSERT INTO listening_translation_languages(code,name,native_name,is_builtin,status)
VALUES ('vi','Vietnamese','Tiếng Việt',TRUE,'ACTIVE'),
       ('zh','Chinese','中文',TRUE,'ACTIVE'),
       ('ja','Japanese','日本語',TRUE,'ACTIVE'),
       ('ko','Korean','한국어',TRUE,'ACTIVE')
ON CONFLICT(code) DO UPDATE SET
  name=EXCLUDED.name,
  native_name=EXCLUDED.native_name,
  is_builtin=TRUE,
  status='ACTIVE',
  updated_at=now();

ALTER TABLE users
  ADD CONSTRAINT users_preferred_translation_language_code_fkey
  FOREIGN KEY(preferred_translation_language_code) REFERENCES listening_translation_languages(code)
  ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE listening_lesson_translation_sets
  ADD CONSTRAINT listening_lesson_translation_sets_language_code_fkey
  FOREIGN KEY(language_code) REFERENCES listening_translation_languages(code)
  ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE listening_sentence_translation_versions
  ADD CONSTRAINT listening_sentence_translation_versions_language_code_fkey
  FOREIGN KEY(language_code) REFERENCES listening_translation_languages(code)
  ON UPDATE CASCADE ON DELETE RESTRICT;

DROP INDEX IF EXISTS listening_sentence_translations_google_pending_idx;
ALTER TABLE listening_translation_languages DROP COLUMN IF EXISTS machine_translation_enabled;
ALTER TABLE listening_lesson_translation_sets
  DROP COLUMN IF EXISTS machine_status,
  DROP COLUMN IF EXISTS attempt_count,
  DROP COLUMN IF EXISTS last_error;

ALTER TABLE listening_import_batch_items
  ADD COLUMN IF NOT EXISTS translation_files JSONB NOT NULL DEFAULT '{}'::jsonb;
