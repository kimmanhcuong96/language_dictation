ALTER TABLE users
  ADD COLUMN IF NOT EXISTS listening_preferences JSONB NOT NULL DEFAULT '{"replayKey":"KeyR","playPauseKey":"Space","autoReplay":false,"replayDelaySeconds":0.5,"wordSuggestions":false,"shortcutTips":true}'::jsonb;
