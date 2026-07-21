// CSP for served documents on the content origin (spec §6.3).
// Baseline: default-src 'none'. The document has been sanitized to inert HTML,
// so it needs no script of its own. The ONLY script permitted is the first-party
// tracker, admitted by a per-response nonce. This double-guards a sanitizer miss.

export interface DocCspResult {
  nonce: string;
  header: string;
}

// Base64url nonce from the Workers crypto (Web Crypto is available at the edge).
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Build the CSP for a served document. `trackerHost` is the first-party origin
// that serves /tracker.js (defaults to 'self' — self-hosted on the content origin).
export function buildDocCsp(opts?: {
  trackerSrc?: string;
  // pdf documents embed a same-origin <iframe src="/raw/…"> served as the
  // browser's native PDF viewer. Only same-origin framing is permitted.
  allowFrame?: boolean;
}): DocCspResult {
  const nonce = makeNonce();
  const script = opts?.trackerSrc
    ? `'nonce-${nonce}' ${opts.trackerSrc}`
    : `'nonce-${nonce}'`;

  const directives = [
    "default-src 'none'",
    // Inline styles for document formatting + Google Fonts stylesheets
    // (@import from fonts.googleapis.com). No other external stylesheets.
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    // http(s) + data: images only (matches the sanitizer's image scheme allowlist).
    "img-src https: data:",
    // Self / data fonts + Google Fonts files (fonts.gstatic.com). No other hosts.
    "font-src 'self' data: https://fonts.gstatic.com",
    // Links may point anywhere, but nothing is fetched from them.
    "connect-src 'self'",
    // Only the nonce'd first-party tracker script may run.
    `script-src ${script}`,
    // No plugins, no base tag hijack, no form posts. pdf docs may frame their
    // own /raw viewer (same origin); all other docs frame nothing.
    "object-src 'none'",
    opts?.allowFrame ? "frame-src 'self'" : "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ];

  return { nonce, header: directives.join("; ") };
}

// CSP for the content origin's own first-party chrome pages (password gate,
// 404, 410). No untrusted content, no scripts — but the gate must be able to
// POST to /_unlock, so form-action is 'self' (unlike the doc CSP's 'none').
export function buildChromeCsp(): string {
  return [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
  ].join("; ");
}

// Security headers applied alongside the CSP on every served document.
export function docSecurityHeaders(csp: string): Record<string, string> {
  return {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    // Untrusted content must not be able to claim powerful features.
    "Permissions-Policy":
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  };
}
