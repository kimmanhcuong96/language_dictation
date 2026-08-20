-- Transaction boundary is owned by scripts/migrate-neon.mjs.
CREATE TABLE IF NOT EXISTS listening_sentence_comments (
  id TEXT PRIMARY KEY,
  sentence_id TEXT NOT NULL REFERENCES listening_sentences(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (
    char_length(body) BETWEEN 1 AND 500
    AND body = btrim(body)
    AND char_length(body) - char_length(replace(body, chr(10), '')) <= 4
    AND replace(body, chr(10), '') !~ '[[:cntrl:]]'
  ),
  status TEXT NOT NULL DEFAULT 'VISIBLE' CHECK (status IN ('VISIBLE', 'HIDDEN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listening_sentence_comments_sentence_feed_idx
  ON listening_sentence_comments(sentence_id, created_at DESC, id DESC)
  WHERE status = 'VISIBLE';

CREATE INDEX IF NOT EXISTS listening_sentence_comments_user_rate_idx
  ON listening_sentence_comments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS listening_sentence_comment_reports (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES listening_sentence_comments(id) ON DELETE CASCADE,
  reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('SPAM', 'HARASSMENT', 'HATE', 'SEXUAL', 'VIOLENCE', 'OTHER')),
  details TEXT CHECK (details IS NULL OR (char_length(details) BETWEEN 1 AND 500 AND details = btrim(details))),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS listening_sentence_comment_reports_queue_idx
  ON listening_sentence_comment_reports(created_at DESC, comment_id);

CREATE TABLE IF NOT EXISTS listening_sentence_comment_moderation_log (
  id TEXT PRIMARY KEY,
  comment_id TEXT REFERENCES listening_sentence_comments(id) ON DELETE SET NULL,
  target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('HIDDEN', 'RESTORED')),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500 AND reason = btrim(reason)),
  body_snapshot TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listening_sentence_comment_moderation_log_comment_idx
  ON listening_sentence_comment_moderation_log(comment_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_sentence_comment_content_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.sentence_id IS DISTINCT FROM OLD.sentence_id THEN
    RAISE EXCEPTION 'Sentence comment content and ownership are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listening_sentence_comments_immutable ON listening_sentence_comments;
CREATE TRIGGER listening_sentence_comments_immutable
  BEFORE UPDATE ON listening_sentence_comments
  FOR EACH ROW EXECUTE FUNCTION prevent_sentence_comment_content_update();

COMMENT ON TABLE listening_sentence_comments IS 'Public comments attached to individual listening sentences';
COMMENT ON COLUMN listening_sentence_comments.status IS 'Moderation visibility. Only VISIBLE comments are returned publicly';
COMMENT ON TABLE listening_sentence_comment_reports IS 'One abuse report per signed-in user and sentence comment';
COMMENT ON TABLE listening_sentence_comment_moderation_log IS 'Immutable audit trail of administrator comment visibility actions';
