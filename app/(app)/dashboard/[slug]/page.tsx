// Per-document detail. Phase 1 is intentionally thin: the URL, its visibility,
// how many versions exist, and a way back into the publish flow. The Phase 2+
// surfaces (analytics, heatmap, comments) are shown as disabled placeholders —
// never fake data — so the shape is legible without pretending it works yet.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getDocumentBySlug } from "@/lib/db/documents";
import { queryFirst } from "@/lib/db/client";
import type { Visibility } from "@/lib/types";

export const dynamic = "force-dynamic";

const VISIBILITY_LABEL: Record<Visibility, string> = {
  public: "Public",
  unlisted: "Unlisted",
  password: "Password",
  expiring: "Expiring",
};

const PHASE2_TABS = ["Analytics", "Heatmap", "Comments"] as const;

async function versionCount(docId: string): Promise<number> {
  const row = await queryFirst<{ n: number }>(
    "SELECT COUNT(*) AS n FROM document_versions WHERE document_id = ?",
    docId,
  );
  return row?.n ?? 0;
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const { slug } = await params;
  const doc = await getDocumentBySlug(slug);
  // Not found, or owned by someone else — same answer, no ownership leak.
  if (!doc || doc.owner_id !== user.id) notFound();

  const versions = await versionCount(doc.id);
  const viewUrl = `view.ilolink.com/${doc.slug}`;

  return (
    <section>
      <Link
        href="/dashboard"
        className="text-sm text-ink-faint transition-colors duration-150 hover:text-ink"
      >
        ← All documents
      </Link>

      <h1 className="mt-6 text-2xl font-semibold text-ink">
        {doc.title ?? "Untitled"}
      </h1>

      <dl className="mt-8 space-y-5">
        <div>
          <dt className="text-sm text-ink-faint">Current URL</dt>
          <dd className="mt-1">
            <a
              href={`https://${viewUrl}`}
              className="text-ink-soft transition-colors duration-150 hover:text-accent"
              target="_blank"
              rel="noopener noreferrer"
            >
              {viewUrl}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-faint">Visibility</dt>
          <dd className="mt-1 text-ink">{VISIBILITY_LABEL[doc.visibility]}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-faint">Versions</dt>
          <dd className="mt-1 text-ink">
            {versions} {versions === 1 ? "version" : "versions"}
          </dd>
        </div>
      </dl>

      <div className="mt-10">
        <Link
          href={`/publish?slug=${doc.slug}`}
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors duration-150"
        >
          Re-publish new version
        </Link>
      </div>

      <div className="mt-14 border-t border-hairline pt-8">
        <div className="flex flex-wrap gap-2">
          {PHASE2_TABS.map((tab) => (
            <span
              key={tab}
              aria-disabled="true"
              className="cursor-not-allowed rounded-md border border-hairline px-3 py-1.5 text-sm text-ink-faint"
            >
              {tab}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-faint">
          Analytics, heatmaps, and comments arrive in Phase 2.
        </p>
      </div>
    </section>
  );
}
