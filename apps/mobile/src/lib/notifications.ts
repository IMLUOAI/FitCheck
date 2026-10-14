import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

/**
 * Set once we have asked for notification permission — we never ask twice,
 * even if the user denied. Local scheduled nudges only (v1); true remote
 * push via Expo Push tokens + a backend sender is the follow-up.
 */
const PUSH_ASKED_KEY = "dripcast.pushAsked";
const CHANNEL_ID = "daily-fit";

async function ensureAndroidChannel(): Promise<void> {
  // iOS ignores this; Android needs a channel for scheduled notifications.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Daily fit reminder",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Ask for notification permission once, then schedule a single repeating
 * local notification at 7:30 AM local time. Safe to call repeatedly —
 * re-scheduling replaces the old nudge, and a denied permission is never
 * re-asked. Fail-silent: notifications are a nice-to-have, never a blocker.
 */
export async function ensureDailyNudge(): Promise<void> {
  try {
    const asked = await AsyncStorage.getItem(PUSH_ASKED_KEY);
    if (asked === "1") return;

    const { status } = await Notifications.requestPermissionsAsync();
    await AsyncStorage.setItem(PUSH_ASKED_KEY, "1");
    if (status !== "granted") return;

    await ensureAndroidChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Today's fit is ready",
        body: "See what the sky says — your outfit is waiting.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 30,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    // Notifications unavailable (e.g. web, restricted device) — carry on.
  }
}
