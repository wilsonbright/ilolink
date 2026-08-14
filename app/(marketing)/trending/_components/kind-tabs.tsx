"use client";

// Category tabs for the trending page — the one client island on it. The
// anchor-link row worked but made "quick nav" a scroll hunt: six categories
// deep, jumping to Evals meant sailing past five tables. Tabs swap the panel
// in place instead.
//
// SEO is preserved by construction: the panels arrive as server-rendered
// children (every table is in the HTML source of every week), and inactive
// ones are hidden with the `hidden` attribute rather than unmounted. The
// island only toggles visibility — it renders no content of its own.
//
// Deep links still work both ways: an incoming #mcp-server activates that
// tab on mount, and clicking a tab rewrites the hash (replaceState, no
// history spam, no scroll jump) so the URL stays shareable.

import { useEffect, useState, type ReactNode } from "react";

export interface KindTab {
  id: string;
  label: string;
}

export function KindTabs({
  tabs,
  children,
}: {
  tabs: KindTab[];
  // One panel per tab, same order — the server component zips them.
  children: ReactNode[];
}) {
  const [active, setActive] = useState(tabs[0]?.id);

  // Honor an incoming anchor once, after mount (location doesn't exist on the
  // server, and the pre-hydration markup must match the SSR output).
  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (tabs.some((t) => t.id === fromHash)) setActive(fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (id: string) => {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="mt-10 border-t-2 border-divider pt-6">
      <div
        role="tablist"
        aria-label="Categories"
        className="flex flex-wrap gap-x-1 gap-y-2"
      >
        {tabs.map((t) => {
          const current = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={current}
              aria-controls={`panel-${t.id}`}
              onClick={() => select(t.id)}
              // DS: the active tab is solid accent (the same treatment as the
              // New tag and primary buttons); inactive stays quiet text. Zero
              // radius, no underline tricks.
              className={
                current
                  ? "bg-accent px-3 py-1.5 text-sm font-extrabold text-canvas"
                  : "px-3 py-1.5 text-sm text-ink-soft transition-colors duration-150 hover:text-accent"
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
        >
          {children[i]}
        </div>
      ))}
    </div>
  );
}
