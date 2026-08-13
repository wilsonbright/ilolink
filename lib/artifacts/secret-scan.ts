// A last-resort credential check for agent-initiated registry writes.
//
// WHY THIS EXISTS SEPARATELY FROM lib/abuse/scan.ts: that one hunts phishing
// pages — credential-capture phrasing and external password forms in published
// documents. Wrong instrument. This one asks a much narrower question: does
// this body contain something that is, on its face, a live credential?
//
// PRECISION OVER RECALL, deliberately. This scanner REFUSES a write, and the
// agent that gets refused has no way to tell a true positive from a false one:
// it just learns the tool is broken and stops contributing. So every pattern
// here has to be a token format that is (a) issued by a real provider and
// (b) shaped distinctly enough that prose about it does not match. Anything
// entropy-based, anything matching `password = ...`, anything that would fire
// on a doc EXPLAINING key handling — deliberately absent. A runbook that says
// "rotate the AKIA key in the console" must pass; one that pastes
// AKIAIOSFODNN7EXAMPLE must not.
//
// This is a floor, not a guarantee: a determined leak (a base64'd key, a
// bespoke internal token) walks straight through. The real containment is that
// contributions are proposals a human reads before anyone else can — see
// contributeArtifact in ./store-core.

export interface SecretMatch {
  // What kind of credential, in words a model can act on. NEVER the matched
  // text: the refusal travels back through the tool result and into a
  // transcript, and echoing a live key would copy it somewhere new.
  label: string;
}

const PATTERNS: ReadonlyArray<{ label: string; re: RegExp }> = [
  // AWS access key id. The AKIA prefix plus exactly 16 uppercase alphanumerics
  // is specific enough that prose about "the AKIA key" cannot reach it.
  { label: "an AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  // GitHub: classic PAT, fine-grained PAT, OAuth/app/refresh tokens.
  { label: "a GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/ },
  { label: "a GitHub fine-grained token", re: /\bgithub_pat_[A-Za-z0-9_]{22,255}\b/ },
  // Anthropic.
  { label: "an Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  // OpenAI. Requires the length so "sk-..." in an example line does not match.
  { label: "an OpenAI API key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/ },
  // Slack bot/user/app/refresh tokens.
  { label: "a Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  // Stripe live secret/restricted keys. Test keys (sk_test_) are deliberately
  // NOT matched — they are safe to document and appear in real runbooks.
  { label: "a Stripe live key", re: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/ },
  // Google API key.
  { label: "a Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  // Any PEM private key block.
  {
    label: "a private key block",
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  // Our own connector token. A contributed body carrying one of these would
  // hand every reader of the registry a working connection to this teamspace.
  { label: "an ilolink connector token", re: /\bilo_pat_[A-Za-z0-9_-]{16,}/ },
];

// Returns the first credential class found, or null. First match is enough:
// the caller refuses either way, and enumerating every hit in a leaked file
// only produces a longer message about content we are trying not to handle.
export function scanForSecrets(body: string): SecretMatch | null {
  for (const p of PATTERNS) {
    if (p.re.test(body)) return { label: p.label };
  }
  return null;
}
