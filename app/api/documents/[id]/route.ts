// POST /api/documents/[id] — re-publish: append a NEW version to an existing
// document, update current_version_id, and keep prior versions as history
// (spec §5.1). Optionally updates title and visibility in the same call.
//
// Accepts JSON:
//   { content: string, sourceType?: "md"|"html", title?, visibility?,
//     password?, expiresAt? }
// or multipart/form-data with a `file` field plus the same optional fields.
// On success returns { slug, url, editUrl }.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/crypto/password";
import { execute } from "@/lib/db/client";
import {
  getDocumentById,
  updateVisibility,
  writeSlugRecord,
} from "@/lib/db/documents";
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

interface RepublishInput {
  content: string;
  sourceType?: SourceType; // defaults to the document's existing source_type
  title?: string;
  visibility?: Visibility; // absent = keep current visibility
  password?: string;
  expiresAt?: number;
}

function asString(v: FormDataEntryValue | null | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function sourceTypeFromName(name: string): SourceType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  return null;
}

function parseExpiresAt(v: unknown): number | undefined | null {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

async function readInput(req: Request): Promise<RepublishInput | NextResponse> {
  const contentType = req.headers.get("content-type") ?? "";

  let content: string;
  let sourceTypeRaw: unknown;
  let title: string | undefined;
  let visibilityRaw: unknown;
  let password: string | undefined;
  let expiresAtRaw: unknown;

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
    sourceTypeRaw = asString(form.get("sourceType")) ?? sourceTypeFromName(file.name);
    title = asString(form.get("title"));
    visibilityRaw = asString(form.get("visibility"));
    password = asString(form.get("password"));
    expiresAtRaw = asString(form.get("expiresAt"));
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
    title = typeof b.title === "string" ? b.title : undefined;
    visibilityRaw = b.visibility;
    password = typeof b.password === "string" ? b.password : undefined;
    expiresAtRaw = b.expiresAt;
  }

  if (content.trim().length === 0) {
    return bad("Document content is empty.");
  }
  if (byteLength(content) > MAX_BODY_BYTES) {
    return bad("Document exceeds the 2 MB limit.", 413);
  }

  let sourceType: SourceType | undefined;
  if (sourceTypeRaw !== undefined && sourceTypeRaw !== null) {
    if (!isSourceType(sourceTypeRaw)) {
      return bad("Field 'sourceType' must be 'md' or 'html'.");
    }
    sourceType = sourceTypeRaw;
  }

  let visibility: Visibility | undefined;
  if (visibilityRaw !== undefined && visibilityRaw !== null) {
    if (!isVisibility(visibilityRaw)) {
      return bad("Field 'visibility' must be public, unlisted, password, or expiring.");
    }
    visibility = visibilityRaw;
  }

  const expiresAt = parseExpiresAt(expiresAtRaw);
  if (expiresAt === null) {
    return bad("Field 'expiresAt' must be an epoch-millisecond integer.");
  }

  return {
    content,
    sourceType,
    title: title?.trim() ? title.trim() : undefined,
    visibility,
    password,
    expiresAt: expiresAt ?? undefined,
  };
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return bad("Sign in to re-publish.", 401);

  const { id } = await ctx.params;
  const doc = await getDocumentById(id);
  if (!doc) return bad("Document not found.", 404);
  if (doc.owner_id !== user.id) return bad("You do not own this document.", 403);

  const input = await readInput(req);
  if (input instanceof NextResponse) return input;

  const sourceType = input.sourceType ?? doc.source_type;

  // Effective visibility: keep the document's current settings unless the caller
  // changes visibility, in which case revalidate its dependent fields.
  let visibility: Visibility = doc.visibility;
  let passwordHash: string | null = doc.password_hash;
  let expiresAt: number | null = doc.expires_at;
  let visibilityChanged = false;

  if (input.visibility !== undefined && input.visibility !== doc.visibility) {
    visibility = input.visibility;
    visibilityChanged = true;
    passwordHash = null;
    expiresAt = null;
    if (visibility === "password") {
      if (!input.password || input.password.length < 1) {
        return bad("A password is required when visibility is 'password'.");
      }
      passwordHash = await hashPassword(input.password);
    } else if (visibility === "expiring") {
      if (input.expiresAt === undefined) {
        return bad("Field 'expiresAt' is required when visibility is 'expiring'.");
      }
      if (input.expiresAt <= Date.now()) {
        return bad("Field 'expiresAt' must be in the future.");
      }
      expiresAt = input.expiresAt;
    }
  } else if (input.password && doc.visibility === "password") {
    // Rotate the password on an already-password-protected document.
    passwordHash = await hashPassword(input.password);
  }

  const { html, title: sanitizedTitle } = renderAndSanitize(input.content, sourceType);
  const title = input.title ?? sanitizedTitle ?? doc.title ?? "Untitled";

  // Append the new version and point the document at it (history preserved).
  const version = await storeVersion(doc.id, input.content, html, sourceType);

  // Persist title (and source_type if it changed) on the document row.
  await execute(
    "UPDATE documents SET title = ?, source_type = ?, updated_at = ? WHERE id = ?",
    title,
    sourceType,
    Date.now(),
    doc.id,
  );

  if (visibilityChanged || passwordHash !== doc.password_hash) {
    await updateVisibility(doc.id, visibility, {
      password_hash: passwordHash,
      expires_at: expiresAt,
    });
  }

  // Refresh the hot KV lookup so the content origin serves the new version.
  await writeSlugRecord(doc.slug, {
    doc_id: doc.id,
    visibility,
    current_version_id: version.id,
    rendered_r2_key: version.rendered_r2_key,
    password_hash: passwordHash,
    expires_at: expiresAt,
  });

  return NextResponse.json(
    { slug: doc.slug, url: viewUrl(doc.slug), editUrl: editUrl(doc.id) },
    { status: 200 },
  );
}
