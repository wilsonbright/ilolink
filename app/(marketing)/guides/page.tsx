import type { Metadata } from "next";
import Link from "next/link";
import { PILLARS } from "@/lib/seo/site";
import { Article, Breadcrumbs, PageHeader } from "../_components/content";

export const metadata: Metadata = {
  title: "Guides — ilolink",
  description:
    "How to share anything an AI made as a real link, how the hosting options compare, and what you learn after you share.",
  alternates: { canonical: "/guides" },
};

// The /guides index. Intentionally thin-but-real: it lists the three pillars
// (the only content live in this pass) rather than padding out a fake hub. As
// cluster pages ship, they slot under their pillar here.
export default function GuidesIndex() {
  const pillars = Object.values(PILLARS);
  return (
    <Article>
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ]}
      />
      <PageHeader
        title="Guides"
        lead="Everything about turning AI output into a page people can open — and seeing how they read it once you send the link."
      />
      <ul className="mt-4 divide-y divide-hairline">
        {pillars.map((p) => (
          <li key={p.path} className="py-6">
            <Link href={p.path} className="group block">
              <h2 className="text-xl font-medium text-ink transition-colors duration-150 group-hover:text-accent">
                {p.title}
              </h2>
              <p className="mt-2 max-w-[62ch] leading-relaxed text-ink-soft">
                {p.blurb}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Article>
  );
}
