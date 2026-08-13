// Metadata home for the per-document detail page. page.tsx is a client
// component (it resolves the doc from localStorage), so it cannot export
// metadata itself; without this layout the tab inherited the marketing
// strapline from the root layout. The page swaps in the real doc title via
// document.title once the history entry loads.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Document — ilolink",
  robots: { index: false, follow: false },
};

export default function DocumentDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
