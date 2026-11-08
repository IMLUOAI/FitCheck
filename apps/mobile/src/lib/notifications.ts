import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

/**
 * Set once we have asked for notification permission — we never ask twice,
 * even if the user denied. Local scheduled nudges only (v1); true remote
 * push via Expo Push tokens + a backend sender is the follow-up.
 */
const PUSH_ASKED_KEY = "dripcast.pushAsked";
const NUDGE_BODY_KEY = "dripcast.nudgeBody";
const NUDGE_DATE_KEY = "dripcast.nudgeDate";
const CHANNEL_ID = "daily-fit";

async function ensureAndroidChannel(): Promise<void> {
  // iOS ignores this; Android needs a channel for scheduled notifications.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Daily fit reminder",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Local calendar date as "YYYY-MM-DD". */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Ask for notification permission once, then schedule a single repeating
 * local notification at 7:30 AM local time. Safe to call repeatedly.
 *
 * Pass an `eveningLine` (e.g. the evening-drop alert headline) to enrich
 * tomorrow's nudge body — the schedule is only rewritten when the body or
 * the day changed, so repeated calls are cheap. A denied permission is
 * never re-asked: later calls check the current status without prompting.
 * Fail-silent: notifications are a nice-to-have, never a blocker.
 */
export async function ensureDailyNudge(eveningLine?: string): Promise<void> {
  try {
    const asked = await AsyncStorage.getItem(PUSH_ASKED_KEY);
    if (asked !== "1") {
      const { status } = await Notifications.requestPermissionsAsync();
      await AsyncStorage.setItem(PUSH_ASKED_KEY, "1");
      if (status !== "granted") return;
    } else {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return;
    }

    await ensureAndroidChannel();

    const body = eveningLine
      ? `${eveningLine}. Plus, today's fit is ready.`
      : "See what the sky says — your outfit is waiting.";
    const today = todayLocal();
    const [storedDate, storedBody] = await Promise.all([
      AsyncStorage.getItem(NUDGE_DATE_KEY),
      AsyncStorage.getItem(NUDGE_BODY_KEY),
    ]);
    if (storedDate === today && storedBody === body) return;

    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Today's fit is ready",
        body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 30,
        channelId: CHANNEL_ID,
      },
    });
    await AsyncStorage.multiSet([
      [NUDGE_DATE_KEY, today],
      [NUDGE_BODY_KEY, body],
    ]);
  } catch {
    // Notifications unavailable (e.g. web, restricted device) — carry on.
  }
}
