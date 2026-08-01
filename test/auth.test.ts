import { describe, it, expect } from "vitest";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  readSessionCookie,
  serializeSessionCookie,
} from "@/lib/auth/cookies";
import { DEFAULT_REDIRECT, safeRedirect } from "@/lib/auth/redirect";
import {
  CODE_LENGTH,
  generateCode,
  isPlausibleEmail,
  isWellFormedCode,
  normalizeCode,
  normalizeEmail,
} from "@/lib/auth/otp";
import { signInEmail } from "@/lib/email/templates";
import { displayNameFromEmail, looksLikeEmail } from "@/lib/email/display";
import { hashPassword, verifyPassword } from "@/lib/crypto/password";

// The cookie is the security boundary between the app origin and the untrusted
// content origin they share a registrable domain with. These assertions are the
// cheapest insurance in the auth system.
describe("session cookie", () => {
  it("never carries a Domain attribute", () => {
    // A Domain=.ilolink.com cookie would be sent to view.ilolink.com, which
    // serves untrusted author HTML (and arbitrary JS on trusted=1 docs).
    expect(serializeSessionCookie("abc")).not.toMatch(/Domain=/i);
    expect(clearSessionCookie()).not.toMatch(/Domain=/i);
  });

  it("uses the __Host- prefix so the browser enforces host-locking", () => {
    expect(SESSION_COOKIE.startsWith("__Host-")).toBe(true);
  });

  it("satisfies every __Host- precondition, or browsers reject it outright", () => {
    const c = serializeSessionCookie("abc");
    expect(c).toMatch(/;\s*Secure/);
    expect(c).toMatch(/;\s*Path=\/(;|$)/);
    expect(c).not.toMatch(/Domain=/i);
  });

  it("is HttpOnly and SameSite=Lax", () => {
    const c = serializeSessionCookie("abc");
    expect(c).toMatch(/;\s*HttpOnly/);
    // Strict would break the click-through from an emailed magic link.
    expect(c).toMatch(/;\s*SameSite=Lax/);
  });

  it("clears with Max-Age=0", () => {
    expect(clearSessionCookie()).toMatch(/;\s*Max-Age=0/);
  });

  it("reads its own value back out of a Cookie header", () => {
    const raw = "tok_value_123";
    const header = `other=1; ${SESSION_COOKIE}=${raw}; another=2`;
    expect(readSessionCookie(header)).toBe(raw);
  });

  it("returns null for absent, empty, or malformed headers", () => {
    expect(readSessionCookie(null)).toBeNull();
    expect(readSessionCookie("")).toBeNull();
    expect(readSessionCookie("nonsense")).toBeNull();
    expect(readSessionCookie(`${SESSION_COOKIE}=`)).toBeNull();
    // Must not match a different cookie whose name merely ends the same way.
    expect(readSessionCookie(`x_${SESSION_COOKIE}=nope`)).toBeNull();
  });
});

// `next` rides through an emailed link, so it is fully attacker-controlled.
describe("safeRedirect", () => {
  it("keeps ordinary same-origin paths", () => {
    expect(safeRedirect("/dashboard")).toBe("/dashboard");
    expect(safeRedirect("/t/abc/skills?q=1")).toBe("/t/abc/skills?q=1");
  });

  it("falls back when absent", () => {
    expect(safeRedirect(null)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect("")).toBe(DEFAULT_REDIRECT);
  });

  it("rejects absolute URLs to another origin", () => {
    expect(safeRedirect("https://evil.example")).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect("http://evil.example/x")).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect("javascript:alert(1)")).toBe(DEFAULT_REDIRECT);
  });

  it("rejects protocol-relative URLs that merely start with a slash", () => {
    expect(safeRedirect("//evil.example")).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect("//evil.example/path")).toBe(DEFAULT_REDIRECT);
  });

  it("rejects backslash variants some browsers normalize to //", () => {
    expect(safeRedirect("/\\evil.example")).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect("/path\\x")).toBe(DEFAULT_REDIRECT);
  });

  it("rejects control characters that enable response splitting", () => {
    expect(safeRedirect("/ok" + String.fromCharCode(13, 10) + "X: y")).toBe(
      DEFAULT_REDIRECT,
    );
    expect(safeRedirect("/ok" + String.fromCharCode(0))).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect("/ok" + String.fromCharCode(9))).toBe(DEFAULT_REDIRECT);
  });
});

describe("sign-in codes", () => {
  it("generates a code of exactly the declared length, digits only", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateCode();
      expect(c).toHaveLength(CODE_LENGTH);
      expect(isWellFormedCode(c)).toBe(true);
    }
  });

  it("covers every digit across many draws (rejection sampling is unbiased)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) for (const ch of generateCode()) seen.add(ch);
    expect(seen.size).toBe(10);
  });

  it("normalizes codes users paste with spaces or hyphens", () => {
    expect(normalizeCode(" 123 456 ")).toBe("123456");
    expect(normalizeCode("123-456")).toBe("123456");
  });

  it("rejects malformed codes", () => {
    expect(isWellFormedCode("12345")).toBe(false);
    expect(isWellFormedCode("1234567")).toBe(false);
    expect(isWellFormedCode("abcdef")).toBe(false);
  });
});

describe("email normalization", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Wilson@Example.COM ")).toBe("wilson@example.com");
  });

  it("does NOT strip +tags or dots", () => {
    // Provider-specific folding would let one person claim another's invite.
    expect(normalizeEmail("a+b@gmail.com")).toBe("a+b@gmail.com");
    expect(normalizeEmail("a.b@gmail.com")).toBe("a.b@gmail.com");
  });

  it("accepts plausible addresses and rejects junk", () => {
    expect(isPlausibleEmail("wilson@blocksurvey.org")).toBe(true);
    expect(isPlausibleEmail("a@b.co")).toBe(true);
    expect(isPlausibleEmail("no-at-sign")).toBe(false);
    expect(isPlausibleEmail("a@b")).toBe(false); // no TLD
    expect(isPlausibleEmail("a b@c.com")).toBe(false);
    expect(isPlausibleEmail("")).toBe(false);
  });
});

describe("sign-in email", () => {
  it("carries both the code and the link", () => {
    const body = signInEmail("123456", "https://ilolink.com/auth/callback?t=x", 10);
    expect(body.subject).toContain("123456");
    expect(body.html).toContain("123456");
    expect(body.html).toContain("https://ilolink.com/auth/callback?t=x");
    expect(body.text).toContain("123456");
    expect(body.text).toContain("https://ilolink.com/auth/callback?t=x");
  });

  it("escapes interpolated values into the HTML body", () => {
    const body = signInEmail("111111", 'https://x/?a="><script>', 10);
    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain("&lt;script&gt;");
  });
});

// Comment author names are returned verbatim by the content worker's PUBLIC
// GET /_comments. An address reaching that column is published to every reader
// of the document — a privacy break that is invisible in review, because the
// field looks like an innocuous display name.
describe("public display names never carry an address", () => {
  it("reduces an email to its local part", () => {
    expect(displayNameFromEmail("alice@example.com")).toBe("alice");
    expect(displayNameFromEmail("a.b+tag@sub.example.co.uk")).toBe("a.b+tag");
  });

  it("never returns anything containing @", () => {
    for (const e of [
      "alice@example.com",
      "weird@@example.com",
      "UPPER@EXAMPLE.COM",
    ]) {
      expect(looksLikeEmail(displayNameFromEmail(e))).toBe(false);
    }
  });

  it("handles absent and degenerate input without throwing", () => {
    expect(displayNameFromEmail(null)).toBeNull();
    expect(displayNameFromEmail("")).toBeNull();
    // No @ at all: pass it through rather than inventing a name.
    expect(displayNameFromEmail("nobody")).toBe("nobody");
    // Leading @ would otherwise slice to an empty string.
    expect(displayNameFromEmail("@example.com")).toBe("@example.com");
  });
});

// Cloudflare Workers' WebCrypto refuses PBKDF2 above 100,000 iterations. The
// repo shipped 600,000, which threw on every call in production — unnoticed
// because the only caller (password-protected documents) was never exercised.
// Sign-in codes now depend on this working, so pin it.
describe("PBKDF2 stays within the Workers platform limit", () => {
  it("hashes and verifies a round trip", async () => {
    const stored = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong horse", stored)).toBe(false);
  });

  it("never emits an iteration count Workers would reject", async () => {
    const stored = await hashPassword("x");
    const iterations = Number(stored.split("$")[1]);
    expect(iterations).toBeLessThanOrEqual(100_000);
    expect(iterations).toBeGreaterThan(0);
  });

  it("returns false, rather than throwing, for a legacy over-limit hash", async () => {
    // A 600k hash written before the cap can never be verified on Workers.
    // The caller must see "wrong password", not a 500.
    const legacy = "pbkdf2$600000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    await expect(verifyPassword("anything", legacy)).resolves.toBe(false);
  });
});
