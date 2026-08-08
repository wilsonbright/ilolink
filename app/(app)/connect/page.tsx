// /connect — wire an AI assistant to your ilolink teamspace.
//
// Two paths, and the order matters: OAuth first, because nothing long-lived is
// copied around by hand. Tokens are the fallback for clients that cannot do
// OAuth.
//
// This page used to mint an anonymous workspace on an UNAUTHENTICATED POST to
// /api/connect, whose id was then both the publishing credential and the
// dashboard key, embedded in a URL. That endpoint is gone.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import {
  ensurePersonalTeamspace,
  listTeamspacesForUser,
} from "@/lib/teamspace/store";
import { env } from "@/lib/cf";
import { TokenMinter } from "./token-minter";
import { CopyField } from "./copy-field";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect an assistant — ilolink",
  robots: { index: false, follow: false },
};

export default async function ConnectPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=%2Fconnect");

  // Ensure the personal one exists first so the picker is never empty for a
  // brand-new account.
  await ensurePersonalTeamspace(user.id);
  const teamspaces = await listTeamspacesForUser(user.id);
  const mcpOrigin =
    (env() as unknown as { MCP_ORIGIN?: string }).MCP_ORIGIN ??
    "https://mcp.ilolink.com";
  const connectorUrl = `${mcpOrigin}/mcp`;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-medium text-ink">Connect an assistant</h1>
      <p className="mb-10 leading-relaxed text-ink-soft">
        Let Claude, ChatGPT, or any MCP-capable assistant publish documents and
        use your teamspace&rsquo;s shared skills.
      </p>

      <section className="mb-10">
        <h2 className="mb-2 font-medium text-ink">
          Claude, and anything that supports OAuth
        </h2>
        <p className="mb-3 leading-relaxed text-ink-soft">
          Add a custom connector pointing at this URL:
        </p>
        {/* Deliberately NOT inline in the sentence. It used to read
            `<code>{connectorUrl}</code>.` — the full stop sat flush against the
            URL, someone selected it along with the address, and connecting to
            `/mcp.` cost them four attempts because OAuth succeeds and only the
            transport 404s. Give people a button instead of a selection task. */}
        <CopyField value={connectorUrl} label="the connector URL" />
        <p className="mt-3 leading-relaxed text-ink-soft">
          You&rsquo;ll be asked to approve it here and to choose which teamspace
          it may publish into. Nothing is copied by hand, and you can disconnect
          it at any time.
        </p>
        {/* The teamspace is sealed into the OAuth grant at approval time, so
            this is not a preference that can be changed later — it is chosen
            once and only re-chosen by connecting again. Saying so here is
            cheaper than the support question. */}
        <p className="leading-relaxed text-ink-soft">
          That choice is fixed for as long as the connection lasts. If you make
          a new teamspace later, connect the assistant again and pick the new
          one on the approval screen — an existing connection keeps writing to
          the teamspace it was approved for.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-2 font-medium text-ink">
          Assistants without OAuth support
        </h2>
        <p className="mb-4 leading-relaxed text-ink-soft">
          Create a connector token and give it to the assistant as an
          Authorization header.
        </p>
        <TokenMinter
          connectorUrl={connectorUrl}
          teamspaces={teamspaces.map((t) => ({ id: t.id, name: t.name }))}
        />
      </section>

      <p className="text-sm leading-relaxed text-ink-faint">
        Once connected, ask your assistant to publish something, or to list your
        team&rsquo;s skills.{" "}
        <Link href="/dashboard" className="text-accent underline">
          Your documents
        </Link>
      </p>
    </div>
  );
}
