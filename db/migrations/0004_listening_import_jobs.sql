CREATE TABLE IF NOT EXISTS listening_import_jobs (
  id TEXT PRIMARY KEY,
  lesson_id TEXT REFERENCES listening_lessons(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('UPLOADED','PROCESSING','ALIGNING','VALIDATING','READY_FOR_REVIEW','PUBLISHED','FAILED')),
  source_audio_key TEXT NOT NULL,
  source_transcript TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listening_import_jobs_creator_idx ON listening_import_jobs(created_by, updated_at DESC);

ALTER TABLE listening_lessons ADD COLUMN IF NOT EXISTS import_job_id TEXT REFERENCES listening_import_jobs(id) ON DELETE SET NULL;
