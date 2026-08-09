ALTER TABLE users ADD COLUMN leaderboard_visible INTEGER NOT NULL DEFAULT 0 CHECK(leaderboard_visible IN (0, 1));
CREATE INDEX users_leaderboard_visible_idx ON users(leaderboard_visible);
