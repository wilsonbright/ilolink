// OAuth defaultHandler (Claude path). Renders the Authorize page and, on approve,
// SILENTLY provisions an anonymous workspace — no email, no password — then
// completes the grant. The provider injects env.OAUTH_PROVIDER (the OAuth
// helpers) before calling this handler. See mcp-worker/PINNED.md.

import type { Env } from "./agent";
import { getOrCreateByOauthSubject } from "./workspace";

// The provider augments env with this helpers object at runtime (env.OAUTH_PROVIDER).
interface OAuthHelpers {
  parseAuthRequest(request: Request): Promise<{ scope?: string[] } & Record<string, unknown>>;
  completeAuthorization(o: {
    request: unknown;
    userId: string;
    scope: string[];
    metadata: unknown;
    props: unknown;
  }): Promise<{ redirectTo: string }>;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function page(stateB64: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Authorize ilolink</title>
<style>
:root{color-scheme:light dark;--bg:#fafaf8;--surface:#fff;--ink:#1a1a17;--soft:#56564f;--faint:#8a8a80;--line:#eae8e1;--accent:#3b5bdb}
@media(prefers-color-scheme:dark){:root{--bg:#17171a;--surface:#1f1f23;--ink:#edece7;--soft:#a8a79f;--faint:#6f6e67;--line:#2c2c31;--accent:#7c93f0}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--ink);font-family:"Inter",ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
.card{width:100%;max-width:30rem;padding:2.5rem 1.75rem;text-align:center}
h1{font-size:1.4rem;font-weight:620;margin:0 0 .5rem}
p{color:var(--soft);line-height:1.6;margin:0 0 1rem}
ul{color:var(--soft);text-align:left;line-height:1.7;margin:0 auto 1.5rem;max-width:24rem;padding-left:1.1rem}
button{width:100%;padding:.8rem 1rem;font-size:1rem;font-weight:560;color:#fff;background:var(--accent);border:0;border-radius:9px;cursor:pointer}
.fine{font-size:.82rem;color:var(--faint);margin-top:1.25rem}
</style></head><body><div class="card">
<h1>Connect ilolink to Claude</h1>
<p>Approve to create a private, anonymous ilolink workspace. No account, no password.</p>
<ul>
<li>Publish documents to a shareable link, right from your chat.</li>
<li>See views, scroll depth, and comments on a private dashboard.</li>
<li>Ask Claude for your dashboard link anytime — it needs no login, so keep it private.</li>
</ul>
<form method="POST" action="/authorize">
<input type="hidden" name="state" value="${esc(stateB64)}" />
<button type="submit">Authorize</button>
</form>
<p class="fine">ilolink has no accounts. Approving creates a workspace tied to this Claude connection.</p>
</div></body></html>`;
}

export const authorizeHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const helpers = (env as unknown as { OAUTH_PROVIDER: OAuthHelpers }).OAUTH_PROVIDER;
    const url = new URL(request.url);

    if (url.pathname === "/authorize") {
      const oauthReq = await helpers.parseAuthRequest(request);

      if (request.method === "GET") {
        const state = btoa(JSON.stringify(oauthReq));
        return new Response(page(state), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (request.method === "POST") {
        const form = await request.formData();
        let parsed: { scope?: string[] } & Record<string, unknown>;
        try {
          parsed = JSON.parse(atob(String(form.get("state") ?? "")));
        } catch {
          return new Response("Bad authorize state.", { status: 400 });
        }
        // Anonymous: a fresh subject per grant. Claude persists the issued token,
        // so re-authorizing is rare; each fresh authorize yields a new workspace.
        const subject = crypto.randomUUID();
        const ws = await getOrCreateByOauthSubject(env.DB, subject);
        const { redirectTo } = await helpers.completeAuthorization({
          request: parsed,
          userId: ws.id,
          scope: parsed.scope ?? ["publish"],
          metadata: { anonymous: true },
          props: { workspaceId: ws.id, origin: "claude_oauth" },
        });
        return Response.redirect(redirectTo, 302);
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
