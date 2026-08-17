CREATE TABLE IF NOT EXISTS listening_manifest_meta (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO listening_manifest_meta(id, version) VALUES (TRUE, 1)
ON CONFLICT(id) DO NOTHING;
