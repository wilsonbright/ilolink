// /welcome — the first screen after sign-up.
//
// A real user's feedback: after signing up they landed on /t (Teamspaces), a
// page about inviting coworkers and "what is a teamspace", and had no idea what
// to DO. That is the wrong first screen for a solo new user — the product's
// value (a shareable link with analytics; a registry your assistant reads) is
// nowhere on it, and the primary button makes ANOTHER teamspace.
//
// This screen does one job: give a brand-new user a single obvious first action
// toward value. Publish is the primary path because it is the fastest tangible
// payoff (paste something, get a link, watch it get read) and needs nothing but
// the browser they are already in. Connecting an assistant is the second path.
//
// It is strictly a FIRST-RUN screen: the moment a user has published a document
// or pushed anything to the registry, they have activated, and landing here
// again would be a dead end — so an activated user is bounced straight to their
// dashboard.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { listTeamspacesWithCounts } from "@/lib/teamspace/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome — ilolink",
  robots: { index: false, follow: false },
};

export default async function WelcomePage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=%2Fwelcome&new=1");

  // Activated = has ever published a document or put anything in the registry.
  // Such a user has already seen the product work; send them to the dashboard
  // rather than a welcome mat they have outgrown.
  const teamspaces = await listTeamspacesWithCounts(user.id);
  const activated = teamspaces.some(
    (t) => t.document_count > 0 || t.skill_count > 0,
  );
  if (activated) redirect("/dashboard");

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <p className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-accent-strong">
        Welcome to ilolink
      </p>
      <h1 className="-ml-[0.058em] text-[clamp(30px,3.6vw,44px)] leading-[1.05] text-ink">
        You&rsquo;re in. Here&rsquo;s the fastest way to see it work.
      </h1>
      <p className="mt-4 max-w-[54ch] text-[15.5px] leading-[26px] text-ink-soft">
        Publish anything you&rsquo;ve got — a doc an AI wrote, notes, a spec — and
        get a real link anyone can open, with private analytics on how it&rsquo;s
        read. That&rsquo;s the whole loop, and it takes about a minute.
      </p>

      {/* Primary path — the loud one. */}
      <Link
        href="/publish"
        className="mt-9 block border-2 border-accent bg-accent-wash p-6 transition-colors duration-150 hover:bg-accent-soft/50"
      >
        <p className="text-lg font-extrabold text-ink">
          Publish your first document &rarr;
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Paste Markdown or HTML, pick who can see it, and you get a shareable
          link back immediately. Come back here any time to watch the views,
          scroll depth and reactions land.
        </p>
      </Link>

      {/* Secondary path — the registry wedge, for people who came for that. */}
      <Link
        href="/connect"
        className="mt-4 block border-2 border-divider p-6 transition-colors duration-150 hover:bg-ink/5"
      >
        <p className="text-lg font-extrabold text-ink">
          Connect your AI assistant &rarr;
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Add ilolink to Claude, Claude Code or ChatGPT so it can publish for you
          and read your team&rsquo;s shared skills, specs and runbooks.
        </p>
      </Link>

      <p className="mt-8 text-sm text-ink-faint">
        Rather look around first?{" "}
        <Link
          href="/dashboard"
          className="text-accent-strong transition-colors duration-150 hover:text-ink"
        >
          Go to your dashboard
        </Link>
        .
      </p>
    </div>
  );
}
