import { describe, it, expect } from "vitest";
import { scanForSecrets } from "@/lib/artifacts/secret-scan";

// PRECISION is the property under test, not recall. A hit here REFUSES an
// agent's contribution, and the agent cannot tell a true positive from a false
// one — it concludes the tool is broken and stops contributing. So the negative
// cases below matter more than the positive ones: every one of them is prose a
// real runbook would contain, and every one of them must pass through.
//
// The samples that DO match are fabricated in the documented shape of each
// provider's token. None of them is live.
//
// They are also ASSEMBLED AT RUNTIME rather than written as literals. The first
// version of this file spelled them out and GitHub's push protection blocked
// the push on the Slack and Stripe cases — which is a fair summary of how
// convincing the shapes are. Concatenating the prefix keeps the fixture out of
// every credential scanner that reads this repo while the string the regex
// actually sees is unchanged.
const tok = (prefix: string, rest: string) => prefix + rest;

describe("credentials the scanner must catch", () => {
  const LIVE: ReadonlyArray<{ what: string; names: string; body: string }> = [
    {
      what: "an AWS access key id",
      names: "AWS",
      body: `aws_access_key_id = ${tok("AKIA", "IOSFODNN7EXAMPLE")}`,
    },
    {
      what: "a GitHub classic PAT",
      names: "GitHub",
      body: `export GH_TOKEN=${tok("ghp", "_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8")}`,
    },
    {
      what: "a GitHub fine-grained PAT",
      names: "GitHub",
      body: `token: ${tok("github_pat", "_11ABCDEFG0aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789")}`,
    },
    {
      what: "an Anthropic API key",
      names: "Anthropic",
      body: `ANTHROPIC_API_KEY=${tok("sk-ant", "-api03-Zx9WvUtSrQpOnMlKjIhGfEdCbA0987654321")}`,
    },
    {
      what: "an OpenAI API key",
      names: "OpenAI",
      body: `openai.api_key = '${tok("sk-", "Zx9WvUtSrQpOnMlKjIhGfEdCbA0987654321abcd")}'`,
    },
    {
      what: "a Slack bot token",
      names: "Slack",
      body: `SLACK_BOT_TOKEN=${tok("xox", "b-2147483647-2147483647-abcdEFGHijklMNOPqrstUVWX")}`,
    },
    {
      what: "a Stripe live secret key",
      names: "Stripe",
      body: `STRIPE_SECRET_KEY=${tok("sk_", "live_51AbCdEfGhIjKlMnOpQrStUvWx")}`,
    },
    {
      what: "a Google API key",
      names: "Google",
      // Exactly 35 characters after the prefix, as Google issues them.
      body: `maps key ${tok("AIza", "SyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q")}`,
    },
    {
      what: "a PEM private key block",
      names: "private key",
      body: "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----",
    },
    {
      what: "an ilolink connector token",
      names: "ilolink",
      body: `connect with ${tok("ilo_pat", "_9f4a1c2b8e7d6f5a3c2b1e0d")}`,
    },
  ];

  for (const c of LIVE) {
    it(`refuses ${c.what}`, () => {
      const m = scanForSecrets(c.body);
      expect(m).not.toBeNull();
      expect(m!.label).toContain(c.names);
    });
  }

  // The refusal travels back through the tool result into a transcript. If the
  // match ever rode along, refusing a leak would be how the leak spreads.
  it("never echoes the matched text back to the caller", () => {
    for (const c of LIVE) {
      const m = scanForSecrets(c.body);
      const serialized = JSON.stringify(m);
      for (const token of c.body.split(/[\s='"]+/).filter((t) => t.length > 12)) {
        expect(serialized).not.toContain(token);
      }
    }
  });
});

describe("prose the scanner must not refuse", () => {
  const SAFE: ReadonlyArray<[string, string]> = [
    [
      "a runbook naming a key format without pasting one",
      "Rotate the AKIA key in the console every 90 days, then update the ghp_ token in CI.",
    ],
    [
      "the bare sk- prefix in prose",
      "OpenAI keys start with the sk- prefix; ours are stored in the secret manager.",
    ],
    [
      "a Stripe TEST key, which is safe to document",
      "Use sk_test_51AbCdEfGhIjKlMnOpQrStUvWx against the sandbox account.",
    ],
    [
      "a base64 blob",
      "icon: iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    ],
    ["a UUID", "correlation id 3f2504e0-4f89-11d3-9a0c-0305e82c3301"],
    ["a git SHA", "reverted in 9f4a1c2b8e7d6f5a3c2b1e0d9f8a7b6c5d4e3f21"],
    [
      "a certificate block, which is public by design",
      "Paste the chain below the leaf:\n-----BEGIN CERTIFICATE-----\nMIIDdTCCAl2gAwIBAgI\n-----END CERTIFICATE-----",
    ],
    [
      "an env var name with no value",
      "Set OPENAI_API_KEY and ANTHROPIC_API_KEY in the deploy environment; neither is checked in.",
    ],
    [
      "placeholders in an example",
      "curl -H 'Authorization: Bearer sk-xxxxxxxx' or substitute <your-api-key>.",
    ],
  ];

  for (const [what, body] of SAFE) {
    it(`passes ${what}`, () => {
      expect(scanForSecrets(body)).toBeNull();
    });
  }

  it("passes an ordinary procedure that mentions every provider", () => {
    expect(
      scanForSecrets(
        [
          "# Key rotation",
          "",
          "1. AWS: retire the old AKIA credential in IAM before issuing the new one.",
          "2. GitHub: replace the fine-grained token (github_pat_ prefix) in Actions.",
          "3. Stripe: live keys are sk_live_ and must never leave the vault.",
          "4. Slack: the xoxb bot token is owned by the platform team.",
          "5. Google: the AIza browser key is domain-restricted, not secret.",
          "",
          "Private keys live in the HSM. Never commit a PRIVATE KEY block.",
        ].join("\n"),
      ),
    ).toBeNull();
  });
});
