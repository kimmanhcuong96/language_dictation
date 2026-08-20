-- Transaction boundary is owned by scripts/migrate-neon.mjs, which executes
-- each migration and its schema_migrations record in one sql.begin callback.
-- Do not add BEGIN/COMMIT here: doing so would interfere with that atomic unit.
ALTER TABLE listening_lessons
  ADD COLUMN IF NOT EXISTS template_type TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;

UPDATE listening_lessons
SET template_type = 'audio',
    media_type = 'r2_audio'
WHERE template_type IS NULL OR media_type IS NULL;

ALTER TABLE listening_lessons
  ALTER COLUMN template_type SET NOT NULL,
  ALTER COLUMN media_type SET NOT NULL,
  ALTER COLUMN template_type SET DEFAULT 'audio',
  ALTER COLUMN media_type SET DEFAULT 'r2_audio',
  DROP CONSTRAINT IF EXISTS listening_lessons_template_type_check,
  DROP CONSTRAINT IF EXISTS listening_lessons_media_type_check,
  DROP CONSTRAINT IF EXISTS listening_lessons_media_consistency_check;

ALTER TABLE listening_lessons
  ADD CONSTRAINT listening_lessons_template_type_check
    CHECK (template_type IN ('audio', 'media')),
  ADD CONSTRAINT listening_lessons_media_type_check
    CHECK (media_type IN ('r2_audio', 'youtube')),
  ADD CONSTRAINT listening_lessons_media_consistency_check CHECK (
    (template_type = 'audio' AND media_type = 'r2_audio' AND youtube_video_id IS NULL)
    OR
    (template_type = 'media' AND media_type = 'youtube' AND audio_key IS NULL AND youtube_video_id IS NOT NULL AND youtube_video_id ~ '^[A-Za-z0-9_-]{11}$')
  );

ALTER TABLE listening_import_jobs
  ALTER COLUMN source_audio_key DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'r2_audio',
  ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;

ALTER TABLE listening_import_jobs
  DROP CONSTRAINT IF EXISTS listening_import_jobs_media_type_check,
  DROP CONSTRAINT IF EXISTS listening_import_jobs_media_consistency_check;
ALTER TABLE listening_import_jobs
  ADD CONSTRAINT listening_import_jobs_media_type_check
    CHECK (media_type IN ('r2_audio', 'youtube')),
  ADD CONSTRAINT listening_import_jobs_media_consistency_check CHECK (
    (media_type = 'r2_audio' AND source_audio_key IS NOT NULL AND youtube_video_id IS NULL)
    OR
    (media_type = 'youtube' AND source_audio_key IS NULL AND youtube_video_id IS NOT NULL AND youtube_video_id ~ '^[A-Za-z0-9_-]{11}$')
  );

ALTER TABLE listening_import_batch_items
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'audio',
  ADD COLUMN IF NOT EXISTS original_link_name TEXT,
  ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;

ALTER TABLE listening_import_batch_items
  DROP CONSTRAINT IF EXISTS listening_import_batch_items_source_type_check;
ALTER TABLE listening_import_batch_items
  ADD CONSTRAINT listening_import_batch_items_source_type_check
    CHECK (source_type IN ('audio', 'youtube'));

COMMENT ON COLUMN listening_lessons.template_type IS 'Explicit client template selector: audio or media';
COMMENT ON COLUMN listening_lessons.media_type IS 'Lesson media source: r2_audio or youtube';
COMMENT ON COLUMN listening_lessons.youtube_video_id IS 'External YouTube video ID; the video is never copied to R2';
COMMENT ON COLUMN listening_lessons.sort_order IS 'Section-scoped order; audio packages use NN_ and unnumbered YouTube packages receive the first free 01-99 slot deterministically';
