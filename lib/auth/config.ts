// Auth-related environment wiring, in one place so the routes stay readable.

import { env } from "@/lib/cf";
import type { MailerConfig } from "@/lib/email/send";

export function siteOrigin(): string {
  return (env() as unknown as { SITE_ORIGIN?: string }).SITE_ORIGIN ?? "https://ilolink.com";
}

export function mailerConfig(): MailerConfig {
  const e = env() as unknown as {
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    EMAIL_DRY_RUN?: string;
  };
  return {
    apiKey: e.RESEND_API_KEY ?? "",
    from: e.EMAIL_FROM ?? "ilolink <auth@ilolink.com>",
    // Local dev without a verified domain: log the message instead of sending.
    dryRun: e.EMAIL_DRY_RUN === "1" || !e.RESEND_API_KEY,
  };
}
