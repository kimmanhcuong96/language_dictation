CREATE TABLE IF NOT EXISTS listening_import_batches (
  id TEXT PRIMARY KEY,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  section_id TEXT NOT NULL REFERENCES listening_sections(id) ON DELETE RESTRICT,
  input_method TEXT NOT NULL CHECK (input_method IN ('files', 'zip')),
  source_archive_key TEXT,
  level TEXT,
  status TEXT NOT NULL CHECK (status IN ('VALIDATED', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED')),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listening_import_batches_creator_idx ON listening_import_batches(created_by, updated_at DESC);

CREATE TABLE IF NOT EXISTS listening_import_batch_items (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES listening_import_batches(id) ON DELETE CASCADE,
  normalized_basename TEXT NOT NULL,
  lesson_name TEXT NOT NULL,
  slug TEXT,
  original_audio_name TEXT,
  original_srt_name TEXT,
  audio_duration_ms INTEGER,
  segment_count INTEGER,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('INVALID', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  lesson_id TEXT REFERENCES listening_lessons(id) ON DELETE SET NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, normalized_basename)
);
CREATE INDEX IF NOT EXISTS listening_import_batch_items_batch_idx ON listening_import_batch_items(batch_id, status, sort_order);
