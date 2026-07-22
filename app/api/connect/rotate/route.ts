// POST /api/connect/rotate — rotate a ChatGPT workspace's token (companion spec
// §7). The current workspace id IS the bearer secret, so possessing it (via the
// dashboard link) authorizes the rotation. Migrates the workspace + its docs to
// a fresh id; the old connector/dashboard URL stops working.

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
  if (!(await rateLimit(`rotate:ip:${ip}`, 20, 3600))) {
    return NextResponse.json({ error: "Too many rotations. Try again later." }, { status: 429 });
  }

  let body: { workspace_id?: unknown };
  try {
    body = (await req.json()) as { workspace_id?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const oldId = typeof body.workspace_id === "string" ? body.workspace_id : "";
  if (!/^w_[0-9A-Za-z]+$/.test(oldId)) {
    return NextResponse.json({ error: "Missing or malformed workspace_id." }, { status: 400 });
  }

  const db = env().DB;
  const ws = await db
    .prepare("SELECT id, origin FROM workspaces WHERE id = ? AND status = 'active'")
    .bind(oldId)
    .first<{ id: string; origin: string }>();
  if (!ws) {
    return NextResponse.json({ error: "Unknown workspace." }, { status: 404 });
  }
  // Only token-path workspaces have a rotatable URL secret.
  if (ws.origin !== "chatgpt_token") {
    return NextResponse.json(
      { error: "This workspace has no URL secret to rotate (OAuth-managed)." },
      { status: 400 },
    );
  }

  const newId = `w_${nano()}`;
  await db.batch([
    db.prepare("UPDATE documents SET workspace_id = ? WHERE workspace_id = ?").bind(newId, oldId),
    db.prepare("UPDATE workspaces SET id = ?, last_seen_at = ? WHERE id = ?").bind(newId, Date.now(), oldId),
  ]);

  return NextResponse.json({
    workspace_id: newId,
    connector_url: `https://mcp.ilolink.com/${newId}/mcp`,
    dashboard_url: `https://ilolink.com/w/${newId}`,
  });
}
