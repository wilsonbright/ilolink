// Shared domain types — the contract every lib module and route implements against.
// Keep this the single source of truth; do not redefine these shapes elsewhere.

export type SourceType = "md" | "html" | "pdf";

export type Visibility = "public" | "unlisted" | "password" | "expiring";

// No accounts. Ownership is proved by a per-doc manage token whose SHA-256 is
// stored here; the raw token lives only in the publisher's browser.
export interface DocumentRow {
  id: string;
  slug: string;
  title: string | null;
  source_type: SourceType;
  visibility: Visibility;
  password_hash: string | null;
  manage_token_hash: string | null;
  current_version_id: string | null;
  expires_at: number | null;
  published_at: number | null;
  created_at: number;
  updated_at: number;
  // Opt-in escape hatch: when true the doc's HTML was stored RAW (not sanitized)
  // and is served under a permissive CSP so its own scripts run. Default false —
  // the sanitize-on-ingest boundary is the norm. Set only when the publisher
  // explicitly vouches for the content. Added by migration 0006.
  trusted: boolean;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  raw_r2_key: string;
  rendered_r2_key: string;
  created_at: number;
}

// KV value stored at key `slug:<slug>` for the hot content-origin lookup path.
export interface SlugRecord {
  doc_id: string;
  visibility: Visibility;
  current_version_id: string;
  rendered_r2_key: string;
  // Binary source (pdf) is streamed from here by the /raw/<slug> route. Optional
  // for text docs and old records, which serve from rendered_r2_key instead.
  raw_r2_key?: string;
  password_hash: string | null;
  expires_at: number | null;
  // Chooses the serving shell: "html" renders full-bleed (author controls all
  // styling); "md" renders in the zen reading shell. Optional for old records.
  source_type?: SourceType;
  // When true, the rendered body is the author's RAW (unsanitized) HTML and the
  // worker serves it under the permissive trusted CSP so its scripts run. The
  // worker reads this straight from KV — no D1 hit on the hot path — so it MUST
  // be written here at publish time. Optional/absent on old records => false.
  trusted?: boolean;
}

// Result of the sanitize step: safe HTML plus the extracted title.
export interface SanitizeResult {
  html: string;
  title: string | null;
}
