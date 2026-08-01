import { db } from "@/db";
import { notifications } from "@/db/schema";

/** Notification types accepted by the `notifications.type` enum. */
export type NotificationType =
  | "phase_update"
  | "message_received"
  | "revision_response"
  | "payment_confirmed"
  | "project_completed"
  | "file_uploaded"
  | "comment_added"
  | "survey_request";

export interface CreateNotificationInput {
  userId: string;
  projectId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string;
}

/**
 * Best-effort insert of an in-app notification.
 *
 * This is deliberately fire-and-forget: notification delivery must NEVER break
 * the request that triggered it. Any failure (DB down, bad env, etc.) is caught
 * and logged, and the function resolves to `null` instead of throwing. Callers
 * should treat this as a side effect outside their critical path — ideally
 * `await`ed but never wrapped in logic that can fail the main operation.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      projectId: input.projectId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl,
    });
  } catch (error) {
    console.error("createNotification failed (non-fatal):", error);
  }
}
