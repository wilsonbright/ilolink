// Browser-local publish history — the accountless replacement for a dashboard
// query. Lives only in this browser's localStorage; holds the manage token that
// unlocks private analytics + comment moderation for each doc. CLIENT ONLY.

export interface HistoryEntry {
  slug: string;
  title: string;
  url: string;
  visibility: string;
  publishedAt: number; // epoch ms
  manageToken: string;
}

const KEY = "ilolink:history";

function safeParse(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? (v as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function getHistory(): HistoryEntry[] {
  if (typeof localStorage === "undefined") return [];
  return safeParse(localStorage.getItem(KEY)).sort(
    (a, b) => b.publishedAt - a.publishedAt,
  );
}

export function addToHistory(entry: HistoryEntry): void {
  if (typeof localStorage === "undefined") return;
  const all = safeParse(localStorage.getItem(KEY)).filter(
    (e) => e.slug !== entry.slug,
  );
  all.push(entry);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getEntry(slug: string): HistoryEntry | null {
  return getHistory().find((e) => e.slug === slug) ?? null;
}

export function removeFromHistory(slug: string): void {
  if (typeof localStorage === "undefined") return;
  const all = safeParse(localStorage.getItem(KEY)).filter(
    (e) => e.slug !== slug,
  );
  localStorage.setItem(KEY, JSON.stringify(all));
}
