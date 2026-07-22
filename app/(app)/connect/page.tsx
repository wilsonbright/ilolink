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
        Publish to ilolink from inside your chat — no account. A private workspace
        is created for you on first connect.
      </p>

      <h2 className="mt-10 text-lg font-medium text-ink">Claude</h2>
      <p className="mt-2 text-ink-soft">
        In Claude, open <span className="text-ink">Settings → Connectors</span> →{" "}
        <span className="text-ink">Add custom connector</span>, name it{" "}
        <span className="text-ink">ilolink</span>, and paste this URL:
      </p>
      <CopyRow value={SERVER_URL} />
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-soft">
        <li>Click <span className="text-ink">Add</span>, then <span className="text-ink">Connect</span>.</li>
        <li>
          On the ilolink screen, click <span className="text-ink">Authorize</span> —
          that creates your private, anonymous workspace. No password.
        </li>
        <li>
          In any chat, open <span className="text-ink">+ → Connectors</span> and turn{" "}
          <span className="text-ink">ilolink</span> on for that conversation.
        </li>
        <li>
          Say: <em>&ldquo;Publish this as an ilolink page and give me the link.&rdquo;</em>{" "}
          Claude returns your share URL plus your private dashboard link.
        </li>
      </ol>
      <p className="mt-4 text-sm text-ink-faint">
        Your dashboard link needs no login — the link is the key. Ask Claude{" "}
        <em>&ldquo;what&rsquo;s my ilolink dashboard link?&rdquo;</em> anytime, and keep it private.
      </p>

      <h2 className="mt-10 text-lg font-medium text-ink">ChatGPT</h2>
      <p className="mt-2 text-ink-soft">
        A tokenized connector URL for ChatGPT Developer Mode is coming next. For
        now, use ilolink on the web or with Claude.
      </p>
    </section>
  );
}
