import type { Fit } from "@dripcast/api";

/** "YYYY-MM-DD" for a Date in the device's LOCAL timezone (not UTC). */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** dayKey for an ISO timestamp string. */
export function dayKeyOf(iso: string): string {
  return dayKey(new Date(iso));
}

/** Group fits by their local calendar day (from createdAt). */
export function groupFitsByDay(fits: Fit[]): Map<string, Fit[]> {
  const byDay = new Map<string, Fit[]>();
  for (const fit of fits) {
    const key = dayKeyOf(fit.createdAt);
    const list = byDay.get(key);
    if (list) {
      list.push(fit);
    } else {
      byDay.set(key, [fit]);
    }
  }
  return byDay;
}

/**
 * Flat 7×N cell grid for a month view (N = 4–6 weeks). Weeks start Sunday;
 * `null` pads days outside the month. `month` is 0-indexed (JS convention).
 */
export function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const cells: (Date | null)[] = [];
  const leading = new Date(year, month, 1).getDay(); // 0 = Sunday
  for (let i = 0; i < leading; i++) {
    cells.push(null);
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

/** Item ids for a fit — items may be populated FitItem objects or raw ids. */
export function fitItemIds(fit: Fit): string[] {
  return fit.items.map((item) => (typeof item === "string" ? item : item._id));
}

function dayKeyToUtcMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Find the most recent EARLIER calendar day on which the exact same item set
 * was worn. Returns the day distance, or null when never worn before.
 * Compares by dayKey and excludes the fit itself.
 */
export function findRepeat(fit: Fit, allFits: Fit[]): { daysAgo: number } | null {
  const signature = fitItemIds(fit).slice().sort().join("|");
  const myDay = dayKeyOf(fit.createdAt);
  const myMs = dayKeyToUtcMs(myDay);
  let best: { daysAgo: number } | null = null;
  for (const other of allFits) {
    if (other._id === fit._id) continue;
    const otherDay = dayKeyOf(other.createdAt);
    if (otherDay >= myDay) continue; // same day or later — only earlier days count
    if (fitItemIds(other).slice().sort().join("|") !== signature) continue;
    const daysAgo = Math.round((myMs - dayKeyToUtcMs(otherDay)) / 86_400_000);
    if (best === null || daysAgo < best.daysAgo) {
      best = { daysAgo };
    }
  }
  return best;
}
