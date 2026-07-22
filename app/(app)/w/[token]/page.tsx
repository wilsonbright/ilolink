// Login-free workspace dashboard (companion spec §3, §4.5). The link is the key:
// a signed OAuth token (w_XXXX~sig) or a bare ChatGPT token (w_XXXX). We verify,
// resolve the workspace, and render its live documents from D1. No session.

import Link from "next/link";
import { notFound } from "next/navigation";
import { env } from "@/lib/cf";
import { verifyDashboardToken } from "@/lib/mcp/dashboard-token";
import { RotateToken } from "./rotate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  slug: string;
  title: string | null;
  source_type: string;
  visibility: string;
  published_at: number;
}

interface ViewCounterStub {
  get(): Promise<number>;
}

async function views(docId: string): Promise<number> {
  try {
    const ns = (env() as unknown as { VIEW_COUNTER?: DurableObjectNamespace }).VIEW_COUNTER;
    if (!ns) return 0;
    const stub = ns.get(ns.idFromName(docId)) as unknown as ViewCounterStub;
    return await stub.get();
  } catch {
    return 0;
  }
}

function fmtDate(ms: number): string {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(ms);
}

export default async function WorkspaceDashboard({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const secret = (env() as unknown as { DASHBOARD_SECRET?: string }).DASHBOARD_SECRET ?? "";
  const workspaceId = await verifyDashboardToken(decodeURIComponent(token), secret);
  if (!workspaceId) notFound();

  const ws = await env()
    .DB.prepare("SELECT id, origin FROM workspaces WHERE id = ? AND status = 'active'")
    .bind(workspaceId)
    .first<{ id: string; origin: string }>();
  if (!ws) notFound();

  const res = await env()
    .DB.prepare(
      `SELECT id, slug, title, source_type, visibility, published_at
         FROM documents
        WHERE workspace_id = ? AND unpublished_at IS NULL
        ORDER BY published_at DESC LIMIT 200`,
    )
    .bind(workspaceId)
    .all<Row>();
  const docs = res.results;
  const withViews = await Promise.all(docs.map(async (d) => ({ ...d, views: await views(d.id) })));

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-ink">Your workspace</h1>
        <Link href="/connect" className="text-sm text-accent transition-colors duration-150 hover:text-ink">
          Connect another app
        </Link>
      </div>
      <p className="mt-2 text-sm text-ink-faint">
        Published from {ws.origin === "claude_oauth" ? "Claude" : ws.origin === "chatgpt_token" ? "ChatGPT" : "the web"} ·
        no login — this link is the key, keep it private.
      </p>

      {withViews.length === 0 ? (
        <p className="mt-10 text-ink-soft">Nothing published to this workspace yet.</p>
      ) : (
        <ul className="mt-8">
          {withViews.map((d) => (
            <li key={d.id} className="border-b border-hairline py-5 last:border-b-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <a
                    href={`https://ilolink.com/${d.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-medium text-ink transition-colors duration-150 hover:text-accent"
                  >
                    {d.title || "Untitled"}
                  </a>
                  <p className="mt-1 text-sm text-ink-faint">
                    /{d.slug} · {d.source_type} · Published {fmtDate(d.published_at)}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                  {d.views.toLocaleString()} views
                </span>
              </div>
              <p className="mt-2 text-sm">
                <Link href={`/dashboard/${d.slug}`} className="text-ink-soft transition-colors duration-150 hover:text-accent">
                  Stats &amp; comments
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}

      {ws.origin === "chatgpt_token" ? (
        <div className="mt-10 border-t border-hairline pt-6">
          <RotateToken workspaceId={workspaceId} />
        </div>
      ) : null}
    </section>
  );
}
