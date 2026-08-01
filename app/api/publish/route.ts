// POST /api/publish — publish a new document (spec §5.1, §6). Open: no account.
//
// Accepts either JSON:
//   { content, sourceType, visibility?, password?, expiresAt?, customSlug?,
//     title?, turnstileToken }
// or multipart/form-data with a `file` field (.md/.html, <= 2 MB) plus the same
// optional fields. Gated by Turnstile + IP rate-limit. On success returns
// { slug, url, manageToken } — the token is shown once and kept in the browser.

import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/crypto/password";
import {
  createDocument,
  getDocumentBySlug,
  writeSlugRecord,
} from "@/lib/db/documents";
import { generateSlug, isValidCustomSlug } from "@/lib/slug";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { newManageToken, hashToken } from "@/lib/manage-token";
import { currentUser } from "@/lib/auth/current-user";
import { ensurePersonalTeamspace, getMembership } from "@/lib/teamspace/store";
import { canPublishInto } from "@/lib/teamspace/permissions";
import { queryFirst } from "@/lib/db/client";
import { scanContent } from "@/lib/abuse/scan";
import {
  MAX_BODY_BYTES,
  MAX_BINARY_BYTES,
  byteLength,
  isSourceType,
  isVisibility,
  renderAndSanitize,
  renderTrusted,
  storeVersion,
  storeBinaryVersion,
  detectUpload,
  decodeDataUrl,
  docxToHtml,
  viewUrl,
} from "@/lib/publish/pipeline";
import type { DocumentVersion, SourceType, Visibility } from "@/lib/types";

export const runtime = "nodejs";

function bad(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// Parsed, still-untrusted publish inputs common to both body encodings.
interface PublishInput {
  content: string;
  sourceType: SourceType;
  // Set when the content is a binary upload (data URL); the server re-derives it
  // from the content and handles it outside the text render path.
  upload?: "pdf" | "docx";
  visibility: Visibility;
  password?: string;
  expiresAt?: number;
  customSlug?: string;
  title?: string;
  turnstileToken?: string;
  // Publisher opt-in: store + serve this HTML raw (unsanitized) so its own
  // scripts run. Honoured only for text HTML (never md/pdf/docx). Default false.
  trusted?: boolean;
  // Optional target teamspace; defaults to the user's personal one.
  teamspaceId?: string;
  // Per-doc commenting policy; defaults to "anon" to preserve the existing
  // reader-feedback loop the marketing corpus promises.
  commentsMode?: "off" | "anon" | "signed";
}

function asString(v: FormDataEntryValue | null | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// Extension → source type for uploaded text files.
function sourceTypeFromName(name: string): SourceType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  return null;
}

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// A binary upload (pdf/docx) by filename or MIME. Returns its data-URL MIME.
function binaryMimeOf(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf") || file.type === PDF_MIME) return PDF_MIME;
  if (lower.endsWith(".docx") || file.type === DOCX_MIME) return DOCX_MIME;
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function parseExpiresAt(v: unknown): number | undefined | null {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null; // invalid
  return n;
}

// Returns a PublishInput or a NextResponse describing the input error.
async function readInput(req: Request): Promise<PublishInput | NextResponse> {
  const contentType = req.headers.get("content-type") ?? "";

  let content: string;
  let sourceTypeRaw: unknown;
  let visibilityRaw: unknown;
  let password: string | undefined;
  let expiresAtRaw: unknown;
  let customSlug: string | undefined;
  let title: string | undefined;
  let turnstileToken: string | undefined;
  let trusted = false;
  let teamspaceId: string | undefined;
  let commentsMode: "off" | "anon" | "signed" | undefined;

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return bad("Malformed multipart form data.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return bad("Missing file upload under field 'file'.");
    }
    const binMime = binaryMimeOf(file);
    if (binMime) {
      // Binary upload: cap on raw bytes, then carry it as a data URL so the rest
      // of the pipeline (and the JSON path) treat it identically.
      if (file.size > MAX_BINARY_BYTES) {
        return bad("File exceeds the 15 MB limit.", 413);
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      content = `data:${binMime};base64,${bytesToBase64(bytes)}`;
      sourceTypeRaw = "html"; // re-derived from content below; placeholder
    } else {
      if (file.size > MAX_BODY_BYTES) {
        return bad("File exceeds the 2 MB limit.", 413);
      }
      content = await file.text();
      // Prefer an explicit sourceType field, else infer from the filename.
      sourceTypeRaw = asString(form.get("sourceType")) ?? sourceTypeFromName(file.name);
      if (!sourceTypeRaw) {
        return bad("Unsupported file type — upload .md, .html, .pdf, or .docx.");
      }
    }
    visibilityRaw = asString(form.get("visibility")) ?? "public";
    password = asString(form.get("password"));
    expiresAtRaw = asString(form.get("expiresAt"));
    customSlug = asString(form.get("customSlug"));
    title = asString(form.get("title"));
    turnstileToken = asString(form.get("turnstileToken"));
    trusted = asString(form.get("trusted")) === "true";
    teamspaceId = asString(form.get("teamspace")) || undefined;
    commentsMode = asCommentsMode(asString(form.get("commentsMode")) ?? "");
  } else {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return bad("Request body must be valid JSON.");
    }
    if (typeof body !== "object" || body === null) {
      return bad("Request body must be a JSON object.");
    }
    const b = body as Record<string, unknown>;
    if (typeof b.content !== "string") {
      return bad("Field 'content' is required and must be a string.");
    }
    content = b.content;
    sourceTypeRaw = b.sourceType;
    visibilityRaw = b.visibility ?? "public";
    password = typeof b.password === "string" ? b.password : undefined;
    expiresAtRaw = b.expiresAt;
    customSlug = typeof b.customSlug === "string" ? b.customSlug : undefined;
    title = typeof b.title === "string" ? b.title : undefined;
    turnstileToken =
      typeof b.turnstileToken === "string" ? b.turnstileToken : undefined;
    trusted = b.trusted === true;
    teamspaceId = typeof b.teamspace === "string" ? b.teamspace : undefined;
    commentsMode = asCommentsMode(
      typeof b.commentsMode === "string" ? b.commentsMode : "",
    );
  }

  if (content.trim().length === 0) {
    return bad("Document content is empty.");
  }

  // Binary uploads are re-derived from the content itself (never trusting the
  // client's sourceType) and skip the 2 MB text cap — their byte size is checked
  // after base64-decode in POST. pdf serves as-is; docx converts to HTML.
  const upload = detectUpload(content);
  if (upload) {
    sourceTypeRaw = upload === "pdf" ? "pdf" : "html";
  } else {
    if (byteLength(content) > MAX_BODY_BYTES) {
      return bad("Document exceeds the 2 MB limit.", 413);
    }
    if (!isSourceType(sourceTypeRaw)) {
      return bad("Field 'sourceType' must be 'md' or 'html'.");
    }
  }

  if (!isVisibility(visibilityRaw)) {
    return bad("Field 'visibility' must be public, unlisted, password, or expiring.");
  }

  const expiresAt = parseExpiresAt(expiresAtRaw);
  if (expiresAt === null) {
    return bad("Field 'expiresAt' must be an epoch-millisecond integer.");
  }

  return {
    content,
    sourceType: (upload === "pdf" ? "pdf" : upload === "docx" ? "html" : sourceTypeRaw) as SourceType,
    upload: upload ?? undefined,
    visibility: visibilityRaw,
    password,
    expiresAt: expiresAt ?? undefined,
    customSlug,
    title: title?.trim() ? title.trim() : undefined,
    turnstileToken,
    // Only text HTML can be trusted — md renders safe markdown, and pdf/docx are
    // binary/converted with no author scripts to run.
    trusted: trusted && !upload && sourceTypeRaw === "html",
    teamspaceId,
    commentsMode,
  };
}

// Resolve the slug: validate + check uniqueness for a custom slug, otherwise
// generate a fresh one, retrying on the (rare) collision.
async function resolveSlug(customSlug?: string): Promise<string | NextResponse> {
  if (customSlug !== undefined) {
    if (!isValidCustomSlug(customSlug)) {
      return bad(
        "Custom slug must be 3-32 chars, lowercase letters, numbers, or hyphens, and not reserved.",
      );
    }
    const taken = await getDocumentBySlug(customSlug);
    if (taken) return bad("That slug is already taken.", 409);
    return customSlug;
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = generateSlug();
    const taken = await getDocumentBySlug(slug);
    if (!taken) return slug;
  }
  return bad("Could not allocate a unique slug — please retry.", 503);
}

export async function POST(req: Request): Promise<NextResponse> {
  const ip = clientIp(req);

  // Publishing now requires an account. The composer at / still renders for
  // signed-out visitors and only asks for an email at submit time, so the
  // funnel the marketing corpus feeds is intact — but every document created
  // from here on has a real owner.
  const user = await currentUser();
  if (!user) {
    return bad("Sign in to publish.", 401);
  }

  // Abuse control: IP rate-limit + Turnstile. Kept even behind auth — an
  // account is cheap to create, so this still blunts scripted floods.
  if (!(await rateLimit(`publish:ip:${ip}`, 20, 3600))) {
    return bad("Too many documents published from here. Try again later.", 429);
  }

  const input = await readInput(req);
  if (input instanceof NextResponse) return input;

  // Which teamspace to publish into. Defaults to the user's personal one, so a
  // solo user never encounters the concept.
  const teamspace = input.teamspaceId
    ? await resolveNamedTeamspace(user.id, input.teamspaceId)
    : await ensurePersonalTeamspace(user.id);
  if (!teamspace) {
    return bad("You are not a member of that teamspace.", 403);
  }
  if (teamspace.status !== "active") {
    return bad("That teamspace is suspended.", 403);
  }

  const used = await queryFirst<{ n: number }>(
    "SELECT COUNT(*) AS n FROM documents WHERE teamspace_id = ? AND unpublished_at IS NULL",
    teamspace.id,
  );
  if (Number(used?.n ?? 0) >= teamspace.quota_docs) {
    return bad(
      `That teamspace has reached its limit of ${teamspace.quota_docs} published documents.`,
      403,
    );
  }

  if (!(await verifyTurnstile(input.turnstileToken, ip))) {
    return bad("Human check failed. Please retry.", 403);
  }

  // Visibility-dependent requirements.
  let passwordHash: string | null = null;
  let expiresAt: number | null = null;
  if (input.visibility === "password") {
    if (!input.password || input.password.length < 1) {
      return bad("A password is required when visibility is 'password'.");
    }
    passwordHash = await hashPassword(input.password);
  } else if (input.visibility === "expiring") {
    if (input.expiresAt === undefined) {
      return bad("Field 'expiresAt' is required when visibility is 'expiring'.");
    }
    if (input.expiresAt <= Date.now()) {
      return bad("Field 'expiresAt' must be in the future.");
    }
    expiresAt = input.expiresAt;
  }

  // Resolve how this document is stored. pdf keeps its bytes (served by the
  // worker's /raw route); docx converts to HTML; everything else renders as
  // text. Binary byte sizes are validated here, post-decode.
  let sourceType: SourceType = input.sourceType;
  let title: string;
  let store: (docId: string) => Promise<DocumentVersion>;

  let scanHtml = ""; // rendered HTML fed to the abuse scan (empty for pdf bytes)
  if (input.upload) {
    const bytes = decodeDataUrl(input.content);
    if (!bytes) return bad("Malformed upload — expected a base64 data URL.");
    if (bytes.byteLength > MAX_BINARY_BYTES) {
      return bad("File exceeds the 15 MB limit.", 413);
    }
    if (input.upload === "pdf") {
      sourceType = "pdf";
      title = input.title ?? "PDF document";
      store = (docId) => storeBinaryVersion(docId, bytes, "application/pdf");
    } else {
      // docx → HTML → sanitize → stored as a normal HTML doc.
      sourceType = "html";
      let converted: string;
      try {
        converted = await docxToHtml(bytes);
      } catch {
        return bad("Could not read that .docx file — it may be corrupt.");
      }
      const { html, title: t } = renderAndSanitize(converted, "html");
      title = input.title ?? t ?? "Document";
      scanHtml = html;
      store = (docId) => storeVersion(docId, converted, html, "html");
    }
  } else {
    // Trusted HTML bypasses the sanitizer (publisher opt-in); everything else
    // goes through the sanitize boundary as usual. Either way the rendered body
    // is stored and later served under a CSP matched to `trusted`.
    const { html, title: t } = input.trusted
      ? renderTrusted(input.content)
      : renderAndSanitize(input.content, input.sourceType);
    title = input.title ?? t ?? "Untitled";
    scanHtml = html;
    store = (docId) => storeVersion(docId, input.content, html, input.sourceType);
  }

  // Abuse backstop: block egregious credential-capture / phishing pages. Softer
  // signals are allowed on the web path (no workspace to flag).
  if (scanContent(input.content, scanHtml).verdict === "block") {
    return bad(
      "This content looks like a phishing or credential-capture page, so it can't be published.",
      422,
    );
  }

  const slug = await resolveSlug(input.customSlug);
  if (slug instanceof NextResponse) return slug;

  // Mint the manage token; store only its hash. Raw token returned once below.
  const manageToken = newManageToken();
  const manageTokenHash = await hashToken(manageToken);

  const doc = await createDocument({
    slug,
    source_type: sourceType,
    title,
    visibility: input.visibility,
    password_hash: passwordHash,
    manage_token_hash: manageTokenHash,
    expires_at: expiresAt,
    trusted: input.trusted,
    teamspace_id: teamspace.id,
    created_by: user.id,
    comments_mode: input.commentsMode ?? "anon",
  });

  const version = await store(doc.id);

  await writeSlugRecord(slug, {
    doc_id: doc.id,
    visibility: input.visibility,
    current_version_id: version.id,
    rendered_r2_key: version.rendered_r2_key,
    raw_r2_key: version.raw_r2_key,
    password_hash: passwordHash,
    expires_at: expiresAt,
    source_type: sourceType,
    trusted: input.trusted,
    comments_mode: input.commentsMode,
  });

  return NextResponse.json(
    { slug, url: viewUrl(slug), manageToken },
    { status: 201 },
  );
}

// A teamspace the user is actually a member of, or null. Returning null rather
// than throwing keeps "not a member" and "no such teamspace" indistinguishable,
// so teamspace ids cannot be probed.
async function resolveNamedTeamspace(
  userId: string,
  teamspaceId: string,
): Promise<{ id: string; status: string; quota_docs: number } | null> {
  const role = await getMembership(teamspaceId, userId);
  if (!canPublishInto(role)) return null;
  return queryFirst<{ id: string; status: string; quota_docs: number }>(
    "SELECT id, status, quota_docs FROM teamspaces WHERE id = ?",
    teamspaceId,
  );
}

// Unknown values fall back to the default rather than erroring — a stale client
// sending a mode we no longer support should still be able to publish.
function asCommentsMode(v: string): "off" | "anon" | "signed" | undefined {
  return v === "off" || v === "anon" || v === "signed" ? v : undefined;
}
