-- Transaction boundary is owned by scripts/migrate-neon.mjs.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS block_reason TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_block_state_check;
ALTER TABLE users ADD CONSTRAINT users_block_state_check CHECK (
  (is_blocked = FALSE AND blocked_at IS NULL AND blocked_by IS NULL AND block_reason IS NULL)
  OR
  (is_blocked = TRUE AND blocked_at IS NOT NULL AND block_reason IS NOT NULL
    AND char_length(block_reason) BETWEEN 3 AND 500 AND block_reason = btrim(block_reason))
);

CREATE INDEX IF NOT EXISTS users_moderation_status_idx
  ON users(is_blocked, created_at DESC, id);

CREATE TABLE IF NOT EXISTS user_moderation_log (
  id TEXT PRIMARY KEY,
  target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('BLOCKED', 'UNBLOCKED')),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500 AND reason = btrim(reason)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_moderation_log_target_idx
  ON user_moderation_log(target_user_id, created_at DESC);

COMMENT ON COLUMN users.is_blocked IS 'Prevents the user from posting comments and appearing on leaderboards';
COMMENT ON COLUMN users.block_reason IS 'Current administrator-supplied moderation reason; cleared when unblocked';
COMMENT ON TABLE user_moderation_log IS 'Immutable audit trail for user block and unblock actions';
