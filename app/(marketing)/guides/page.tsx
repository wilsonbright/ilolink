import type { Metadata } from "next";
import Link from "next/link";
import {
  PILLARS,
  HOW_TOS,
  PAIN_POINTS,
  COMPARISONS,
  PERSONAS,
  type SitePage,
} from "@/lib/seo/site";
import { Article, Breadcrumbs, PageHeader } from "../_components/content";

export const metadata: Metadata = {
  title: "Guides — ilolink",
  description:
    "How to share anything an AI made as a real link, how the hosting options compare, and what you learn after you share.",
  alternates: { canonical: "/guides" },
};

// The /guides index. Grouped: the three pillar hubs, then the source-specific
// how-tos, then the straight-answer pain-point pages. Everything is registry-
// driven, so a new page in lib/seo/site.ts appears here automatically.
function Section({
  heading,
  pages,
  size = "lg",
}: {
  heading: string;
  pages: SitePage[];
  size?: "lg" | "sm";
}) {
  return (
    <section className="mt-12 first:mt-8">
      <h2 className="text-sm font-medium tracking-wide text-ink-faint">
        {heading}
      </h2>
      <ul className="mt-4 divide-y divide-hairline">
        {pages.map((p) => (
          <li key={p.path} className="py-5">
            <Link href={p.path} className="group block">
              <p
                className={`font-medium text-ink transition-colors duration-150 group-hover:text-accent ${
                  size === "lg" ? "text-xl" : "text-base"
                }`}
              >
                {p.title}
              </p>
              <p className="mt-1.5 max-w-[62ch] leading-relaxed text-ink-soft">
                {p.blurb}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function GuidesIndex() {
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
      <Section heading="Start here" pages={Object.values(PILLARS)} />
      <Section
        heading="Share output from a specific tool"
        pages={Object.values(HOW_TOS)}
        size="sm"
      />
      <Section
        heading="Straight answers"
        pages={Object.values(PAIN_POINTS)}
        size="sm"
      />
      <Section
        heading="Compare with other tools"
        pages={Object.values(COMPARISONS)}
        size="sm"
      />
      <Section heading="By role" pages={Object.values(PERSONAS)} size="sm" />
    </Article>
  );
}
