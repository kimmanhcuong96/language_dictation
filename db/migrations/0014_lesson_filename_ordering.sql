-- Establish the filename-derived order as the only lesson ordering value.
-- Legacy schemas allowed the default value 0 and did not prevent duplicate
-- positions. Preserve the first valid position in each section and assign only
-- invalid/duplicate rows to the remaining 01-99 slots deterministically.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM listening_lessons
    GROUP BY section_id
    HAVING COUNT(*) > 99
  ) THEN
    RAISE EXCEPTION 'A section contains more than 99 lessons; no valid 01-99 ordering is possible';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS listening_lesson_order_migration_audit (
  lesson_id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  previous_sort_order INTEGER NOT NULL,
  assigned_sort_order INTEGER NOT NULL CHECK (assigned_sort_order BETWEEN 1 AND 99),
  reason TEXT NOT NULL CHECK (reason IN ('OUT_OF_RANGE', 'DUPLICATE')),
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

WITH ranked AS (
  SELECT
    id,
    section_id,
    sort_order,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY section_id, sort_order
      ORDER BY created_at, id
    ) AS duplicate_rank
  FROM listening_lessons
),
preserved AS (
  SELECT id, section_id, sort_order
  FROM ranked
  WHERE sort_order BETWEEN 1 AND 99
    AND duplicate_rank = 1
),
needs_assignment AS (
  SELECT
    ranked.id,
    ranked.section_id,
    ranked.sort_order AS previous_sort_order,
    CASE
      WHEN ranked.sort_order NOT BETWEEN 1 AND 99 THEN 'OUT_OF_RANGE'
      ELSE 'DUPLICATE'
    END AS reason,
    ROW_NUMBER() OVER (
      PARTITION BY ranked.section_id
      ORDER BY ranked.sort_order, ranked.created_at, ranked.id
    ) AS assignment_rank
  FROM ranked
  WHERE ranked.sort_order NOT BETWEEN 1 AND 99
     OR ranked.duplicate_rank > 1
),
available_slots AS (
  SELECT
    sections.section_id,
    slots.sort_order,
    ROW_NUMBER() OVER (
      PARTITION BY sections.section_id
      ORDER BY slots.sort_order
    ) AS assignment_rank
  FROM (SELECT DISTINCT section_id FROM needs_assignment) AS sections
  CROSS JOIN generate_series(1, 99) AS slots(sort_order)
  WHERE NOT EXISTS (
    SELECT 1
    FROM preserved
    WHERE preserved.section_id = sections.section_id
      AND preserved.sort_order = slots.sort_order
  )
),
assignments AS (
  SELECT
    needs_assignment.id,
    needs_assignment.section_id,
    needs_assignment.previous_sort_order,
    needs_assignment.reason,
    available_slots.sort_order
  FROM needs_assignment
  JOIN available_slots USING (section_id, assignment_rank)
),
audited AS (
  INSERT INTO listening_lesson_order_migration_audit(
    lesson_id,
    section_id,
    previous_sort_order,
    assigned_sort_order,
    reason
  )
  SELECT id, section_id, previous_sort_order, sort_order, reason
  FROM assignments
  ON CONFLICT(lesson_id) DO NOTHING
  RETURNING lesson_id
)
UPDATE listening_lessons AS lesson
SET sort_order = assignments.sort_order
FROM assignments
WHERE lesson.id = assignments.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM listening_lessons WHERE sort_order NOT BETWEEN 1 AND 99
  ) OR EXISTS (
    SELECT 1 FROM listening_lessons GROUP BY section_id, sort_order HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Legacy lesson ordering could not be normalized safely';
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
