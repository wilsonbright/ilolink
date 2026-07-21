import type { Metadata } from "next";
import { Article, Breadcrumbs, PageHeader, Prose, Callout } from "../_components/content";

export const metadata: Metadata = {
  title: "Status — ilolink",
  description:
    "ilolink runs on Cloudflare's global edge over HTTPS. Published links are meant to be permanent; expiry is an opt-in visibility mode, not a default.",
  alternates: { canonical: "/status" },
};

export default function Page() {
  return (
    <Article>
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Status", path: "/status" },
        ]}
      />
      <PageHeader
        title="Status"
        lead={
          <>
            ilolink runs on Cloudflare&rsquo;s global edge over HTTPS. Published
            links persist by default. Expiry is an opt-in visibility mode you set
            per document, never something forced on free use.
          </>
        }
      />
      <Prose>
        <h2>Is ilolink up?</h2>
        <p>
          There is no live status feed yet. If a link won&rsquo;t load, it&rsquo;s
          almost always the edge or your network, not lost data — documents are
          stored durably. An uptime page is on the roadmap.
        </p>

        <h2>Do published links stay up?</h2>
        <p>
          Yes. A published link keeps working until you delete it or set it to
          expire. Expiry is opt-in: turn it on per document when you want a link
          to stop resolving after a date. It&rsquo;s a visibility choice, not
          something we impose on free use.
        </p>

        <h2>Where is it hosted?</h2>
        <p>
          On Cloudflare&rsquo;s global edge, served over HTTPS. Branded links at{" "}
          <code>ilolink.com/&lt;slug&gt;</code> redirect to the isolated render
          origin <code>view.ilolink.com</code>, where each doc is served under a
          <code>default-src &apos;none&apos;</code> CSP with its JavaScript frozen
          to static. Analytics stay cookieless — see the{" "}
          <a href="/privacy">privacy page</a> for the details.
        </p>
      </Prose>
      <Callout title="Placeholder">
        This page is a stub. A live status feed with real uptime and incident
        history is coming; until then, treat the notes above as the current
        state.
      </Callout>
    </Article>
  );
}
