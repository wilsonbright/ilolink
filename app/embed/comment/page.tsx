// /embed/comment — the identified comment composer, rendered INSIDE an iframe
// on a published document page.
//
// The frame is served from ilolink.com, so it carries the session cookie and
// its POST to /api/comments is same-origin. The surrounding document lives on
// view.ilolink.com and can neither read into this frame nor reach the session.
//
// next.config.ts grants this path (and only this path) a frame-ancestors
// exception; the global X-Frame-Options: SAMEORIGIN would otherwise block it.

import type { Metadata } from "next";
import { currentUser } from "@/lib/auth/current-user";
import { EmbeddedComposer } from "./composer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comment",
  robots: { index: false, follow: false },
};

export default async function CommentEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string; parent?: string; anchor?: string }>;
}) {
  const { doc, parent, anchor } = await searchParams;
  const user = await currentUser();

  if (!doc) return null;

  return (
    <EmbeddedComposer
      doc={doc}
      parentId={parent ?? null}
      anchor={anchor ?? null}
      // Shown so a reader can see WHICH identity is about to be attached. On a
      // page whose author controls the surrounding pixels, that is the only
      // trustworthy signal that this composer is the real one.
      email={user?.email ?? null}
    />
  );
}
