-- Transaction boundary is owned by scripts/migrate-neon.mjs.
ALTER TABLE users
  ALTER COLUMN leaderboard_visible SET DEFAULT TRUE;

COMMENT ON COLUMN users.leaderboard_visible IS 'User-controlled leaderboard participation; enabled by default and forced off while blocked';
