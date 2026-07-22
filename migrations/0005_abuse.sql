-- Abuse controls (companion spec §7): viewer reports on published pages +
-- per-workspace scan flags feeding auto-suspension.

CREATE TABLE IF NOT EXISTS reports (
  id            TEXT PRIMARY KEY,
  document_id   TEXT NOT NULL,
  reason        TEXT NOT NULL,            -- short viewer-supplied reason
  reporter_hash TEXT NOT NULL,            -- salted hash of reporter IP+UA (dedupe, no PII)
  created_at    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open' -- 'open' | 'actioned' | 'dismissed'
);
CREATE INDEX IF NOT EXISTS idx_reports_doc ON reports(document_id);

-- Heuristic scan flags accumulate here; a workspace is auto-suspended past a
-- threshold (status flips to 'suspended' in the workspaces table).
ALTER TABLE workspaces ADD COLUMN abuse_flags INTEGER NOT NULL DEFAULT 0;
