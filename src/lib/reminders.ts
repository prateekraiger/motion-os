/**
 * Stable ids for native reminder notifications.
 *
 * A task can be re-armed many times, so the notification id is derived from the
 * task plus the exact reminder moment. Rescheduling cancels the old alarm and
 * books a new one, which is exactly the semantics the in-app engine already
 * has (each task+moment pair is announced once).
 */
import { reminderKey } from "./productivity";

/** Notification / alarm id for one task at one reminder moment. */
export function reminderNotificationId(taskId: string, remindAt: string | null): string {
  return reminderKey({ id: taskId, remindAt } as Parameters<typeof reminderKey>[0]);
}
