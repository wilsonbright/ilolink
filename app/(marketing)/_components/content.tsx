// Shared building blocks for every marketing page. Server components (no client
// JS) so the content pages stay static and fast. The design vocabulary is the
// app's own zen tokens — ink / ink-soft / hairline / accent — so guides read as
// part of the product, not a bolted-on marketing skin.

import Link from "next/link";
import {
  JsonLd,
  breadcrumbList,
  faqPage,
  type Crumb,
  type FaqItem,
} from "@/lib/seo/jsonld";

// ── Page frame ───────────────────────────────────────────────────────────
// Constrains measure and drops in vertical rhythm shared by all content pages.
export function Article({ children }: { children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-14 sm:py-20">{children}</article>
  );
}

// Breadcrumbs: visible trail + BreadcrumbList schema in one place, so the two
// can never drift apart.
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-faint">
      <JsonLd data={breadcrumbList(crumbs)} />
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((c, i) => (
          <li key={c.path} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {i < crumbs.length - 1 ? (
              <Link
                href={c.path}
                className="transition-colors duration-150 hover:text-ink"
              >
                {c.name}
              </Link>
            ) : (
              <span className="text-ink-soft">{c.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Page title + the liftable lead. `lead` is the "first 40 words answer the
// query" paragraph from the plan — kept visually distinct and first in the DOM
// so AI Overviews can quote it without surrounding context.
export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead: React.ReactNode;
}) {
  return (
    <header className="mb-10">
      {eyebrow && (
        <p className="mb-3 text-sm font-medium tracking-wide text-accent">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl font-semibold leading-[1.15] text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="mt-5 border-l-2 border-accent/40 pl-4 text-lg leading-relaxed text-ink-soft">
        {lead}
      </p>
    </header>
  );
}

// Article body wrapper — see .prose in globals.css. Pass plain HTML/JSX inside.
export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="prose">{children}</div>;
}

// A pull-out note / honest-limitation callout. The plan leans hard on candor as
// a trust + citation signal, so limitations get a first-class visual home.
export function Callout({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="my-8 rounded-lg border border-hairline bg-surface p-5 text-[0.95rem] leading-relaxed text-ink-soft">
      {title && <p className="mb-1 font-medium text-ink">{title}</p>}
      {children}
    </aside>
  );
}

// Honest comparison table (Stage 3, Group B5). Generic: pass column headers and
// rows. First column is the row label (feature); a "ilolink" column can be
// highlighted via `highlightCol`.
export function ComparisonTable({
  columns,
  rows,
  highlightCol,
  caption,
}: {
  columns: string[];
  rows: string[][];
  highlightCol?: number;
  caption?: string;
}) {
  return (
    <div className="my-8 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {caption && (
          <caption className="mb-3 text-left text-ink-faint">{caption}</caption>
        )}
        <thead>
          <tr className="border-b border-ink/15">
            {columns.map((col, i) => (
              <th
                key={col}
                scope="col"
                className={`py-2.5 pr-4 text-left font-semibold ${
                  i === highlightCol ? "text-accent" : "text-ink"
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b border-hairline align-top">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={`py-2.5 pr-4 ${
                    c === 0
                      ? "font-medium text-ink"
                      : c === highlightCol
                        ? "text-ink"
                        : "text-ink-soft"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// FAQ block: renders the visible Q&A and emits FAQPage schema from the same
// data (GEO — each answer is individually citable).
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section className="mt-14">
      <JsonLd data={faqPage(items)} />
      <h2 className="text-2xl font-semibold text-ink">Questions</h2>
      <dl className="mt-6 divide-y divide-hairline">
        {items.map((it) => (
          <div key={it.q} className="py-5">
            <dt className="font-medium text-ink">{it.q}</dt>
            <dd className="mt-2 max-w-[68ch] leading-relaxed text-ink-soft">
              {it.a}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Primary conversion block. Points at the live composer by default (ilolink is
// accountless — the composer is the signup).
export function Cta({
  label = "Publish your first doc",
  href = "/",
  sub,
}: {
  label?: string;
  href?: string;
  sub?: string;
}) {
  return (
    <div className="mt-14 rounded-xl border border-hairline bg-surface p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-medium text-ink">Try it on your own doc</p>
          {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}

// "Keep reading" internal-link cluster (the §4 link-graph rule: every page links
// up to a pillar and sideways to related pages).
export function RelatedLinks({
  title = "Keep reading",
  links,
}: {
  title?: string;
  links: { path: string; title: string; blurb?: string }[];
}) {
  return (
    <section className="mt-14 border-t border-hairline pt-10">
      <h2 className="text-sm font-medium tracking-wide text-ink-faint">
        {title}
      </h2>
      <ul className="mt-5 grid gap-5 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.path}>
            <Link href={l.path} className="group block">
              <p className="font-medium text-ink transition-colors duration-150 group-hover:text-accent">
                {l.title}
              </p>
              {l.blurb && (
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {l.blurb}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
