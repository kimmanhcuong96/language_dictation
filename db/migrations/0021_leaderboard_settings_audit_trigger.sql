-- Keep settings and their audit record in the same database transaction.
-- Transaction boundary is owned by scripts/migrate-neon.mjs.
ALTER TABLE leaderboard_settings_audit_log
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

CREATE OR REPLACE FUNCTION audit_leaderboard_settings_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO leaderboard_settings_audit_log(
    actor_user_id,
    previous_settings,
    next_settings
  ) VALUES (
    NEW.updated_by,
    jsonb_build_object(
      'study7DayLimit', OLD.study_7_day_limit,
      'study30DayLimit', OLD.study_30_day_limit,
      'translation7DayLimit', OLD.translation_7_day_limit,
      'translation30DayLimit', OLD.translation_30_day_limit
    ),
    jsonb_build_object(
      'study7DayLimit', NEW.study_7_day_limit,
      'study30DayLimit', NEW.study_30_day_limit,
      'translation7DayLimit', NEW.translation_7_day_limit,
      'translation30DayLimit', NEW.translation_30_day_limit
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leaderboard_settings_audit ON leaderboard_settings;
CREATE TRIGGER leaderboard_settings_audit
  AFTER UPDATE OF study_7_day_limit, study_30_day_limit,
    translation_7_day_limit, translation_30_day_limit
  ON leaderboard_settings
  FOR EACH ROW
  WHEN (
    OLD.study_7_day_limit IS DISTINCT FROM NEW.study_7_day_limit
    OR OLD.study_30_day_limit IS DISTINCT FROM NEW.study_30_day_limit
    OR OLD.translation_7_day_limit IS DISTINCT FROM NEW.translation_7_day_limit
    OR OLD.translation_30_day_limit IS DISTINCT FROM NEW.translation_30_day_limit
  )
  EXECUTE FUNCTION audit_leaderboard_settings_update();

COMMENT ON FUNCTION audit_leaderboard_settings_update() IS
  'Atomically records administrator changes to leaderboard display limits';
