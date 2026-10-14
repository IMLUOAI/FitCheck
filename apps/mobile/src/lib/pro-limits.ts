import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Free-tier limits. Pro (`dripcast_pro` entitlement) is unlimited.
 *
 * Fits: counted server-side from the user's saved fits.
 * Battles/day: counted locally — the backend has no per-day endpoint yet.
 * Server-side enforcement of the battle limit is a follow-up once Samuel
 * applies the social patch (count today's battles by createdBy server-side).
 */
export const FREE_FIT_LIMIT = 3;
export const FREE_BATTLES_PER_DAY = 1;

const BATTLE_DAY_KEY = "dripcast.battle-day";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** How many battles the user has started today (local counter). */
export async function battlesCreatedToday(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(BATTLE_DAY_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date?: string; count?: number };
    return parsed.date === todayKey() ? (parsed.count ?? 0) : 0;
  } catch {
    return 0;
  }
}

/** Record a successful battle creation against today's free quota. */
export async function recordBattleCreated(): Promise<void> {
  const count = await battlesCreatedToday();
  try {
    await AsyncStorage.setItem(
      BATTLE_DAY_KEY,
      JSON.stringify({ date: todayKey(), count: count + 1 }),
    );
  } catch {
    // Non-fatal: the worst case is the limit not being enforced locally.
  }
}
