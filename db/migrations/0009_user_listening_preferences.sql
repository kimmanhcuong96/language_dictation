ALTER TABLE users
  ADD COLUMN IF NOT EXISTS listening_preferences JSONB NOT NULL DEFAULT '{"replayKey":"Control","playPauseKey":"Backquote","autoReplay":false,"replayDelaySeconds":0.5,"wordSuggestions":false,"shortcutTips":true}'::jsonb;
