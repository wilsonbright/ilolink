// Delivery of the magic-link email. In production we POST to Resend; without an
// API key (local dev) we log the URL and stash it in KV so a dev route can show
// it, so nobody needs a real mailbox to sign in locally.
import { env } from "@/lib/cf";

// RESEND_API_KEY is a wrangler secret, not part of the generated CloudflareEnv.
interface Secrets {
  RESEND_API_KEY?: string;
}

const FROM = "ilolink <login@ilolink.com>";
const DEV_TTL_SECONDS = 15 * 60; // mirrors the magic-link lifetime
const devKey = (email: string) => `devmagic:${email}`;

export interface SendResult {
  sent: boolean;
  devUrl?: string;
}

export async function sendMagicLink(email: string, url: string): Promise<SendResult> {
  const apiKey = (env() as CloudflareEnv & Secrets).RESEND_API_KEY;

  // Dev fallback: no provider configured.
  if (!apiKey) {
    console.log(`[ilolink] magic link for ${email}: ${url}`);
    await env().KV.put(devKey(email), url, { expirationTtl: DEV_TTL_SECONDS });
    return { sent: false, devUrl: url };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: "Your ilolink sign-in link",
      text: `Sign in to ilolink:\n\n${url}\n\nThis link works once and expires in 15 minutes. If you didn't request it, ignore this email.`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  }
  return { sent: true };
}
