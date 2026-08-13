// /embed/comment — the comment composer, rendered INSIDE an iframe on a
// published document page. Every composer the widget shows is this frame:
// signed-in readers post with their identity (and never see a Name field),
// signed-out readers get the anonymous Name-optional form when the document
// allows it.
//
// The frame is served from ilolink.com, so it carries the session cookie and
// its POST to /api/comments is same-origin. The surrounding document lives on
// view.ilolink.com and can neither read into this frame nor reach the session.
//
// next.config.ts grants this path (and only this path) a frame-ancestors
// exception; the global X-Frame-Options: SAMEORIGIN would otherwise block it.

import type { Metadata } from "next";
import { currentUser } from "@/lib/auth/current-user";
import { queryFirst } from "@/lib/db/client";
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
  searchParams: Promise<{
    doc?: string;
    parent?: string;
    anchor?: string;
    scheme?: string;
  }>;
}) {
  const { doc, parent, anchor, scheme } = await searchParams;
  const user = await currentUser();

  if (!doc) return null;

  // A signed-out visitor may compose anonymously ONLY when the document itself
  // allows anonymous comments and is publicly reachable. Every other outcome —
  // unknown id, private, unpublished, trusted, signed-only, comments off —
  // renders the identical sign-in prompt, so probing this path with arbitrary
  // ids can never distinguish a private document from a missing one.
  let anonAllowed = false;
  if (!user) {
    const row = await queryFirst<{
      comments_mode: string;
      visibility: string;
      trusted: number;
      unpublished_at: number | null;
    }>(
      `SELECT comments_mode, visibility, trusted, unpublished_at
         FROM documents WHERE id = ?`,
      doc,
    );
    anonAllowed =
      row !== null &&
      !row.unpublished_at &&
      !row.trusted &&
      row.visibility !== "private" &&
      row.comments_mode === "anon";
  }

  return (
    // scheme=light pins the composer to the light tokens (.scheme-light,
    // globals.css): the widget chrome that frames us is always light, while
    // this origin follows the OS scheme — unpinned, a dark-mode reader would
    // get a dark form inside a light popover.
    <div className={scheme === "light" ? "scheme-light bg-canvas" : undefined}>
      <EmbeddedComposer
        doc={doc}
        parentId={parent ?? null}
        anchor={anchor ?? null}
        anonAllowed={anonAllowed}
        // Shown so a reader can see WHICH identity is about to be attached. On a
        // page whose author controls the surrounding pixels, that is the only
        // trustworthy signal that this composer is the real one.
        email={user?.email ?? null}
      />
    </div>
  );
}
