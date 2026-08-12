import type { Metadata } from "next";
import "./globals.css";
import { SITE_METADATA } from "@/lib/seo/metadata";

// Defaults for anything that doesn't declare its own. The object itself lives
// in lib/seo/metadata.ts (with the reasoning behind each field) so a test can
// assert it without rendering this layout — same split as lib/seo/robots.ts.
//
// app/favicon.ico, app/icon.svg, app/apple-icon.png and app/opengraph-image.png
// are picked up by Next's file conventions; no tags for them are declared here.
export const metadata: Metadata = SITE_METADATA;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
