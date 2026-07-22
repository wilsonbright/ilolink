import { env } from "@/lib/cf";
import { putBodyWith, getBodyWith } from "@/lib/publish/store-core";

// Doc bodies live in R2 under "docs/<docId>/<versionId>/{raw,rendered}".
// Key builders + the binding-parameterized put/get live in the pure store-core;
// these are the app's env()-bound wrappers (the MCP worker calls store-core
// directly with its own bindings). See lib/publish/store-core.ts.
export { rawKey, renderedKey } from "@/lib/publish/store-core";

// Store a body at `key` with the given content type. Accepts text or binary.
export async function putBody(
  key: string,
  body: string | ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await putBodyWith(env().DOCS, key, body, contentType);
}

// Read a string body; null when the object does not exist.
export function getBody(key: string): Promise<string | null> {
  return getBodyWith(env().DOCS, key);
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
