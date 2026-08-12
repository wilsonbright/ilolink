// The artifact half of /dashboard — one kind at a time.
//
// A server component on purpose. It needs no interactivity, so switching to an
// artifact kind ships LESS JavaScript than the Documents view, which mounts a
// DocumentRowActions island per row and fires a /api/counts request from each.
//
// Row treatment is deliberately the registry's (app/(app)/t/[id]/registry),
// reproduced rather than reinvented: the same artifact should not look like two
// different things one click apart.

import Link from "next/link";
import { KINDS, type ArtifactKind } from "@/lib/artifacts/kinds";
import { artifactHref } from "@/lib/teamspace/dashboard-kinds";

export interface ArtifactListItem {
  id: string;
  name: string;
  description: string;
  // Null when nothing is published yet — the only version so far is a proposal.
  version: number | null;
  updated_at: number;
  source_path: string | null;
  authorEmail: string | null;
}

function when(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ArtifactList({
  teamspaceId,
  kind,
  items,
  truncatedAt,
}: {
  teamspaceId: string;
  kind: ArtifactKind;
  items: ArtifactListItem[];
  // Set when the query hit its ceiling, so the page can say so rather than
  // silently showing a prefix.
  truncatedAt?: number;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-surface px-5 py-8">
        <p className="mb-2 text-ink">
          No {KINDS[kind].plural.toLowerCase()} yet.
        </p>
        {/* KINDS[kind].description exists to tell an agent when to reach for
            this kind. It reads correctly to a person too, and is the most
            useful thing an empty list can say. */}
        <p className="leading-relaxed text-ink-soft">
          {KINDS[kind].description}{" "}
          <Link href="/connect" className="text-accent underline">
            Connect an assistant
          </Link>{" "}
          to push them here.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul>
        {items.map((a) => {
          // Null means the detail page has nothing to render — getArtifact
          // returns null without a published version and the page 404s. So the
          // name is not a link, and the row's route in is the review inbox.
          const href = artifactHref(teamspaceId, kind, a.name, a.version != null);
          return (
            <li
              key={a.id}
              className="border-b border-hairline py-5 last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-4">
                {href ? (
                  <Link
                    href={href}
                    className="font-mono font-medium text-ink transition-colors duration-150 hover:text-accent"
                  >
                    {a.name}
                  </Link>
                ) : (
                  <span className="font-mono font-medium text-ink-soft">
                    {a.name}
                  </span>
                )}
                <span className="shrink-0 text-sm tabular-nums text-ink-faint">
                  {when(a.updated_at)}
                </span>
              </div>
              <p className="mt-1 leading-relaxed text-ink-soft">
                {a.description}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-faint">
                {/* "v?" would imply something readable exists. It does not. */}
                {a.version == null ? (
                  <Link
                    href={`/t/${teamspaceId}/proposals`}
                    className="text-accent transition-colors duration-150 hover:text-ink"
                  >
                    awaiting review
                  </Link>
                ) : (
                  <span>v{a.version}</span>
                )}
                {a.authorEmail && <span>{a.authorEmail}</span>}
                {a.source_path && (
                  <span className="font-mono">{a.source_path}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {/* listArtifacts clamps and truncates with no pagination anywhere. Saying
          so beats showing a prefix that looks like the whole set. */}
      {truncatedAt != null && items.length >= truncatedAt && (
        <p className="mt-4 text-sm text-ink-faint">
          Showing the first {truncatedAt}.{" "}
          <Link
            href={`/t/${teamspaceId}/registry?kind=${kind}`}
            className="text-accent underline"
          >
            Open the registry
          </Link>{" "}
          to see everything.
        </p>
      )}
    </>
  );
}
