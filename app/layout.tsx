import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { SITE_METADATA } from "@/lib/seo/metadata";

// The whole system is set in Archivo — headings at 800, body at 400 — per the
// Modernist design handoff. next/font self-hosts the files, so no runtime
// request leaves the origin and the landing page stays statically prerenderable.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
  display: "swap",
});

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
    <html lang="en" className={archivo.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
