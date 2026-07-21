// Sign-in entry. The page shell is server-rendered so it can read ?error=
// (e.g. an expired or spent magic link redirects here) and show a quiet notice;
// the email field itself lives in the client SignInForm.
import Link from "next/link";
import type { Metadata } from "next";
import { SignInForm } from "./signin-form";

export const metadata: Metadata = {
  title: "Sign in — ilolink",
};

const ERROR_COPY: Record<string, string> = {
  expired: "That link expired or was already used. Enter your email for a fresh one.",
  invalid: "That link didn't work. Enter your email and we'll send a new one.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const notice = error ? (ERROR_COPY[error] ?? ERROR_COPY.invalid) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-24">
      <Link
        href="/"
        className="text-sm font-medium tracking-wide text-accent transition-opacity duration-150 hover:opacity-80"
      >
        ilolink
      </Link>

      <h1 className="mt-6 text-2xl font-semibold leading-tight text-ink">
        Sign in
      </h1>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Sign in to publish a document and see how it landed.
      </p>

      {notice && (
        <p className="mt-6 rounded-md bg-accent-soft px-4 py-3 text-sm text-ink-soft">
          {notice}
        </p>
      )}

      <SignInForm />
    </main>
  );
}
