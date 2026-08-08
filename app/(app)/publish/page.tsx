import type { Metadata } from "next";
import Link from "next/link";
import { PublishForm } from "./publish-form";

export const metadata: Metadata = {
  title: "Publish — ilolink",
  description: "Paste Markdown or HTML, get a link, and see how it's read.",
};

// Publishing requires a session (/api/publish returns 401 without one) and the
// document is owned by a teamspace. Pre-accounts docs still carry the per-doc
// manage token the browser keeps, not by a signed-in session.
export default function PublishPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-6 py-16 sm:py-24">
      <Link
        href="/"
        className="text-sm font-medium tracking-wide text-accent transition-colors duration-150 hover:text-ink"
      >
        ilolink
      </Link>

      <div className="mt-12">
        <h1 className="text-3xl font-semibold leading-tight text-ink">
          Publish a document
        </h1>
        {/* Said "No account needed" until 2026-08-08 — left over from the
            accountless era and contradicted by the comment above this
            component: /api/publish returns 401 without a session. Readers
            still need no account, and that is the half worth saying. */}
        <p className="mt-3 max-w-prose leading-relaxed text-ink-soft">
          Paste your Markdown or HTML, or drop a file. You get a link, and you
          can see how people actually read it. Anyone can open it &mdash; no
          account needed to read.
        </p>
        <PublishForm />
      </div>
    </main>
  );
}
