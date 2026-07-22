-- Per-doc opt-in "trusted" HTML (spec §6, opt-in escape hatch). Default 0 keeps
-- every existing and future doc on the sanitize-on-ingest security boundary.
-- A doc is trusted ONLY when the publisher explicitly vouches for it at publish
-- time; the raw HTML is then stored and served unsanitized under a permissive,
-- still origin-isolated CSP (see lib/sanitize/csp.ts buildDocCsp({trusted})).
ALTER TABLE documents ADD COLUMN trusted INTEGER NOT NULL DEFAULT 0;
