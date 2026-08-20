-- Transaction boundary is owned by scripts/migrate-neon.mjs.
ALTER TABLE listening_import_batch_items
  ADD COLUMN IF NOT EXISTS original_names_name TEXT;

COMMENT ON COLUMN listening_import_batch_items.original_names_name IS 'Optional <lesson>.name.json resource mapped to sentence metadata during import';
