import type { Task } from "../lib/types";
import { ClockIcon, XIcon } from "./icons";

/**
 * In-app reminder banner. Rendered by the app shell so it appears over any
 * view; auto-dismisses (handled by useReminders) or on user action.
 */
export default function ReminderToast({
  task,
  onView,
  onDismiss,
}: {
  task: Task;
  onView: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-safe">
      <div
        role="alert"
        className="pointer-events-auto mt-3 flex w-full max-w-[400px] items-center gap-3 rounded-[20px] border border-nred/40 bg-card-2/95 px-4 py-3 shadow-[0_10px_40px_var(--color-shadow)] backdrop-blur-xl animate-fade-down"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-nred/40 bg-nred/10 text-nred">
          <ClockIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="label text-nred">Reminder</div>
          <div className="truncate text-[14px] text-paper">{task.title}</div>
        </div>
        <button
          type="button"
          onClick={onView}
          className="rounded-full border border-paper/[0.15] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper transition-colors hover:bg-paper/[0.08]"
        >
          View
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss reminder"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mute transition-colors hover:bg-paper/[0.06] hover:text-paper"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
