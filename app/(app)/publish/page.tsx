import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth/current-user";
import { PublishForm } from "./publish-form";

export const metadata: Metadata = {
  title: "Publish — ilolink",
  description: "Paste Markdown or HTML, get a link, and see how it's read.",
};

export default async function PublishPage() {
  const user = await currentUser();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-6 py-16 sm:py-24">
      <Link
        href="/"
        className="text-sm font-medium tracking-wide text-accent transition-colors duration-150 hover:text-ink"
      >
        ilolink
      </Link>

      {user ? (
        <div className="mt-12">
          <h1 className="text-3xl font-semibold leading-tight text-ink">
            Publish a document
          </h1>
          <p className="mt-3 max-w-prose leading-relaxed text-ink-soft">
            Paste your Markdown or HTML, or drop a file. You get a link, and you
            can see how people actually read it.
          </p>
          <PublishForm />
        </div>
      ) : (
        <SignInPrompt />
      )}
    </main>
  );
}

// Not signed in: a calm nudge, not a wall. Visitors never publish.
function SignInPrompt() {
  return (
    <div className="mt-16 max-w-prose">
      <h1 className="text-3xl font-semibold leading-tight text-ink">
        Sign in to publish
      </h1>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Publishing needs an account so your documents stay yours. It takes one
        email — no password to remember.
      </p>
      <Link
        href="/signin?next=/publish"
        className="mt-8 inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-canvas transition-colors duration-150 hover:opacity-90"
      >
        Sign in with email
      </Link>
    </div>
  );
}
