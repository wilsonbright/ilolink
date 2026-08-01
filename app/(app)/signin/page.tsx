// /signin — passwordless sign-in and sign-up in one screen.
//
// There is no separate /signup: in a passwordless product, proving control of
// an address IS the registration, so a second form would only ask the user to
// classify themselves for no benefit.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { safeRedirect } from "@/lib/auth/redirect";
import { SignInForm } from "./signin-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — ilolink",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirect(params.next);

  // Already signed in — skip the form rather than showing a dead screen.
  if (await currentUser()) redirect(next);

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-2 text-2xl font-medium text-ink">Sign in to ilolink</h1>
      <p className="mb-8 leading-relaxed text-ink-soft">
        Your documents, teamspaces, and skills — in one place.
      </p>
      <SignInForm next={next} initialError={params.e} />
    </div>
  );
}
