package io.motionos.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;

/**
 * Handles the action buttons on focus and reminder notifications.
 *
 * Every action is queued for the web layer (which owns task and timer state)
 * and, where it can be answered natively, answered immediately: snoozing a
 * reminder rebooks the alarm, and "complete" opens the app so the user lands
 * back on the task they just finished.
 */
public class NotificationActionReceiver extends BroadcastReceiver {

    public static final String ACTION_FOCUS = "io.motionos.app.ACTION_FOCUS_NOTIFICATION";
    public static final String ACTION_REMINDER = "io.motionos.app.ACTION_REMINDER_NOTIFICATION";
    public static final String ACTION_REMINDER_COMPLETE = "io.motionos.app.ACTION_REMINDER_COMPLETE";
    public static final String ACTION_REMINDER_SNOOZE = "io.motionos.app.ACTION_REMINDER_SNOOZE";

    public static final String EXTRA_KIND = "kind";
    public static final String EXTRA_ID = "id";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_BODY = "body";
    public static final String EXTRA_AT = "at";

    private static final long SNOOZE_MS = 10 * 60 * 1000L;
    private static final int FOCUS_NOTIFICATION_ID = 4300;
    private static final int REQUEST_REMINDER_ACTIONS = 4360;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (action == null) return;
        String id = intent.getStringExtra(EXTRA_ID);
        long at = System.currentTimeMillis();

        switch (action) {
            case ACTION_FOCUS: {
                String kind = intent.getStringExtra(EXTRA_KIND);
                if (kind == null) return;
                JSObject payload = new JSObject();
                payload.put("kind", kind);
                payload.put("taskId", (String) null);
                payload.put("at", at);
                MotionBus.postAction(context, "focusAction", payload);
                if ("complete".equals(kind)) {
                    cancel(context, FOCUS_NOTIFICATION_ID);
                    launchApp(context, null);
                }
                break;
            }
            case ACTION_REMINDER: {
                if (id == null) return;
                showReminder(context, intent);
                JSObject payload = new JSObject();
                payload.put("kind", "open");
                payload.put("taskId", id);
                payload.put("at", at);
                MotionBus.postAction(context, "reminderAction", payload);
                break;
            }
            case ACTION_REMINDER_COMPLETE: {
                if (id == null) return;
                cancel(context, notificationId(id));
                JSObject payload = new JSObject();
                payload.put("kind", "complete");
                payload.put("taskId", id);
                payload.put("at", at);
                MotionBus.postAction(context, "reminderAction", payload);
                launchApp(context, id);
                break;
            }
            case ACTION_REMINDER_SNOOZE: {
                if (id == null) return;
                cancel(context, notificationId(id));
                // Rebook natively so the nudge still arrives with the app closed.
                reschedule(context, intent, at + SNOOZE_MS);
                JSObject payload = new JSObject();
                payload.put("kind", "snooze");
                payload.put("taskId", id);
                payload.put("at", at);
                MotionBus.postAction(context, "reminderAction", payload);
                break;
            }
            default:
                break;
        }
    }

    private void reschedule(Context context, Intent source, long when) {
        String id = source.getStringExtra(EXTRA_ID);
        if (id == null) return;
        Intent intent = new Intent(context, NotificationActionReceiver.class);
        intent.setAction(ACTION_REMINDER);
        intent.putExtra(EXTRA_ID, id);
        intent.putExtra(EXTRA_TITLE, source.getStringExtra(EXTRA_TITLE));
        intent.putExtra(EXTRA_BODY, source.getStringExtra(EXTRA_BODY));
        intent.putExtra(EXTRA_AT, when);

        PendingIntent pending = PendingIntent.getBroadcast(
                context, reminderRequestCode(id), intent, PendingIntent.FLAG_UPDATE_CURRENT | immutable());
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarms.canScheduleExactAlarms()) {
            alarms.setWindow(AlarmManager.RTC_WAKEUP, when, 60_000L, pending);
        } else {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pending);
        }
    }

    private void showReminder(Context context, Intent source) {
        // The alarm can fire before the app has ever created its channels.
        MotionNotificationsPlugin.ensureChannels(context);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        String id = source.getStringExtra(EXTRA_ID);
        String title = source.getStringExtra(EXTRA_TITLE);
        String body = source.getStringExtra(EXTRA_BODY);

        android.app.Notification notification =
                new androidx.core.app.NotificationCompat.Builder(context, "motion_reminders")
                        .setSmallIcon(R.drawable.ic_stat_motion)
                        .setContentTitle(title == null || title.isEmpty() ? "Motion OS" : title)
                        .setContentText(body == null || body.isEmpty() ? "A task reminder is due." : body)
                        .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(
                                body == null || body.isEmpty() ? "A task reminder is due." : body))
                        .setAutoCancel(true)
                        .setCategory(androidx.core.app.NotificationCompat.CATEGORY_REMINDER)
                        .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PRIVATE)
                        .setContentIntent(openApp(context, id))
                        .addAction(0, "Complete", reminderAction(context, ACTION_REMINDER_COMPLETE, id, REQUEST_REMINDER_ACTIONS + 1))
                        .addAction(0, "Snooze 10m", reminderAction(context, ACTION_REMINDER_SNOOZE, id, REQUEST_REMINDER_ACTIONS + 2))
                        .build();
        try {
            manager.notify(notificationId(id), notification);
        } catch (SecurityException ignored) {
            // Permission not granted: the in-app banner still fires.
        }
    }

    private PendingIntent reminderAction(Context context, String action, String id, int requestCode) {
        Intent intent = new Intent(context, NotificationActionReceiver.class);
        intent.setAction(action);
        intent.putExtra(EXTRA_ID, id);
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | immutable());
    }

    private PendingIntent openApp(Context context, String id) {
        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (id != null) launch.putExtra(EXTRA_ID, id);
        return PendingIntent.getActivity(context, REQUEST_REMINDER_ACTIONS + 3, launch, PendingIntent.FLAG_UPDATE_CURRENT | immutable());
    }

    private void launchApp(Context context, String id) {
        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (id != null) launch.putExtra(EXTRA_ID, id);
        try {
            context.startActivity(launch);
        } catch (Exception ignored) {
            // Background activity launch restrictions: the queued action still applies.
        }
    }

    private void cancel(Context context, int id) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null) manager.cancel(id);
    }

    private static int immutable() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    private static int reminderRequestCode(String id) {
        return 4400 + Math.abs(id.hashCode() % 400);
    }

    private static int notificationId(String id) {
        return 4800 + Math.abs(id.hashCode() % 400);
    }
}
