// Moderation review surface (admin-only). Gated by ?key=<ADMIN_SECRET>. Shows
// open abuse reports (grouped by doc), suspended workspaces, and flagged
// workspaces, with one-click actions. Not linked from anywhere; the key is the
// gate. See lib/admin/gate.ts + /api/admin/action.

import { notFound } from "next/navigation";
import { env } from "@/lib/cf";
import { verifyAdmin } from "@/lib/admin/gate";
import { ActionButton } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReportGroup {
  document_id: string;
  cnt: number;
  reasons: string | null;
  slug: string;
  title: string | null;
  workspace_id: string | null;
  unpublished_at: number | null;
}
interface Ws {
  id: string;
  origin: string;
  abuse_flags: number;
  docs?: number;
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  if (!verifyAdmin(key)) notFound();
  const adminKey = key as string;
  const db = env().DB;

  const reports = (
    await db
      .prepare(
        `SELECT r.document_id, COUNT(*) AS cnt, GROUP_CONCAT(r.reason, ' | ') AS reasons,
                d.slug, d.title, d.workspace_id, d.unpublished_at
           FROM reports r JOIN documents d ON d.id = r.document_id
          WHERE r.status = 'open'
          GROUP BY r.document_id
          ORDER BY cnt DESC, MAX(r.created_at) DESC
          LIMIT 100`,
      )
      .all<ReportGroup>()
  ).results;

  const suspended = (
    await db
      .prepare(
        `SELECT id, origin, abuse_flags,
                (SELECT COUNT(*) FROM documents WHERE workspace_id = workspaces.id) AS docs
           FROM workspaces WHERE status = 'suspended' ORDER BY created_at DESC LIMIT 100`,
      )
      .all<Ws>()
  ).results;

  const flagged = (
    await db
      .prepare(
        "SELECT id, origin, abuse_flags FROM workspaces WHERE status = 'active' AND abuse_flags > 0 ORDER BY abuse_flags DESC LIMIT 100",
      )
      .all<Ws>()
  ).results;

  const box = "rounded-lg border border-hairline bg-surface p-4";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-ink">Moderation</h1>
      <p className="mt-2 text-sm text-ink-faint">
        {reports.length} reported · {suspended.length} suspended · {flagged.length} flagged
      </p>

      <h2 className="mt-10 text-lg font-medium text-ink">Open reports</h2>
      {reports.length === 0 ? (
        <p className="mt-2 text-ink-soft">No open reports.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reports.map((r) => (
            <li key={r.document_id} className={box}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <a
                    href={`https://ilolink.com/${r.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ink hover:text-accent"
                  >
                    {r.title || "Untitled"}
                  </a>
                  <p className="mt-1 text-sm text-ink-faint">
                    /{r.slug} · {r.cnt} report{r.cnt === 1 ? "" : "s"}
                    {r.unpublished_at ? " · offline" : ""}
                    {r.workspace_id ? ` · ${r.workspace_id}` : ""}
                  </p>
                  <p className="mt-1 truncate text-sm text-ink-soft">{r.reasons}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {r.unpublished_at ? (
                  <ActionButton op="restore" target={r.document_id} label="Restore" adminKey={adminKey} />
                ) : (
                  <ActionButton op="unpublish" target={r.document_id} label="Unpublish" adminKey={adminKey} danger />
                )}
                <ActionButton op="dismiss" target={r.document_id} label="Dismiss reports" adminKey={adminKey} />
                {r.workspace_id ? (
                  <ActionButton op="suspend" target={r.workspace_id} label="Suspend workspace" adminKey={adminKey} danger />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 text-lg font-medium text-ink">Suspended workspaces</h2>
      {suspended.length === 0 ? (
        <p className="mt-2 text-ink-soft">None.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {suspended.map((w) => (
            <li key={w.id} className={`${box} flex items-center justify-between gap-4`}>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-ink">{w.id}</p>
                <p className="mt-1 text-sm text-ink-faint">
                  {w.origin} · {w.abuse_flags} flags · {w.docs ?? 0} docs
                </p>
              </div>
              <ActionButton op="unsuspend" target={w.id} label="Unsuspend" adminKey={adminKey} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 text-lg font-medium text-ink">Flagged (active)</h2>
      {flagged.length === 0 ? (
        <p className="mt-2 text-ink-soft">None.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {flagged.map((w) => (
            <li key={w.id} className={`${box} flex items-center justify-between gap-4`}>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-ink">{w.id}</p>
                <p className="mt-1 text-sm text-ink-faint">
                  {w.origin} · {w.abuse_flags} flags
                </p>
              </div>
              <ActionButton op="suspend" target={w.id} label="Suspend" adminKey={adminKey} danger />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
