// Resend transport. A plain fetch, no SDK — matching the repo's dependency-free
// posture (see lib/publish/store-core.ts for the same reasoning about bindings).
//
// Config is passed IN rather than read from env() so this module is importable
// by mcp-worker and content-worker, neither of which has OpenNext's env().

import type { EmailBody } from "./templates";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface MailerConfig {
  apiKey: string;
  // Must be an address on a domain verified in Resend. As of 2026-08-01 the
  // account has novagoals.com verified but NOT ilolink.com, so production
  // sending from an @ilolink.com address is blocked until DNS is set up.
  from: string;
  // Set for local dev to skip the network entirely; the message is logged.
  dryRun?: boolean;
}

export class EmailError extends Error {}

export async function sendEmail(
  cfg: MailerConfig,
  to: string,
  body: EmailBody,
): Promise<void> {
  if (cfg.dryRun) {
    console.log(
      `[email:dry-run] to=${to} subject=${JSON.stringify(body.subject)}\n${body.text}`,
    );
    return;
  }
  if (!cfg.apiKey) throw new EmailError("Email is not configured.");

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: cfg.from,
      to: [to],
      subject: body.subject,
      html: body.html,
      text: body.text,
    }),
  });

  if (!res.ok) {
    // Resend echoes the recipient in its error payloads; keep it out of logs.
    const detail = await res.text().catch(() => "");
    console.error(`[email] resend ${res.status}: ${detail.slice(0, 300)}`);
    throw new EmailError("Could not send the email. Try again in a moment.");
  }
}
