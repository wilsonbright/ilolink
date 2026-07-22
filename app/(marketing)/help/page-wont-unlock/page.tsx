import type { Metadata } from "next";
import { JsonLd, article } from "@/lib/seo/jsonld";
import {
  Article,
  Breadcrumbs,
  PageHeader,
  Prose,
  Callout,
  Faq,
  Cta,
  RelatedLinks,
} from "../../_components/content";

export const metadata: Metadata = {
  title: "My password page won't unlock — ilolink help",
  description:
    "A password page opens only with the exact password set at publish time, and it's case-sensitive. Forgot it? Publish a new copy and delete the old one.",
  alternates: { canonical: "/help/page-wont-unlock" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/help/page-wont-unlock",
            headline: "My password page won't unlock",
            description:
              "Why a password-protected ilolink page won't open — a wrong or case-mismatched password — and what to do if you forgot the password you set at publish time.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
          { name: "Page won't unlock", path: "/help/page-wont-unlock" },
        ]}
      />
      <PageHeader
        title="My password page won't unlock"
        lead={
          <>
            A password page opens only with the <strong>exact password</strong>{" "}
            you set when it was published — it&apos;s case-sensitive. If you
            forgot it, you can&apos;t change it on an existing doc — docs are
            immutable — so publish a new copy with a new password and delete the
            old one from your dashboard.
          </>
        }
      />
      <Prose>
        <h2>Why it won&apos;t open</h2>
        <p>
          The password is fixed at publish time. There&apos;s only one that
          works, and it has to match exactly. Almost every failed unlock is one
          of two things:
        </p>
        <ul>
          <li>
            <strong>Wrong password.</strong> A typo, an extra space, or the
            wrong password entirely. Retype it carefully.
          </li>
          <li>
            <strong>Case mismatch.</strong> Passwords are case-sensitive —{" "}
            <code>Launch2026</code> and <code>launch2026</code> are different.
            Check Caps Lock and any autocapitalize on mobile.
          </li>
        </ul>
        <p>
          There&apos;s no password reset flow, because the password isn&apos;t
          stored as something you can edit later — it&apos;s baked into the doc
          when you publish. Get it exactly right and the page opens; there&apos;s
          nothing else to unlock.
        </p>

        <h2>If you forgot the password</h2>
        <p>
          You can&apos;t change the password on a doc that&apos;s already live.
          Every doc is immutable — one version, no edits — so there&apos;s no way
          to swap the password in place. The path forward is to republish:
        </p>
        <ol>
          <li>
            Publish a <strong>new copy</strong> of the same content with a new
            password you&apos;ll remember. This gives you a new link.
          </li>
          <li>
            <strong>Delete the old doc</strong> from your dashboard so the
            unreachable link is gone.
          </li>
          <li>Share the new link and its new password.</li>
        </ol>
        <Callout title="Where the delete lives">
          <p>
            ilolink is accountless. The manage token for each doc is stored in
            the <strong>browser you published from</strong>, so your dashboard —
            and the delete button — works from that same browser and device. If
            you published from a different machine, delete from that one.
          </p>
        </Callout>

        <h2>If your readers can&apos;t get in</h2>
        <p>
          The password is separate from the link — sharing the URL doesn&apos;t
          share the password. If a reader is stuck at the prompt, send them the
          exact password, ideally through a different channel than the link.
          Copy and paste it so nothing gets mistyped, and remind them it&apos;s
          case-sensitive. If it still won&apos;t open, confirm you&apos;re both
          using the same password — the one set when the doc was published, not
          an older one from a previous copy.
        </p>
      </Prose>
      <Faq
        items={[
          {
            q: "Can I change the password later?",
            a: "No. Docs are immutable — one version, no edits — so you can't change the password on a live doc. Publish a new copy with a new password and delete the old one.",
          },
          {
            q: "Is the password case-sensitive?",
            a: "Yes. Launch2026 and launch2026 are treated as different passwords. Check Caps Lock and mobile autocapitalize if a correct-looking password is rejected.",
          },
          {
            q: "Where do I delete the old one?",
            a: "From your dashboard, on the browser you published from. ilolink is accountless, so each doc's manage token lives in that browser and device.",
          },
          {
            q: "Is there a password reset?",
            a: "No. The password is set at publish time and isn't editable, so there's nothing to reset. Republish with a new password instead.",
          },
        ]}
      />
      <Cta sub="Forgot the password? Publish a fresh copy with a new one, then delete the old doc." />
      <RelatedLinks
        links={[
          {
            path: "/help/delete-or-replace",
            title: "Delete or replace a doc",
            blurb: "Remove the old link and publish a new copy — from the browser you published on.",
          },
          {
            path: "/guides/do-links-expire",
            title: "Do links expire?",
            blurb: "How visibility and opt-in expiry work, and what keeps a link reachable.",
          },
        ]}
      />
    </Article>
  );
}
