-- Transaction boundary is owned by scripts/migrate-neon.mjs.
ALTER TABLE listening_import_batch_items
  ADD COLUMN IF NOT EXISTS staged_resource_key TEXT,
  ADD COLUMN IF NOT EXISTS job_token TEXT,
  ADD COLUMN IF NOT EXISTS enqueued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_delivery_id TEXT,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS listening_import_batch_items_job_token_idx
  ON listening_import_batch_items(job_token)
  WHERE job_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS listening_import_batch_items_recovery_idx
  ON listening_import_batch_items(status, processing_started_at)
  WHERE status = 'PROCESSING';

COMMENT ON COLUMN listening_import_batch_items.staged_resource_key IS 'R2 archive containing only the resources required by this lesson';
COMMENT ON COLUMN listening_import_batch_items.job_token IS 'Stable idempotency token for the currently enqueued import job';
COMMENT ON COLUMN listening_import_batch_items.enqueued_at IS 'Last successful Queue publication; used by the outbox recovery scheduler';
COMMENT ON COLUMN listening_import_batch_items.processing_delivery_id IS 'Cloudflare Queue delivery holding the current processing lease';
COMMENT ON COLUMN listening_import_batch_items.processing_started_at IS 'Start of the current processing lease; stale leases may be reclaimed by queue retries';
