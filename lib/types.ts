// Shared domain types — the contract every lib module and route implements against.
// Keep this the single source of truth; do not redefine these shapes elsewhere.

export type SourceType = "md" | "html";

export type Visibility = "public" | "unlisted" | "password" | "expiring";

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: number; // epoch ms
}

export interface DocumentRow {
  id: string;
  slug: string;
  owner_id: string;
  title: string | null;
  source_type: SourceType;
  visibility: Visibility;
  password_hash: string | null;
  current_version_id: string | null;
  expires_at: number | null;
  published_at: number | null;
  created_at: number;
  updated_at: number;
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
  password_hash: string | null;
  expires_at: number | null;
}

// KV session record stored at key `session:<token>`; cookie holds the opaque token.
export interface SessionRecord {
  user_id: string;
  email: string;
  created_at: number;
  expires_at: number;
}

// KV magic-link record at key `magic:<token>`; single-use, short TTL.
export interface MagicLinkRecord {
  email: string;
  created_at: number;
  expires_at: number;
}

// Result of the sanitize step: safe HTML plus the extracted title.
export interface SanitizeResult {
  html: string;
  title: string | null;
}
