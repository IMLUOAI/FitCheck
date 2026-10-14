import AsyncStorage from "@react-native-async-storage/async-storage";

const STREAK_KEY = "dripcast.streak";

interface StreakRecord {
  count: number;
  /** Local calendar date the streak was last extended, "YYYY-MM-DD". */
  lastDate: string;
}

/** Local calendar date as "YYYY-MM-DD". Dependency-free, no timezone tricks. */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

async function readRecord(): Promise<StreakRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StreakRecord>;
    if (typeof parsed.count !== "number" || typeof parsed.lastDate !== "string") {
      return null;
    }
    return { count: parsed.count, lastDate: parsed.lastDate };
  } catch {
    return null;
  }
}

/**
 * Record a visit for today. Same-day revisits don't extend the streak.
 * A visit the day after the last one extends it; any longer gap resets to 1.
 */
export async function recordVisit(): Promise<{ count: number; isNewDay: boolean }> {
  const today = todayLocal();
  const record = await readRecord();

  if (record && record.lastDate === today) {
    return { count: record.count, isNewDay: false };
  }

  const count =
    record && record.lastDate === shiftDate(today, -1) ? record.count + 1 : 1;

  try {
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify({ count, lastDate: today }));
  } catch {
    // Storage failure shouldn't break the visit; streak just won't persist.
  }

  return { count, isNewDay: true };
}

export async function getStreak(): Promise<number> {
  const record = await readRecord();
  return record?.count ?? 0;
}
