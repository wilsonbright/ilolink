// POST /api/connect — mint an anonymous ilolink workspace for the ChatGPT path
// (companion spec §5.2). Returns a tokenized connector URL + a dashboard URL.
// The connector URL is a bearer secret; treat it like a password.

import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { env } from "@/lib/cf";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const nano = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  16,
);

export async function POST(req: Request): Promise<NextResponse> {
  const ip = clientIp(req);
  // Minting is cheap but still abuse-worthy — cap per IP.
  if (!(await rateLimit(`connect:ip:${ip}`, 10, 3600))) {
    return NextResponse.json(
      { error: "Too many workspaces created from here. Try again later." },
      { status: 429 },
    );
  }

  const id = `w_${nano()}`;
  const now = Date.now();
  await env()
    .DB.prepare(
      `INSERT INTO workspaces
        (id, created_at, last_seen_at, origin, plan, quota_docs, status)
       VALUES (?, ?, ?, 'chatgpt_token', 'anon', 50, 'active')`,
    )
    .bind(id, now, now)
    .run();

  return NextResponse.json(
    {
      workspace_id: id,
      connector_url: `https://mcp.ilolink.com/${id}/mcp`,
      // The token is the key: for the ChatGPT path the id itself opens the
      // dashboard (it is already a bearer secret the user holds).
      dashboard_url: `https://ilolink.com/w/${id}`,
    },
    { status: 201 },
  );
}
