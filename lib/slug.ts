import { customAlphabet } from "nanoid";

// Ambiguity-free alphabet: no 0/O/1/l/I so slugs are easy to read aloud/type.
const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const nanoSlug = customAlphabet(SLUG_ALPHABET, 6);

// Paths the app owns; a custom slug may never collide with a route segment.
const RESERVED_SLUGS = new Set<string>([
  "dashboard",
  "publish",
  "api",
  "signin",
  "view",
  "about",
  "terms",
  "privacy",
]);

// A fresh 6-char default slug from the ambiguity-free alphabet.
export function generateSlug(): string {
  return nanoSlug();
}

// A user-supplied custom slug: 3-32 chars, lowercase alnum + hyphen, not reserved.
export function isValidCustomSlug(slug: string): boolean {
  if (typeof slug !== "string") return false;
  if (slug.length < 3 || slug.length > 32) return false;
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}
