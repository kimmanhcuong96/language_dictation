-- Allocate import slugs atomically across concurrent batches and browser tabs.
-- Transaction boundary is owned by scripts/migrate-neon.mjs.
ALTER TABLE listening_import_batch_items
  ADD COLUMN IF NOT EXISTS base_slug TEXT;

UPDATE listening_import_batch_items
SET base_slug = slug
WHERE base_slug IS NULL AND slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS listening_import_slug_reservations (
  item_id TEXT PRIMARY KEY REFERENCES listening_import_batch_items(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES listening_sections(id) ON DELETE CASCADE,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]{1,80}$'),
  canonical_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section_id, slug),
  UNIQUE(canonical_path)
);

CREATE OR REPLACE FUNCTION reserve_listening_import_slug(
  p_item_id TEXT,
  p_section_id TEXT,
  p_base_slug TEXT,
  p_canonical_prefix TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  suffix INTEGER;
  suffix_text TEXT;
  candidate TEXT;
  reserved_slug TEXT;
BEGIN
  SELECT slug INTO reserved_slug
  FROM listening_import_slug_reservations
  WHERE item_id = p_item_id;
  IF FOUND THEN
    RETURN reserved_slug;
  END IF;

  IF p_base_slug IS NULL OR p_base_slug !~ '^[a-z0-9-]{1,80}$' OR p_canonical_prefix IS NULL THEN
    RAISE EXCEPTION 'Invalid lesson slug reservation input';
  END IF;

  FOR suffix IN 0..99999 LOOP
    suffix_text := CASE WHEN suffix = 0 THEN '' ELSE '-' || suffix::text END;
    candidate := regexp_replace(
      left(p_base_slug, 80 - char_length(suffix_text)),
      '-+$',
      ''
    ) || suffix_text;

    INSERT INTO listening_import_slug_reservations(
      item_id,
      section_id,
      slug,
      canonical_path
    )
    SELECT p_item_id, p_section_id, candidate, p_canonical_prefix || candidate
    WHERE NOT EXISTS (
      SELECT 1 FROM listening_lessons
      WHERE section_id = p_section_id AND slug = candidate
    )
    AND NOT EXISTS (
      SELECT 1 FROM listening_canonical_paths
      WHERE path = p_canonical_prefix || candidate
    )
    ON CONFLICT DO NOTHING
    RETURNING slug INTO reserved_slug;

    IF FOUND THEN
      RETURN reserved_slug;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Lesson slug space exhausted';
END;
$$;

COMMENT ON TABLE listening_import_slug_reservations IS
  'Atomic temporary slug ownership for lesson imports running concurrently';
COMMENT ON FUNCTION reserve_listening_import_slug(TEXT, TEXT, TEXT, TEXT) IS
  'Returns the base slug or the first available URL-safe numeric suffix';
