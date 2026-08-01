import type { Metadata } from "next";
import "./globals.css";
import { SITE_TITLE, SITE_DESCRIPTION } from "@/lib/seo/site";

// Default metadata for anything that doesn't declare its own; the copy itself
// lives in lib/seo/site.ts with the rest of the site registry.
export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

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
