// Turning an email address into something safe to show publicly.
//
// Comment author names are returned verbatim by the content worker's PUBLIC
// GET /_comments, so any address that reaches that column is published to every
// reader of the document. Both the write path (app/api/comments) and the read
// fallback (content-worker commentsList) route through this one function so
// they cannot drift apart and produce two different names for one person.

// The part before the @ — enough to tell two people apart in a thread without
// publishing anyone's address.
export function displayNameFromEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  const local = at > 0 ? email.slice(0, at) : email;
  return local || null;
}

// True when a string looks like it contains an address. Used by tests as a
// blunt guard against an address reaching a public field.
export function looksLikeEmail(value: string | null | undefined): boolean {
  return typeof value === "string" && value.includes("@");
}
