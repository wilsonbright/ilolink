// POST /api/publish — publish a new document (spec §5.1, §6).
//
// Accepts either JSON:
//   { content: string, sourceType: "md"|"html", visibility?, password?,
//     expiresAt?, customSlug?, title? }
// or multipart/form-data with a `file` field (.md/.html, <= 2 MB) plus the same
// optional fields. On success returns { slug, url, editUrl }.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/crypto/password";
import {
  createDocument,
  getDocumentBySlug,
  writeSlugRecord,
} from "@/lib/db/documents";
import { generateSlug, isValidCustomSlug } from "@/lib/slug";
import {
  MAX_BODY_BYTES,
  byteLength,
  editUrl,
  isSourceType,
  isVisibility,
  renderAndSanitize,
  storeVersion,
  viewUrl,
} from "@/lib/publish/pipeline";
import type { SourceType, Visibility } from "@/lib/types";

export const runtime = "nodejs";

function bad(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// Parsed, still-untrusted publish inputs common to both body encodings.
interface PublishInput {
  content: string;
  sourceType: SourceType;
  visibility: Visibility;
  password?: string;
  expiresAt?: number;
  customSlug?: string;
  title?: string;
}

function asString(v: FormDataEntryValue | null | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// Extension → source type for uploaded files.
function sourceTypeFromName(name: string): SourceType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  return null;
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
    if (file.size > MAX_BODY_BYTES) {
      return bad("File exceeds the 2 MB limit.", 413);
    }
    content = await file.text();
    // Prefer an explicit sourceType field, else infer from the filename.
    sourceTypeRaw = asString(form.get("sourceType")) ?? sourceTypeFromName(file.name);
    if (!sourceTypeRaw) {
      return bad("Unsupported file type — upload a .md or .html file.");
    }
    visibilityRaw = asString(form.get("visibility")) ?? "public";
    password = asString(form.get("password"));
    expiresAtRaw = asString(form.get("expiresAt"));
    customSlug = asString(form.get("customSlug"));
    title = asString(form.get("title"));
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
  }

  if (content.trim().length === 0) {
    return bad("Document content is empty.");
  }
  if (byteLength(content) > MAX_BODY_BYTES) {
    return bad("Document exceeds the 2 MB limit.", 413);
  }
  if (!isSourceType(sourceTypeRaw)) {
    return bad("Field 'sourceType' must be 'md' or 'html'.");
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
    sourceType: sourceTypeRaw,
    visibility: visibilityRaw,
    password,
    expiresAt: expiresAt ?? undefined,
    customSlug,
    title: title?.trim() ? title.trim() : undefined,
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
  const user = await currentUser();
  if (!user) return bad("Sign in to publish.", 401);

  const input = await readInput(req);
  if (input instanceof NextResponse) return input;

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

  const { html, title: sanitizedTitle } = renderAndSanitize(
    input.content,
    input.sourceType,
  );
  const title = input.title ?? sanitizedTitle ?? "Untitled";

  const slug = await resolveSlug(input.customSlug);
  if (slug instanceof NextResponse) return slug;

  const doc = await createDocument({
    slug,
    owner_id: user.id,
    source_type: input.sourceType,
    title,
    visibility: input.visibility,
    password_hash: passwordHash,
    expires_at: expiresAt,
  });

  const version = await storeVersion(doc.id, input.content, html, input.sourceType);

  await writeSlugRecord(slug, {
    doc_id: doc.id,
    visibility: input.visibility,
    current_version_id: version.id,
    rendered_r2_key: version.rendered_r2_key,
    password_hash: passwordHash,
    expires_at: expiresAt,
  });

  return NextResponse.json(
    { slug, url: viewUrl(slug), editUrl: editUrl(doc.id) },
    { status: 201 },
  );
}
