/**
 * On-device reminders.
 *
 * These are LOCAL notifications: the phone schedules and fires them itself
 * from data the app already has. No push service, no Firebase, no APNs
 * certificate, and nothing running on our side — the OS wakes the user even
 * with the app closed and the device offline.
 *
 * What we remind about:
 *  - a weekly report waiting on the client's numbers (they hold up ROAS)
 *  - a retainer coming due, and again the morning it's late
 *
 * Everything is a no-op on the web.
 */

import { isNative } from "@/lib/native";

export interface ReminderInput {
  /** Weeks awaiting the client's closes/revenue. */
  pendingReports: number;
  /** Next retainer due date, ISO, if any. */
  nextDueDate?: string | null;
}

/** Stable ids so re-scheduling replaces rather than duplicates. */
const ID_REPORT = 1001;
const ID_DUE_SOON = 1002;
const ID_OVERDUE = 1003;

/** 9am local on the given day. */
function at9am(day: Date): Date {
  const d = new Date(day);
  d.setHours(9, 0, 0, 0);
  return d;
}

export async function syncReminders(input: ReminderInput): Promise<void> {
  if (!isNative()) return;

  try {
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const asked = await LocalNotifications.requestPermissions();
      if (asked.display !== "granted") return;
    }

    // Clear our previous schedule so counts/dates never go stale.
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) =>
      [ID_REPORT, ID_DUE_SOON, ID_OVERDUE].includes(n.id)
    );
    if (ours.length) {
      await LocalNotifications.cancel({ notifications: ours });
    }

    const now = new Date();
    const schedule: Parameters<
      typeof LocalNotifications.schedule
    >[0]["notifications"] = [];

    // Nudge tomorrow morning if a report is still waiting on them.
    if (input.pendingReports > 0) {
      const tomorrow = at9am(
        new Date(now.getTime() + 24 * 60 * 60 * 1000)
      );
      schedule.push({
        id: ID_REPORT,
        title:
          input.pendingReports === 1
            ? "Your weekly report needs your numbers"
            : `${input.pendingReports} weekly reports need your numbers`,
        body: "Add your closes and revenue to see your true ROAS.",
        schedule: { at: tomorrow, allowWhileIdle: true },
        extra: { url: "/reports" },
      });
    }

    // Retainer: heads-up 3 days out, and a nudge the morning it's late.
    if (input.nextDueDate) {
      const due = new Date(input.nextDueDate);
      const threeDaysBefore = at9am(
        new Date(due.getTime() - 3 * 24 * 60 * 60 * 1000)
      );
      if (threeDaysBefore > now) {
        schedule.push({
          id: ID_DUE_SOON,
          title: "Retainer due in 3 days",
          body: "Your next payment is coming up.",
          schedule: { at: threeDaysBefore, allowWhileIdle: true },
          extra: { url: "/payments" },
        });
      }
      const dayAfter = at9am(new Date(due.getTime() + 24 * 60 * 60 * 1000));
      if (dayAfter > now) {
        schedule.push({
          id: ID_OVERDUE,
          title: "Retainer past due",
          body: "Let the team know once it's sent.",
          schedule: { at: dayAfter, allowWhileIdle: true },
          extra: { url: "/payments" },
        });
      }
    }

    if (schedule.length) {
      await LocalNotifications.schedule({ notifications: schedule });
    }
  } catch (err) {
    // A reminder failing must never affect the page.
    console.error("Reminder scheduling failed:", err);
  }
}
