// Publish a document for a workspace through the SAME sanitize→R2→D1→KV pipeline
// the web app uses (companion spec §4.1, §7). Untrusted content always passes
// sanitizeDocument(); the rendered doc is served from isolated view.ilolink.com.

import {
  renderContent,
  detectUpload,
  decodeDataUrl,
  docxToHtml,
  MAX_BINARY_BYTES,
  byteLength,
} from "@/lib/publish/formats";
import {
  createDocumentWith,
  getDocumentBySlugWith,
  storeVersionWith,
  storeBinaryVersionWith,
  writeSlugRecordWith,
  type PublishBindings,
} from "@/lib/publish/store-core";
import { generateSlug, isValidCustomSlug } from "@/lib/slug";
import { hashPassword } from "@/lib/crypto/password";
import { scanContent } from "@/lib/abuse/scan";
import type { SourceType, Visibility } from "@/lib/types";

const MAX_TEXT_BYTES = 2 * 1024 * 1024; // 2 MB, matches the web path

// Flagged publishes before a workspace is auto-suspended.
const ABUSE_FLAG_LIMIT = 5;

// Suspend a workspace and take all its live docs offline (reversible: rows +
// R2 bodies stay; the KV slug records are dropped so links 404).
export async function suspendWorkspace(
  b: PublishBindings,
  workspaceId: string,
): Promise<void> {
  const now = Date.now();
  const docs = await b.DB.prepare(
    "SELECT slug FROM documents WHERE workspace_id = ? AND unpublished_at IS NULL",
  )
    .bind(workspaceId)
    .all<{ slug: string }>();
  await b.DB.prepare("UPDATE workspaces SET status = 'suspended' WHERE id = ?")
    .bind(workspaceId)
    .run();
  await b.DB.prepare(
    "UPDATE documents SET unpublished_at = ? WHERE workspace_id = ? AND unpublished_at IS NULL",
  )
    .bind(now, workspaceId)
    .run();
  await Promise.all(docs.results.map((d) => b.KV.delete(`slug:${d.slug}`)));
}

export interface PublishToolInput {
  content?: string;
  file_base64?: string;
  filename?: string;
  format?: string;
  title?: string;
  visibility?: Visibility;
  password?: string;
  expires_at?: string; // ISO 8601
  slug?: string;
}

export interface PublishResult {
  document_id: string;
  share_url: string;
  visibility: Visibility;
  format: SourceType;
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

// A base64 upload becomes a data URL so it flows through the exact same detect →
// render path as a web upload. MIME comes from the filename extension.
function toDataUrl(fileBase64: string, filename?: string): string {
  if (fileBase64.startsWith("data:")) return fileBase64;
  const ext = (filename ?? "").toLowerCase().split(".").pop() ?? "";
  const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
  return `data:${mime};base64,${fileBase64}`;
}

function isVisibility(v: unknown): v is Visibility {
  return v === "public" || v === "unlisted" || v === "password" || v === "expiring";
}

// Throwable input error — the tool turns these into a friendly message.
export class PublishError extends Error {}

async function resolveSlug(
  DB: D1Database,
  custom?: string,
): Promise<string> {
  if (custom !== undefined && custom !== "") {
    if (!isValidCustomSlug(custom)) {
      throw new PublishError(
        "That custom link isn't valid — use 3-32 lowercase letters, numbers, or hyphens.",
      );
    }
    if (await getDocumentBySlugWith(DB, custom)) {
      throw new PublishError("That custom link is already taken.");
    }
    return custom;
  }
  for (let i = 0; i < 6; i++) {
    const s = generateSlug();
    if (!(await getDocumentBySlugWith(DB, s))) return s;
  }
  throw new PublishError("Could not allocate a link — please retry.");
}

export async function publishForWorkspace(
  b: PublishBindings,
  workspaceId: string,
  input: PublishToolInput,
): Promise<PublishResult> {
  // 0. Workspace status + quota.
  const q = await b.DB.prepare(
    "SELECT quota_docs, status FROM workspaces WHERE id = ?",
  )
    .bind(workspaceId)
    .first<{ quota_docs: number; status: string }>();
  if (!q || q.status !== "active") {
    throw new PublishError(
      "This workspace is suspended. If you believe this is a mistake, contact abuse@ilolink.com.",
    );
  }
  const quota = q.quota_docs ?? 50;
  const cnt = await b.DB.prepare(
    "SELECT COUNT(*) AS n FROM documents WHERE workspace_id = ? AND unpublished_at IS NULL",
  )
    .bind(workspaceId)
    .first<{ n: number }>();
  if ((cnt?.n ?? 0) >= quota) {
    throw new PublishError(
      `You've reached your ${quota}-document limit. Unpublish one, or manage documents on your dashboard.`,
    );
  }

  // 1. Assemble the raw content (inline text or a data URL from base64).
  let content: string;
  if (input.file_base64) {
    content = toDataUrl(input.file_base64, input.filename);
  } else if (typeof input.content === "string" && input.content.trim()) {
    content = input.content;
  } else {
    throw new PublishError("Provide `content` (text) or `file_base64` (a file).");
  }

  const visibility: Visibility = isVisibility(input.visibility)
    ? input.visibility
    : "unlisted"; // spec default

  // Visibility-dependent fields.
  let passwordHash: string | null = null;
  let expiresAt: number | null = null;
  if (visibility === "password") {
    if (!input.password) throw new PublishError("A password is required for password visibility.");
    passwordHash = await hashPassword(input.password);
  } else if (visibility === "expiring") {
    const ms = input.expires_at ? Date.parse(input.expires_at) : NaN;
    if (!Number.isFinite(ms) || ms <= Date.now()) {
      throw new PublishError("`expires_at` must be a future ISO date for expiring visibility.");
    }
    expiresAt = ms;
  }

  // 2. Determine storage path: pdf (bytes) / docx (→html) / text.
  const upload = detectUpload(content);
  let sourceType: SourceType;
  let title: string;
  let store: (docId: string) => Promise<{ id: string; rendered_r2_key: string; raw_r2_key: string }>;
  let scanHtml = ""; // rendered HTML fed to the abuse scan (empty for pdf bytes)

  if (upload) {
    const bytes = decodeDataUrl(content);
    if (!bytes) throw new PublishError("Malformed upload — expected a base64 data URL.");
    if (bytes.byteLength > MAX_BINARY_BYTES) {
      throw new PublishError("File exceeds the 15 MB limit — upload large media on the web app.");
    }
    if (upload === "pdf") {
      sourceType = "pdf";
      title = input.title ?? input.filename?.replace(/\.[^.]+$/, "") ?? "PDF document";
      store = (docId) => storeBinaryVersionWith(b, docId, bytes, "application/pdf");
    } else {
      sourceType = "html";
      const html = await docxToHtml(bytes).catch(() => {
        throw new PublishError("Could not read that .docx file — it may be corrupt.");
      });
      const r = renderContent(html, "html");
      title = input.title ?? r.title ?? input.filename?.replace(/\.[^.]+$/, "") ?? "Document";
      scanHtml = r.html;
      store = (docId) => storeVersionWith(b, docId, html, r.html, "html");
    }
  } else {
    if (byteLength(content) > MAX_TEXT_BYTES) {
      throw new PublishError("Content exceeds the 2 MB text limit — attach a file or trim it.");
    }
    // Honour an explicit html hint; otherwise let renderContent detect
    // md/json/csv/image from the content.
    const st: SourceType = input.format === "html" ? "html" : "md";
    const r = renderContent(content, st);
    sourceType = st;
    title = input.title ?? r.title ?? "Untitled";
    scanHtml = r.html;
    store = (docId) => storeVersionWith(b, docId, content, r.html, st);
  }

  // 2b. Abuse scan (backstop; the sanitizer already stripped active markup).
  // Block egregious credential-capture up front; softer signals are flagged
  // after publish and feed workspace auto-suspension.
  const scan = scanContent(sourceType === "pdf" ? title : content, scanHtml);
  if (scan.verdict === "block") {
    throw new PublishError(
      "This content looks like a phishing or credential-capture page, so it can't be published.",
    );
  }

  // 3. Slug + rows + KV, all under this workspace.
  const slug = await resolveSlug(b.DB, input.slug);
  const doc = await createDocumentWith(b.DB, {
    slug,
    source_type: sourceType,
    title,
    visibility,
    password_hash: passwordHash,
    manage_token_hash: null, // MCP docs are owned by the workspace, not a token
    expires_at: expiresAt,
    workspace_id: workspaceId,
  });
  const version = await store(doc.id);
  await writeSlugRecordWith(b.KV, slug, {
    doc_id: doc.id,
    visibility,
    current_version_id: version.id,
    rendered_r2_key: version.rendered_r2_key,
    raw_r2_key: version.raw_r2_key,
    password_hash: passwordHash,
    expires_at: expiresAt,
    source_type: sourceType,
  });

  // Softer signal: allowed, but counted. Auto-suspend the workspace on repeat.
  if (scan.verdict === "flag") {
    await b.DB.prepare(
      "UPDATE workspaces SET abuse_flags = abuse_flags + 1 WHERE id = ?",
    )
      .bind(workspaceId)
      .run();
    const w = await b.DB.prepare("SELECT abuse_flags FROM workspaces WHERE id = ?")
      .bind(workspaceId)
      .first<{ abuse_flags: number }>();
    if ((w?.abuse_flags ?? 0) >= ABUSE_FLAG_LIMIT) {
      await suspendWorkspace(b, workspaceId);
    }
  }

  return {
    document_id: doc.id,
    share_url: `https://ilolink.com/${slug}`,
    visibility,
    format: sourceType,
  };
}
