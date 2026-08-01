// /oauth/authorize — the consent screen for an MCP client connecting to ilolink.
//
// The MCP worker validated the OAuth request and signed it over to us; we
// authenticate the human, let them choose which teamspace the assistant may
// publish into, and hand back a signed assertion. See mcp-worker/src/authorize.ts
// for the full four-step flow.
//
// The signature on `req` is checked BEFORE anything is rendered: without it,
// any site could drive this screen with an OAuth request we never validated and
// phish an approval for their own redirect_uri.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { ensurePersonalTeamspace, listTeamspacesForUser } from "@/lib/teamspace/store";
import { hmac, constantTimeEqual } from "@/lib/crypto/hmac";
import { env } from "@/lib/cf";
import { ApproveForm } from "./approve-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect an assistant — ilolink",
  robots: { index: false, follow: false },
};

function handoffSecret(): string {
  const s = (env() as unknown as { MCP_HANDOFF_SECRET?: string })
    .MCP_HANDOFF_SECRET;
  if (!s) throw new Error("MCP_HANDOFF_SECRET is not configured.");
  return s;
}

export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ req?: string; sig?: string; app?: string }>;
}) {
  const { req, sig, app } = await searchParams;

  if (!req || !sig || !constantTimeEqual(sig, await hmac(handoffSecret(), req))) {
    return (
      <div className="mx-auto max-w-sm py-8">
        <h1 className="mb-2 text-2xl font-medium text-ink">Connection request</h1>
        <p className="leading-relaxed text-ink-soft">
          This connection link isn&rsquo;t valid. Start again from your
          assistant&rsquo;s connector settings.
        </p>
      </div>
    );
  }

  const user = await currentUser();
  if (!user) {
    // Preserve the whole request across sign-in so approval resumes here.
    const back = `/oauth/authorize?req=${encodeURIComponent(req)}&sig=${encodeURIComponent(sig)}${
      app ? `&app=${encodeURIComponent(app)}` : ""
    }`;
    redirect(`/signin?next=${encodeURIComponent(back)}`);
  }

  await ensurePersonalTeamspace(user.id);
  const teamspaces = await listTeamspacesForUser(user.id);
  const appName = (app ?? "").trim().slice(0, 40) || "your AI assistant";

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="mb-2 text-2xl font-medium text-ink">
        Connect {appName} to ilolink
      </h1>
      <p className="mb-6 leading-relaxed text-ink-soft">
        Signed in as {user.email}.
      </p>

      <ul className="mb-6 space-y-2 text-ink-soft">
        <li>Publish documents to a shareable link, straight from your chat.</li>
        <li>Read views, scroll depth, and comments on those documents.</li>
        {/* Says "registry", not "skills": since the artifact migration this
            grant also reaches specs, plans, design docs and session handoffs.
            A consent screen that understates what it is granting is the one
            place in the product where vague copy is a real problem. */}
        <li>
          Read and write your teamspace&rsquo;s registry — skills, agents,
          specs, plans, workflows and handoffs.
        </li>
      </ul>

      <ApproveForm req={req} sig={sig} teamspaces={teamspaces.map((t) => ({
        id: t.id,
        name: t.name,
        isPersonal: t.is_personal === 1,
      }))} />

      <p className="mt-6 text-sm leading-relaxed text-ink-faint">
        The assistant acts as you inside the teamspace you choose. You can
        disconnect it at any time from your account.
      </p>
    </div>
  );
}
