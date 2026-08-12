// /signin — passwordless sign-in and sign-up in one screen.
//
// There is no separate /signup: in a passwordless product, proving control of
// an address IS the registration, so a second form would only ask the user to
// classify themselves for no benefit.
//
// Entry points that mean "I have never used this" — the landing page's Get
// started and Start free — pass ?new=1. A first-time visitor who clicked Get
// started and landed on a screen headed "Sign in to ilolink" reasonably asked
// why they were signing in to something they had not created yet. The param
// picks the heading and subcopy only; the form, the code, and the flow behind
// it are identical either way.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { safeRedirect } from "@/lib/auth/redirect";
import { SignInForm } from "./signin-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The tab title is the third place this route says "Sign in", so it follows the
// same split rather than contradicting the heading a new visitor is reading.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return {
    title:
      params.new === "1"
        ? "Create your account — ilolink"
        : "Sign in — ilolink",
    robots: { index: false, follow: false },
  };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; e?: string; new?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirect(params.next);
  const isNew = params.new === "1";

  // Already signed in — skip the form rather than showing a dead screen.
  if (await currentUser()) redirect(next);

  return (
    <div className="mx-auto max-w-sm py-8">
      <p className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-accent-strong">
        Account
      </p>
      <h1 className="mb-2 text-2xl text-ink">
        {isNew ? "Create your ilolink account" : "Sign in to ilolink"}
      </h1>
      <p className="mb-8 leading-relaxed text-ink-soft">
        {isNew ? (
          <>
            There is no separate signup: the code we email you creates your
            account the first time, and signs you in every time after. People
            who read what you publish never need an account of their own.
          </>
        ) : (
          <>Your documents, teamspaces, and skills — in one place.</>
        )}
      </p>
      <div className="border-2 border-divider p-5">
        <SignInForm next={next} initialError={params.e} />
      </div>
    </div>
  );
}
