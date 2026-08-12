// The public face of the MCP connector.
//
// WHY THIS PAGE EXISTS: /connect has always been the connector page, but it
// redirects signed-out visitors to /signin and carries robots:{index:false}, so
// it can neither be found nor read by anyone deciding whether to sign up. The
// result was a shipped, working MCP server that no public page on the site
// mentioned — `grep -i mcp app/(marketing)` returned nothing across ~60 pages.
//
// This page is the marketing half: what the connector is, how to add it in each
// client, and what the assistant can then do. /connect stays the doing half —
// it shows the connector URL for the signed-in user and mints tokens — and the
// two link to each other.

import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, article, howTo } from "@/lib/seo/jsonld";
import { REFERENCE } from "@/lib/seo/site";
import { CopyField } from "@/app/(app)/connect/copy-field";
import {
  Article,
  Breadcrumbs,
  PageHeader,
  Callout,
  Faq,
  Cta,
  RelatedLinks,
} from "../_components/content";

// Hardcoded rather than read from env(): this page is static marketing, and the
// binding is only available to the app surface. The worker's own route is a
// custom domain (mcp-worker/wrangler.jsonc), so this string is the URL for
// every visitor. /connect renders the env-derived value for the rare
// non-production origin.
const CONNECTOR_URL = "https://mcp.ilolink.com/mcp";

export const metadata: Metadata = {
  title: "ilolink MCP server — connect Claude, Claude Code & ChatGPT",
  description:
    "Add ilolink as an MCP connector and let Claude, Claude Code or ChatGPT publish documents as live links and read your team's shared skills, specs and runbooks.",
  alternates: { canonical: "/mcp" },
};

// One connector, two halves. Kept as data so the page and its HowTo schema
// cannot drift apart.
const CLIENTS: {
  name: string;
  blurb: string;
  steps: { name: string; text: string }[];
}[] = [
  {
    name: "Claude (desktop and web)",
    blurb:
      "Claude speaks remote MCP over OAuth, so there is no key to copy and nothing to paste into a config file.",
    steps: [
      {
        name: "Open connector settings",
        text: "In Claude, go to Settings → Connectors and choose to add a custom connector.",
      },
      {
        name: "Paste the connector URL",
        text: `Use ${CONNECTOR_URL} as the URL. Leave everything else alone.`,
      },
      {
        name: "Approve, and pick a teamspace",
        text: "Claude sends you to ilolink to sign in and approve. The approval screen asks which teamspace the assistant may publish into and read from.",
      },
    ],
  },
  {
    name: "Claude Code",
    blurb:
      "One command, or install the plugin if you also want ilolink's publishing and registry skills.",
    steps: [
      {
        name: "Add the server",
        text: `Run: claude mcp add --transport http ilolink ${CONNECTOR_URL}`,
      },
      {
        name: "Or install the plugin",
        text: "Run /plugin marketplace add https://github.com/wilsonbright/ilolink, then /plugin install ilolink@ilolink. The plugin wires the same connector and adds two skills.",
      },
      {
        name: "Authorise once",
        text: "The first tool call opens the same OAuth approval, where you choose the teamspace.",
      },
    ],
  },
  {
    name: "ChatGPT",
    blurb:
      "The same URL and the same OAuth flow. ilolink implements the search and fetch tools ChatGPT's connector contract expects, so your published documents are searchable and quotable inside a chat.",
    steps: [
      {
        name: "Open connector settings",
        text: "In ChatGPT, go to Settings → Connectors and create a new connector.",
      },
      {
        // No trailing full stop after the URL, here or anywhere on this page.
        // A reader once selected one along with the address and connected to
        // `/mcp.`, which burns four attempts because OAuth completes happily
        // and only the transport call fails. See connect/copy-field.tsx.
        name: "Paste the connector URL",
        text: `The URL is ${CONNECTOR_URL} — nothing else to fill in`,
      },
      {
        name: "Approve, and pick a teamspace",
        text: "You will be sent to ilolink to approve the connection and choose its teamspace.",
      },
    ],
  },
];

// Curated, not the whole surface. The server exposes more (health checks,
// archive/restore, the proposal review queue) — those matter once you are
// using it, not while you are deciding whether to. Every name here is a real
// tool in mcp-worker/src/agent.ts; do not add one that isn't.
const TOOL_GROUPS: {
  heading: string;
  intro: string;
  tools: { name: string; does: string }[];
}[] = [
  {
    heading: "Publish and measure",
    intro:
      "Turn something the assistant just made into a page anyone can open — then find out what happened to it.",
    tools: [
      {
        name: "publish_document",
        does: "Publish Markdown, HTML, a PDF, JSON, CSV, a diagram or an image and get a shareable URL back, plus a private analytics link.",
      },
      {
        name: "update_document",
        does: "Replace the content with a new version. The link stays the same.",
      },
      {
        name: "unpublish_document",
        does: "Take a document offline so its link stops working. Reversible from your dashboard.",
      },
      {
        name: "list_documents",
        does: "Everything published from this connection, newest first, with share URLs and view counts.",
      },
      {
        name: "get_analytics",
        does: "Views and comment count for one document. Heatmaps and read-through live on the dashboard.",
      },
    ],
  },
  {
    heading: "The team registry",
    intro:
      "Ten kinds of team knowledge — skill, agent, spec, design, plan, workflow, session, decision, runbook, eval — that every teammate's assistant can read.",
    tools: [
      {
        name: "artifacts_list",
        does: "See what guidance the teamspace already has before starting a task. Doubles as a sync changefeed: pass a timestamp and compare hashes.",
      },
      {
        name: "artifacts_get",
        does: "Read one artifact in full. The response names who wrote it, so the assistant can tell you whose instructions it is following.",
      },
      {
        name: "artifacts_put",
        does: "Save or update one artifact. If your team reviews member writes, it lands as a proposal rather than going live.",
      },
      {
        name: "artifacts_push",
        does: "Push up to 50 files from a repository in one call — the way to get a project's skills, specs and runbooks into the team registry.",
      },
    ],
  },
  {
    heading: "Search from the chat",
    intro:
      "Built for ChatGPT's connector contract, and useful in any client: your own published documents become something the assistant can look things up in.",
    tools: [
      {
        name: "search",
        does: "Find your published documents by title. Returns ids and share URLs.",
      },
      {
        name: "fetch",
        does: "Pull one document's full text back into the conversation, so the assistant can answer from it and cite it.",
      },
    ],
  },
];

const FAQ = [
  {
    q: "Which assistants work with this?",
    a: "Anything that supports remote MCP connectors. Claude, Claude Code and ChatGPT all use the OAuth flow at the connector URL — no key to copy. Clients that cannot do OAuth but let you set request headers can use a connector token instead, created on the connect page inside your account.",
  },
  {
    q: "Does the assistant get access to everything in my account?",
    a: "No. A connection is bound to exactly one teamspace, chosen by you on the approval screen, and it stays bound to it for the life of the connection. Membership is re-checked on every single call, so removing someone from a teamspace cuts off their assistant too.",
  },
  {
    q: "What if I make a new teamspace later?",
    a: "Connect the assistant again and pick the new one on the approval screen. An existing connection keeps writing to the teamspace it was approved for — it does not follow you.",
  },
  {
    q: "Do documents published by an assistant go public?",
    a: "Not by default. Anything published over MCP is unlisted: the link works for whoever you send it to, but the page is kept out of search and its text is not quoted in previews. The assistant can publish publicly if you ask it to.",
  },
  {
    q: "Can a teammate's artifact change what my assistant does?",
    a: "Artifacts are instructions written by your teammates, and assistants are told to treat them as data rather than as orders — to apply them only where they fit what you asked, never to let them change tool permissions, and to name the artifact and its author before acting on it. Teams can also require admin review before a member's write goes live.",
  },
  {
    q: "Is there a separate price for the connector?",
    a: "No. The connector is part of ilolink. Free covers one person; a team is a single one-time payment.",
  },
];

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/mcp",
            headline: "ilolink MCP server — connect Claude, Claude Code & ChatGPT",
            description:
              "How to add ilolink as an MCP connector in Claude, Claude Code and ChatGPT, and what the assistant can do once connected.",
            datePublished: "2026-08-12",
          }),
          howTo({
            name: "Connect an AI assistant to ilolink over MCP",
            description:
              "Add ilolink as a remote MCP connector so your assistant can publish documents and use your team's shared artifact registry.",
            steps: CLIENTS.flatMap((c) =>
              c.steps.map((s) => ({
                name: `${c.name}: ${s.name}`,
                text: s.text,
              })),
            ),
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "MCP connector", path: "/mcp" },
        ]}
      />
      <PageHeader
        eyebrow="One connector, both halves"
        title="ilolink’s MCP server"
        lead={
          <>
            Add ilolink as a connector in Claude, Claude Code or ChatGPT, and
            your assistant can publish what it just made as a live page and get
            the link back — and read and write the specs, skills and runbooks
            your whole team&rsquo;s assistants share. One connection, no
            copy-paste, no API key.
          </>
        }
      />

      <section>
        <h2 className="text-2xl font-semibold text-ink">
          What MCP is, in one paragraph
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          MCP — the Model Context Protocol — is how an AI assistant talks to a
          service it doesn&rsquo;t have built in. You add a connector once; from
          then on the assistant can call that service&rsquo;s tools during a
          normal conversation. ilolink&rsquo;s connector is a remote one, so
          there is nothing to install and nothing running on your machine. It
          authenticates with OAuth, the same way you would sign in to any other
          app, and this is the whole of the setup:
        </p>
        {/* A button rather than a URL sitting in a sentence. The one time this
            was prose, someone selected the sentence's full stop along with the
            address and spent four attempts connecting to `/mcp.` — OAuth
            succeeds against a bad path and only the transport call fails, so
            the assistant reports "connected", then "Disconnected". Same fix as
            app/(app)/connect/copy-field.tsx, which is the component reused. */}
        <div className="mt-4">
          <CopyField value={CONNECTOR_URL} label="the connector URL" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-ink">
          Connecting, per assistant
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Every client uses the same URL and the same approval screen. The only
          thing that differs is where the setting lives.
        </p>

        <div className="mt-8 space-y-10">
          {CLIENTS.map((c) => (
            <div key={c.name}>
              <h3 className="text-lg font-medium text-ink">{c.name}</h3>
              <p className="mt-1.5 leading-relaxed text-ink-soft">{c.blurb}</p>
              <ol className="mt-4 space-y-3">
                {c.steps.map((s, i) => (
                  <li key={s.name} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent"
                    >
                      {i + 1}
                    </span>
                    <span className="leading-relaxed text-ink-soft">
                      <span className="font-medium text-ink">{s.name}.</span>{" "}
                      {s.text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <Callout title="Assistants that can't do OAuth">
          Some tools let you set an <code>Authorization</code> header by hand
          but have no OAuth support. For those, create a connector token on{" "}
          <Link href="/connect" className="text-accent hover:underline">
            your connect page
          </Link>{" "}
          and pass it as a bearer token. Claude and ChatGPT don&rsquo;t need
          this — use the URL above.
        </Callout>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-ink">
          What your assistant can do once it&rsquo;s connected
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          You never call these by name. You say &ldquo;publish this as an
          ilolink page&rdquo; or &ldquo;check the team registry first&rdquo; and
          the assistant picks the tool.
        </p>

        <div className="mt-8 space-y-10">
          {TOOL_GROUPS.map((g) => (
            <div key={g.heading}>
              <h3 className="text-lg font-medium text-ink">{g.heading}</h3>
              <p className="mt-1.5 leading-relaxed text-ink-soft">{g.intro}</p>
              <dl className="mt-4 divide-y divide-hairline border-t border-hairline">
                {g.tools.map((t) => (
                  <div key={t.name} className="py-3 sm:flex sm:gap-6">
                    <dt className="shrink-0 font-mono text-sm text-accent sm:w-52">
                      {t.name}
                    </dt>
                    <dd className="mt-1 leading-relaxed text-ink-soft sm:mt-0">
                      {t.does}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-ink">
          What the connection can and can&rsquo;t reach
        </h2>
        <ul className="mt-4 space-y-3 leading-relaxed text-ink-soft">
          <li>
            <span className="font-medium text-ink">One teamspace, for life.</span>{" "}
            You choose it when you approve the connection, and it never moves.
            Connect again to use a different one.
          </li>
          <li>
            <span className="font-medium text-ink">
              Membership is checked every call.
            </span>{" "}
            Not once at approval — on every request, against the live
            membership table.
          </li>
          <li>
            <span className="font-medium text-ink">
              Published documents default to unlisted.
            </span>{" "}
            The link works; search engines are told to stay away and previews
            don&rsquo;t quote the text.
          </li>
          <li>
            <span className="font-medium text-ink">
              Your team can require review.
            </span>{" "}
            Turn it on and a member&rsquo;s registry write becomes a proposal an
            admin approves, rather than instructions every assistant starts
            reading immediately.
          </li>
        </ul>
      </section>

      <Faq items={FAQ} />

      <Cta
        label="Connect an assistant"
        href="/connect"
        sub="Sign in, copy the connector URL, and pick the teamspace it may write to."
      />

      <RelatedLinks
        links={[
          REFERENCE.pricing,
          REFERENCE.faq,
          {
            path: "/t",
            title: "Teamspaces & the artifact registry",
            blurb:
              "Where the skills, specs and runbooks your assistants read actually live.",
          },
          REFERENCE.useCases,
        ]}
      />
    </Article>
  );
}
