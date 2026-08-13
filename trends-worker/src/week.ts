// ISO-week helpers, all pure. The whole pipeline keys on "week_start" = the
// ISO Monday (YYYY-MM-DD, UTC) of the week a datum DESCRIBES, and the two
// crons sit awkwardly on either side of the week boundary:
//
//   - Sunday 22:00 UTC ingest: a Sunday belongs to the ISO week that began the
//     PRIOR Monday, so isoMonday(now) stamps snapshots with the week that is
//     about to end. That is the week the data describes — correct.
//   - Monday 06:00 UTC compute: now is already inside the NEW week, but the
//     snapshot taken 8 hours earlier belongs to the FINISHED week. Compute must
//     therefore target isoMonday(now - 1 day), never isoMonday(now).
//
// snapshotWeek/computeWeek encode exactly those two rules so callers can't get
// the boundary wrong; test/trends-week.test.ts pins them.

const DAY_MS = 86_400_000;

// The ISO Monday (UTC) of the week containing d, as YYYY-MM-DD.
// getUTCDay(): 0=Sun..6=Sat; (day+6)%7 = days since Monday (Sunday => 6 back).
export function isoMonday(d: Date): string {
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Date(midnight - daysSinceMonday * DAY_MS).toISOString().slice(0, 10);
}

// Week to stamp on snapshots taken now (the Sunday-22:00 ingest cron): the
// week currently in progress, i.e. the one the fresh data describes.
export function snapshotWeek(now: Date): string {
  return isoMonday(now);
}

// Week the Monday-06:00 compute cron should score: the week that just ended.
// One day back is enough to land on its Sunday from anywhere in Monday.
export function computeWeek(now: Date): string {
  return isoMonday(new Date(now.getTime() - DAY_MS));
}

// The Monday seven days before an ISO-Monday string (prior-week snapshots).
export function priorWeek(week: string): string {
  return new Date(Date.parse(`${week}T00:00:00Z`) - 7 * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

// Admin routes accept ?week= — only a real ISO Monday is a valid snapshot key.
export function isIsoMonday(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) && isoMonday(new Date(t)) === s;
}
