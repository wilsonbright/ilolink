// Creator dashboard: the quiet list of a signed-in creator's documents.
// No charts, no counts — analytics is Phase 2. Just what you published and where.
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { listDocumentsByOwner } from "@/lib/db/documents";
import type { DocumentRow, Visibility } from "@/lib/types";

export const dynamic = "force-dynamic";

const VISIBILITY_LABEL: Record<Visibility, string> = {
  public: "Public",
  unlisted: "Unlisted",
  password: "Password",
  expiring: "Expiring",
};

function formatDate(ms: number | null): string {
  if (!ms) return "Not published";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(ms);
}

function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
      {VISIBILITY_LABEL[visibility]}
    </span>
  );
}

function DocCard({ doc }: { doc: DocumentRow }) {
  const viewUrl = `view.ilolink.com/${doc.slug}`;
  return (
    <li className="border-b border-hairline py-6 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/dashboard/${doc.slug}`}
            className="text-lg font-medium text-ink transition-colors duration-150 hover:text-accent"
          >
            {doc.title ?? "Untitled"}
          </Link>
          <p className="mt-1 text-sm text-ink-faint">
            Published {formatDate(doc.published_at)}
          </p>
        </div>
        <VisibilityBadge visibility={doc.visibility} />
      </div>
      <a
        href={`https://${viewUrl}`}
        className="mt-3 inline-block text-sm text-ink-soft transition-colors duration-150 hover:text-accent"
        target="_blank"
        rel="noopener noreferrer"
      >
        {viewUrl}
      </a>
    </li>
  );
}

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const docs = await listDocumentsByOwner(user.id);

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-ink">Your documents</h1>
        <Link
          href="/publish"
          className="text-sm text-accent transition-colors duration-150"
        >
          Publish
        </Link>
      </div>

      {docs.length === 0 ? (
        <p className="mt-10 text-ink-soft">
          Nothing published yet.{" "}
          <Link href="/publish" className="text-accent underline-offset-2 hover:underline">
            Publish your first document
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6">
          {docs.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </ul>
      )}
    </section>
  );
}
