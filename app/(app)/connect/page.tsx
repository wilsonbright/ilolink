"use client";

// Connect ilolink to Claude (and, once Phase 2 lands, ChatGPT). No official
// public "add connector by URL" deep link exists for Claude custom connectors,
// so we give the honest manual-add path plus the one server URL everyone uses.
import { useState } from "react";

const SERVER_URL = "https://mcp.ilolink.com/mcp";

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-3">
      <code className="min-w-0 flex-1 truncate rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink">
        {value}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(
            () => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            },
            () => {},
          );
        }}
        className="shrink-0 text-sm text-accent transition-colors duration-150 hover:text-ink"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <section className="max-w-prose">
      <h1 className="text-2xl font-semibold text-ink">Connect ilolink to your AI</h1>
      <p className="mt-3 text-ink-soft">
        Publish to ilolink from inside your chat — Claude, Grok, ChatGPT, and other
        MCP-compatible assistants. No account; a private workspace is created for you
        on first connect.
      </p>

      <h2 className="mt-10 text-lg font-medium text-ink">
        Claude, Grok &amp; other MCP assistants
      </h2>
      <p className="mt-2 text-ink-soft">
        Any assistant that supports remote MCP connectors with OAuth (Claude, Grok,
        and others) uses the same URL. Add it as a custom connector — name it{" "}
        <span className="text-ink">ilolink</span> — and paste:
      </p>
      <CopyRow value={SERVER_URL} />
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-soft">
        <li>
          Open your assistant&rsquo;s connectors settings (e.g.{" "}
          <span className="text-ink">Settings → Connectors → Add custom connector</span> in
          Claude, or <span className="text-ink">Skills &amp; Connectors</span> in Grok),
          then <span className="text-ink">Add</span> / <span className="text-ink">Connect</span>.
        </li>
        <li>
          On the ilolink screen, click <span className="text-ink">Authorize</span> —
          that creates your private, anonymous workspace. No password.
        </li>
        <li>Turn <span className="text-ink">ilolink</span> on for a conversation.</li>
        <li>
          Say: <em>&ldquo;Publish this as an ilolink page and give me the link.&rdquo;</em>{" "}
          You get a share URL plus your private dashboard link.
        </li>
      </ol>
      <p className="mt-4 text-sm text-ink-faint">
        Your dashboard link needs no login — the link is the key. Ask{" "}
        <em>&ldquo;what&rsquo;s my ilolink dashboard link?&rdquo;</em> anytime, and keep it private.
      </p>

      <h2 className="mt-10 text-lg font-medium text-ink">ChatGPT</h2>
      <p className="mt-2 text-ink-soft">
        ChatGPT needs <span className="text-ink">Developer Mode</span> (Plus, Pro,
        Business, or Enterprise). Create a workspace, then add its connector URL as
        a custom connector with <span className="text-ink">no authentication</span>.
      </p>
      <ChatGptConnect />
    </section>
  );
}

interface Minted {
  connector_url: string;
  dashboard_url: string;
}

function ChatGptConnect() {
  const [minted, setMinted] = useState<Minted | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mint() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/connect", { method: "POST" });
      const data = (await res.json()) as Minted & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create a workspace.");
      setMinted({ connector_url: data.connector_url, dashboard_url: data.dashboard_url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!minted) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={mint}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-ink disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create my ChatGPT workspace"}
        </button>
        {error ? <p className="mt-2 text-sm text-[#b3261e]">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-ink">Connector URL (paste into ChatGPT)</p>
        <CopyRow value={minted.connector_url} />
        <p className="mt-1 text-sm text-[#b3261e] dark:text-[#f2827a]">
          Treat this like a password — anyone with it can publish to your workspace.
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-ink">Your private dashboard</p>
        <CopyRow value={minted.dashboard_url} />
        <p className="mt-1 text-sm text-ink-faint">Bookmark it. No login — the link is the key.</p>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-ink-soft">
        <li>In ChatGPT, enable <span className="text-ink">Developer Mode</span> (Settings).</li>
        <li>
          Add a custom connector, paste the connector URL, choose{" "}
          <span className="text-ink">No authentication</span>.
        </li>
        <li>Enable it for a chat, then: <em>&ldquo;Use ilolink to publish this as a page.&rdquo;</em></li>
      </ol>
    </div>
  );
}
