// Org analytics for the teamspace page: which assistants are connected, what
// they have been doing, and the memory built up as documents land here. All of
// it derives from migration 0017 (mcp_audit, org_memory) plus the api_tokens
// inventory.
//
// MEMBERS-ONLY BY PLACEMENT: this renders only after the page's membership
// gate, and every query keys on the teamspace id that gate verified. It must
// never be rendered from a route that has not run that gate.

import Link from "next/link";
import { env } from "@/lib/cf";
import { TAG_ACCENT, TAG_NEUTRAL } from "@/lib/ui/tags";
import {
  activeApiTokens,
  assistantActivity,
  connectedAssistants,
  orgMemoryEntries,
} from "@/lib/org/store";

// The uppercase micro-label idiom, used as the section's counter caption.
const MICRO_LABEL =
  "shrink-0 text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink-faint";

// Relative time for the activity column. Coarse on purpose — the audit log is
// for "who did what lately", not forensics; exact stamps live in D1.
function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return when(ts);
}

function when(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function OrgAnalytics({ teamspaceId }: { teamspaceId: string }) {
  const e = env() as unknown as { DB: D1Database };
  const [assistants, activity, memory, tokens] = await Promise.all([
    connectedAssistants(e.DB, teamspaceId),
    assistantActivity(e.DB, teamspaceId, 30),
    orgMemoryEntries(e.DB, teamspaceId, 15),
    activeApiTokens(e.DB, teamspaceId),
  ]);

  return (
    <>
      <section className="mt-12 border-t-2 border-divider pt-8">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="text-ink">Connected assistants</h2>
          <span className={MICRO_LABEL}>Last 30 days</span>
        </div>
        {assistants.length === 0 ? (
          <p className="leading-relaxed text-ink-soft">
            No assistant has used this teamspace in the last 30 days.{" "}
            <Link href="/connect" className="text-accent-strong underline">
              Connect an assistant
            </Link>
          </p>
        ) : (
          <>
            <p className="leading-relaxed text-ink-soft">
              {assistants.length}{" "}
              {assistants.length === 1 ? "assistant" : "assistants"} active in
              the last 30 days.
            </p>
            <ul className="mt-4">
              {assistants.map((a, i) => (
                <li
                  key={`${a.client ?? ""}:${a.user_id ?? ""}:${i}`}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t-2 border-divider py-3"
                >
                  <span className="font-extrabold text-ink">
                    {a.client ?? "oauth"}
                  </span>
                  {a.email && (
                    <span className="text-sm text-ink-soft">{a.email}</span>
                  )}
                  <span className="text-sm tabular-nums text-ink-faint">
                    {ago(a.last_at)}
                  </span>
                  <span className="ml-auto text-sm tabular-nums text-ink-faint">
                    {a.reads} {a.reads === 1 ? "read" : "reads"} &middot;{" "}
                    {a.writes} {a.writes === 1 ? "write" : "writes"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        {/* The standing inventory next to the derived view: a token that has
            never made a call is still a connection someone holds. */}
        {tokens.length > 0 && (
          <div className="mt-6">
            <p className={`mb-1 ${MICRO_LABEL}`}>Connector tokens</p>
            <ul>
              {tokens.map((t, i) => (
                <li
                  key={`${t.name ?? ""}:${t.created_at}:${i}`}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t-2 border-divider py-3"
                >
                  <span className="font-extrabold text-ink">
                    {t.name ?? "Unnamed token"}
                  </span>
                  {t.email && (
                    <span className="text-sm text-ink-soft">{t.email}</span>
                  )}
                  <span className="ml-auto text-sm tabular-nums text-ink-faint">
                    {t.last_used_at
                      ? `last used ${ago(t.last_used_at)}`
                      : "never used"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-12 border-t-2 border-divider pt-8">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="text-ink">Assistant activity</h2>
          {/* No counter beside an empty state — "Latest 0" beside "Nothing
              yet" reads like a bug. */}
          {activity.length > 0 && (
            <span className={MICRO_LABEL}>Latest {activity.length}</span>
          )}
        </div>
        {activity.length === 0 ? (
          <p className="leading-relaxed text-ink-soft">
            Nothing yet. Calls appear here the moment a connected assistant
            makes one.
          </p>
        ) : (
          <ul>
            {activity.map((r, i) => (
              <li
                key={`${r.created_at}:${r.tool}:${i}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t-2 border-divider py-2.5 text-sm"
              >
                <span className="w-[76px] shrink-0 tabular-nums text-ink-faint">
                  {ago(r.created_at)}
                </span>
                <span className="text-ink-soft">{r.email ?? "unknown"}</span>
                {r.client && <span className="text-ink-faint">{r.client}</span>}
                <span className="font-mono text-[13px] text-ink">{r.tool}</span>
                <span className={r.action === "write" ? TAG_ACCENT : TAG_NEUTRAL}>
                  {r.action}
                </span>
                {r.target && (
                  <span className="font-mono text-[13px] text-ink-faint">
                    {r.target}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 border-t-2 border-divider pt-8">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="text-ink">Org memory</h2>
          {memory.length > 0 && (
            <span className={MICRO_LABEL}>Latest {memory.length}</span>
          )}
        </div>
        <p className="leading-relaxed text-ink-soft">
          Built automatically as documents are published into this teamspace.
        </p>
        {memory.length > 0 && (
          <ul className="mt-4">
            {memory.map((m, i) => (
              <li
                key={`${m.created_at}:${i}`}
                className="border-t-2 border-divider py-4"
              >
                {/* A null slug means the document has been unpublished; the
                    memory row survives it (0017), so the title stays, unlinked.
                    Private docs route through the members-only mint. */}
                {m.slug ? (
                  <Link
                    href={
                      m.visibility === "private"
                        ? `/private/${m.slug}`
                        : `/${m.slug}`
                    }
                    className="font-extrabold text-ink transition-colors duration-150 hover:text-accent"
                  >
                    {m.title ?? "Untitled"}
                  </Link>
                ) : (
                  <span className="font-extrabold text-ink-soft">
                    {m.title ?? "Untitled"}
                  </span>
                )}
                {m.excerpt && (
                  <p className="mt-1 leading-relaxed text-ink-soft">
                    {m.excerpt}
                  </p>
                )}
                <p className="mt-1 text-sm text-ink-faint">
                  {m.kind && <>{m.kind} &middot; </>}
                  {m.email && <>{m.email} &middot; </>}
                  {when(m.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
