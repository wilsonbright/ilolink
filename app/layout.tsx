import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ilolink — share what you wrote, read how it landed",
  description:
    "Publish a Markdown or HTML file, get a link, and see how people actually read it. Cookieless analytics, heatmaps, and feedback — nothing creepy.",
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
