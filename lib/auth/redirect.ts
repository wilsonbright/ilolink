// Post-sign-in redirect validation. Pure — no bindings.
//
// The `next` parameter rides through an emailed link, so it is fully
// attacker-controlled: without this an attacker mails a real ilolink sign-in
// link with ?next=https://evil.example and lands a freshly-authenticated user
// on their page. Only same-origin absolute paths are ever allowed.

export const DEFAULT_REDIRECT = "/dashboard";

export function safeRedirect(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_REDIRECT;

  // Must be an absolute path on this origin.
  if (!raw.startsWith("/")) return DEFAULT_REDIRECT;

  // "//evil.example" is a protocol-relative URL: the browser reads it as
  // another origin even though it starts with a slash.
  if (raw.startsWith("//")) return DEFAULT_REDIRECT;

  // Some browsers normalize a backslash to "/" while parsing the authority, so
  // "/\evil.example" can also escape the origin. Reject backslashes outright
  // rather than reasoning about each browser.
  if (raw.includes("\\")) return DEFAULT_REDIRECT;

  // Control characters (NUL, tab, CR, LF, DEL) enable header and parser
  // splitting; a bare CRLF inside a Location value is response splitting.
  // Checked by code point rather than a regex literal so the escape sequences
  // cannot be silently mangled in transit.
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c <= 0x1f || c === 0x7f) return DEFAULT_REDIRECT;
  }

  return raw;
}
