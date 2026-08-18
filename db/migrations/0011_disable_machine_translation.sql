-- Machine translation is intentionally disabled. Community submissions remain available.
UPDATE listening_translation_languages
SET machine_translation_enabled = FALSE,
    updated_at = now()
WHERE machine_translation_enabled = TRUE;

UPDATE listening_lesson_translation_sets
SET machine_status = 'NOT_REQUESTED',
    last_error = NULL,
    updated_at = now()
WHERE machine_status IN ('PENDING', 'PROCESSING', 'FAILED', 'NOT_CONFIGURED');
