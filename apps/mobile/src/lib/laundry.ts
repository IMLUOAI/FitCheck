import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Fit } from "@dripcast/api";
import { dayKey, dayKeyOf, fitItemIds } from "./fitHistory";

export const LAUNDRY_KEY = "dripcast.laundryDay";

function shiftDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return dayKey(dt);
}

/** Stored laundry day ("YYYY-MM-DD"), or null when never set / unreadable. */
export async function getLastLaundryDay(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(LAUNDRY_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

/** Mark laundry done today. Returns today's local "YYYY-MM-DD". */
export async function markLaundryDay(): Promise<string> {
  const today = dayKey(new Date());
  try {
    await AsyncStorage.setItem(LAUNDRY_KEY, JSON.stringify(today));
  } catch {
    // Storage failure shouldn't break the tap; the count just won't persist.
  }
  return today;
}

/**
 * A piece is dirty when it was worn AFTER the last laundry day. When laundry
 * day was never set, pieces worn within the last 7 days (inclusive of today)
 * count as dirty. Wear is derived from fit history: a fit's items + createdAt.
 */
export function isItemDirty(
  itemId: string,
  fits: Fit[],
  lastLaundryDay: string | null,
): boolean {
  const cutoff =
    lastLaundryDay ?? shiftDays(dayKey(new Date()), -6);
  for (const fit of fits) {
    if (dayKeyOf(fit.createdAt) <= cutoff) continue;
    if (fitItemIds(fit).includes(itemId)) return true;
  }
  return false;
}

/** Every item id worn after the last laundry day (see isItemDirty). */
export function dirtyItemIds(
  fits: Fit[],
  lastLaundryDay: string | null,
): Set<string> {
  const cutoff =
    lastLaundryDay ?? shiftDays(dayKey(new Date()), -6);
  const dirty = new Set<string>();
  for (const fit of fits) {
    if (dayKeyOf(fit.createdAt) <= cutoff) continue;
    for (const id of fitItemIds(fit)) {
      dirty.add(id);
    }
  }
  return dirty;
}
