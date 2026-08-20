-- Establish the filename-derived order as the only lesson ordering value.
-- Existing order values are never rewritten. Invalid legacy data must be
-- corrected explicitly before this invariant can be installed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM listening_lessons WHERE sort_order NOT BETWEEN 1 AND 99
  ) THEN
    RAISE EXCEPTION 'A lesson has an order outside the supported 01-99 range';
  END IF;
  IF EXISTS (
    SELECT 1 FROM listening_lessons GROUP BY section_id, sort_order HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'A section contains duplicate lesson order values';
  END IF;
END $$;

ALTER TABLE listening_lessons
  ALTER COLUMN sort_order DROP DEFAULT,
  ADD COLUMN IF NOT EXISTS source_filename TEXT;

COMMENT ON COLUMN listening_lessons.sort_order IS 'Section-scoped lesson order parsed from the NN_ source filename prefix';
COMMENT ON COLUMN listening_lessons.source_filename IS 'Original MP3 filename used by the package importer; NULL only for legacy lessons';

ALTER TABLE listening_lessons
  DROP CONSTRAINT IF EXISTS listening_lessons_order_range_check;
ALTER TABLE listening_lessons
  ADD CONSTRAINT listening_lessons_order_range_check CHECK (sort_order BETWEEN 1 AND 99);

CREATE UNIQUE INDEX IF NOT EXISTS listening_lessons_section_order_unique
  ON listening_lessons(section_id, sort_order);

-- Invalid preview rows may contain order 0 or duplicate orders. Final lesson
-- rows, not validation records, enforce the ordering invariant.
ALTER TABLE listening_import_batch_items
  DROP CONSTRAINT IF EXISTS listening_import_batch_items_order_range_check;
DROP INDEX IF EXISTS listening_import_batch_items_batch_order_unique;
