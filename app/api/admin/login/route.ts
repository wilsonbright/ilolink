// POST /api/admin/login — exchange the ADMIN_SECRET for an HttpOnly session
// cookie (audit MEDIUM #4). The secret previously rode in the page URL (?key=),
// where it landed in edge/request logs, browser history, and the RSC payload.
// Now it is presented once via POST and held in a cookie the browser JS can't
// read and that never appears in a URL.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdmin, ADMIN_COOKIE } from "@/lib/admin/gate";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  let body: { key?: unknown };
  try {
    body = (await req.json()) as { key?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const key = typeof body.key === "string" ? body.key : "";
  if (!verifyAdmin(key)) {
    return NextResponse.json({ error: "Wrong key." }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, key, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h session
  });
  return NextResponse.json({ ok: true });
}
