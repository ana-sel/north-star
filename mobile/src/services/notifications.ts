/**
 * Notification service — local scheduled notifications.
 *
 * Handles:
 * - Morning review prompt (default 08:00)
 * - Overload alert (>5 cards in-progress, checked on app foreground)
 * - Bedtime reflection reminder (default 21:30)
 *
 * All notifications are local — no push server required.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Schedule the morning review notification — daily at the given hour/minute.
 */
export async function scheduleMorningReview(hour = 8, minute = 0): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;

  // Cancel existing morning notifications
  await cancelByTag("morning-review");

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "☀️ Good morning",
      body: "Time to review today's plan — what's the one thing that matters?",
      data: { screen: "Today", tag: "morning-review" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return id;
}

/**
 * Schedule the bedtime reflection notification — daily.
 */
export async function scheduleBedtimeReflection(hour = 21, minute = 30): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;

  await cancelByTag("bedtime-reflection");

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🌙 Evening reflection",
      body: "How did today go? A quick diary entry keeps patterns visible.",
      data: { screen: "Diary", tag: "bedtime-reflection" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return id;
}

/**
 * Fire an immediate local notification for overload (>5 WIP cards).
 */
export async function fireOverloadAlert(wipCount: number): Promise<void> {
  const granted = await requestPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚠️ Overload warning",
      body: `You have ${wipCount} cards in-progress. Consider finishing or parking some.`,
      data: { screen: "Plan", tag: "overload-alert" },
    },
    trigger: null, // immediate
  });
}

/**
 * Cancel all scheduled notifications matching a given tag.
 */
async function cancelByTag(tag: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if ((n.content.data as any)?.tag === tag) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Initialize default notification schedule.
 * Call once on app start (idempotent — reschedules if already set).
 */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === "web") return; // not supported on web
  await scheduleMorningReview();
  await scheduleBedtimeReflection();
}
