import { env } from "@/lib/cf";

// Cloudflare Turnstile server-side verification (spec §6.1). Gates publish only,
// on the app origin — never loaded onto the strict-CSP content origin.
// TURNSTILE_SECRET is a Worker secret; the sitekey is public and lives in the form.
//
// If the secret is unset (local/preview before provisioning), fail CLOSED in
// production. Cloudflare's always-pass test secret (1x000…AA) can be set to
// exercise the flow end to end without a real widget.
interface Secrets {
  TURNSTILE_SECRET?: string;
}

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstile(
  token: string | undefined | null,
  ip: string,
): Promise<boolean> {
  const secret = (env() as CloudflareEnv & Secrets).TURNSTILE_SECRET;
  if (!secret) return false; // fail closed — no secret, no publish
  if (!token) return false;

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body },
  );
  if (!res.ok) return false;
  const data = (await res.json()) as SiteverifyResponse;
  return data.success === true;
}
