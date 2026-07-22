// Lightweight, dependency-free abuse heuristic for published content (companion
// spec §7). Runs inline at publish on both front doors. Tuned for PRECISION:
//   - "block" only when a credential-capture STRUCTURE (password field / external
//     form) coincides with phishing PHRASING or a crypto-scam signal.
//   - "flag" on a single softer signal — allowed, but counted toward workspace
//     auto-suspension. Legit AI output should score "ok".
// This is a backstop, not a classifier; the sanitizer already strips active markup.

export type Verdict = "ok" | "flag" | "block";

export interface ScanResult {
  verdict: Verdict;
  reasons: string[];
}

const CRED_PHRASE =
  /verify your (?:account|identity|password)|confirm your (?:password|account|identity)|your account (?:has been|will be) (?:suspended|locked|disabled|restricted|deactivated)|update your (?:payment|billing) (?:info|information|details|method)|unusual (?:sign-?in|log-?in|login) activity|re-?enter your (?:password|credentials)|validate your (?:account|identity)|verify to (?:continue|avoid)/i;

const CRYPTO_SCAM =
  /seed phrase|recovery phrase|private key|connect your wallet|wallet (?:validation|verification)|double your (?:btc|eth|bitcoin|ethereum|crypto|money)|send (?:btc|eth|bitcoin|ethereum) to|claim your (?:airdrop|reward) now/i;

const BRAND =
  /paypal|apple id|icloud|microsoft|office ?365|google account|amazon|netflix|coinbase|binance|metamask|wells fargo|bank of america|chase bank|usps|fedex|irs/i;

// A password field in the rendered HTML.
const PW_INPUT = /<input[^>]+type=["']?password/i;

// A form posting to any host other than ilolink.com (credential exfiltration).
const EXTERNAL_FORM =
  /<form[^>]+action=["']?https?:\/\/(?!(?:[a-z0-9-]+\.)*ilolink\.com)[^"'\s>]+/i;

export function scanContent(raw: string, html: string): ScanResult {
  const text = `${raw}\n${html}`;
  const reasons: string[] = [];

  const phrase = CRED_PHRASE.test(text);
  if (phrase) reasons.push("credential-harvest phrasing");
  const crypto = CRYPTO_SCAM.test(text);
  if (crypto) reasons.push("crypto-scam phrasing");
  const brand = BRAND.test(text);

  const pwInput = PW_INPUT.test(html);
  const externalForm = EXTERNAL_FORM.test(html);
  const structural = (pwInput && externalForm) || (pwInput && (phrase || brand));
  if (pwInput && externalForm) reasons.push("password field posting to an external site");
  else if (pwInput) reasons.push("password field in the document");
  if (externalForm) reasons.push("form posting to an external site");

  // Block: a capture structure AND a social-engineering signal — high confidence.
  if (structural && (phrase || crypto || brand)) {
    return { verdict: "block", reasons };
  }
  // Flag: any single softer signal. Allowed, but counted.
  if (phrase || crypto || structural || (brand && externalForm)) {
    return { verdict: "flag", reasons };
  }
  return { verdict: "ok", reasons: [] };
}
