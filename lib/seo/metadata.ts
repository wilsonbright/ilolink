// Site-wide metadata defaults, kept out of app/layout.tsx for the same reason
// lib/seo/robots.ts exists: a plain data module is assertable in a test without
// rendering a React tree or resolving a CSS import.
//
// What this fixes, all of which shipped broken and none of which could fail a
// build: every canonical on the site was RELATIVE (`href="/faq"`), the home page
// had no canonical at all, and not one page carried a single og: or twitter:
// tag — so every share on Slack, X, LinkedIn or iMessage unfurled bare.
import type { Metadata } from "next";
import { SITE_TITLE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

export const SITE_METADATA: Metadata = {
  // The one line that absolutises every URL-typed metadata field. Without it
  // Next emits page canonicals verbatim as the relative strings the pages
  // declare (`alternates: { canonical: "/faq" }`), which is invalid per spec
  // and which Lighthouse fails outright: "Is not an absolute URL (/faq)".
  // It also gates og:image — a relative image URL cannot be resolved by an
  // unfurler fetching from another host.
  metadataBase: new URL(SITE_URL),

  title: SITE_TITLE,
  description: SITE_DESCRIPTION,

  // og:title and og:description are DELIBERATELY absent.
  //
  // Next's resolver (inheritFromMetadata, packages/next/src/lib/metadata/
  // resolve-metadata.ts) fills a missing openGraph/twitter title or description
  // from the RESOLVED metadata of the segment being rendered. So leaving them
  // unset here gives all ~60 marketing pages their OWN title and description in
  // their og: tags, with no per-page openGraph block to write or maintain.
  // Setting them here would do the opposite: stamp the site defaults onto every
  // page and make all 58 sitemap URLs unfurl identically.
  //
  // Metadata merging is SHALLOW. A page that declares its own `openGraph`
  // replaces this object entirely rather than extending it, and so must restate
  // type/siteName/locale itself. No page does today — see the test.
  //
  // og:url is omitted for a related reason: one value here would claim every
  // page is the home page, and unlike title there is nothing per-page for it to
  // inherit. Unfurlers fall back to the URL they fetched, which is correct.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
  },

  // Twitter inherits from openGraph after the og fill above, so the card picks
  // up the page's own title, description and image without restating them.
  // summary_large_image because app/opengraph-image.png is a 1200x630 banner,
  // not a square avatar — "summary" would letterbox it into a thumbnail.
  twitter: { card: "summary_large_image" },
};
