import { env } from "@/lib/cf";

// Doc bodies live in R2 under "docs/<docId>/<versionId>/{raw,rendered}".
// Keys are built by callers; helpers here just move string payloads in and out.

export function rawKey(docId: string, versionId: string): string {
  return `docs/${docId}/${versionId}/raw`;
}

export function renderedKey(docId: string, versionId: string): string {
  return `docs/${docId}/${versionId}/rendered`;
}

// Store a string body at `key` with the given content type.
export async function putBody(
  key: string,
  body: string,
  contentType: string,
): Promise<void> {
  await env().DOCS.put(key, body, {
    httpMetadata: { contentType },
  });
}

// Read a string body; null when the object does not exist.
export async function getBody(key: string): Promise<string | null> {
  const obj = await env().DOCS.get(key);
  if (!obj) return null;
  return obj.text();
}

// Delete every object under a key prefix (all versions of one doc). Paginates
// through the listing so it works past the 1000-key page limit.
export async function deleteByPrefix(prefix: string): Promise<number> {
  const bucket = env().DOCS;
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix, cursor });
    const keys = listed.objects.map((o) => o.key);
    if (keys.length) {
      await bucket.delete(keys);
      deleted += keys.length;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return deleted;
}
