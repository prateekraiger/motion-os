package io.motionos.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Interactive notifications for focus blocks and task reminders.
 *
 * The focus notification is ongoing and carries action buttons (complete,
 * +5 minutes, skip), so a block can be managed from the shade without opening
 * the app. Reminders are booked with the {@link AlarmManager} so they fire even
 * when Motion OS is closed, and their actions are queued for the web layer.
 */
@CapacitorPlugin(
        name = "MotionNotifications",
        permissions = {
            @Permission(
                    strings = {android.Manifest.permission.POST_NOTIFICATIONS},
                    alias = MotionNotificationsPlugin.ALIAS_NOTIFICATIONS)
        })
public class MotionNotificationsPlugin extends Plugin {

    static final String ALIAS_NOTIFICATIONS = "notifications";

    private static final String CHANNEL_FOCUS = "motion_focus";
    private static final String CHANNEL_REMINDERS = "motion_reminders";
    private static final int FOCUS_NOTIFICATION_ID = 4300;
    private static final int FOCUS_ACTION_BASE = 4310;
    private static final int REMINDER_ACTION_BASE = 4330;

    @Override
    public void load() {
        ensureChannels(getContext());
        MotionBus.registerActions(this);
        super.load();
    }

    /**
     * Channels must exist before anything posts, including the notification
     * action receiver firing while the app has never been opened.
     */
    public static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel focus = new NotificationChannel(
                CHANNEL_FOCUS, "Focus block", NotificationManager.IMPORTANCE_LOW);
        focus.setDescription("Live progress of the current focus block");
        focus.setShowBadge(false);
        manager.createNotificationChannel(focus);

        NotificationChannel reminders = new NotificationChannel(
                CHANNEL_REMINDERS, "Task reminders", NotificationManager.IMPORTANCE_HIGH);
        reminders.setDescription("Reminders you scheduled on a task");
        manager.createNotificationChannel(reminders);
    }

    @Override
    protected void handleOnDestroy() {
        MotionBus.unregister(this);
        super.handleOnDestroy();
    }

    /* ---------------------------- Permissions -------------------------- */

    private boolean granted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true;
        return ContextCompat.checkSelfPermission(getContext(), android.Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void permissionState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("state", granted() ? "granted" : Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ? "granted" : "prompt");
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (granted()) {
            JSObject result = new JSObject();
            result.put("state", "granted");
            call.resolve(result);
            return;
        }
        requestPermissionForAlias(ALIAS_NOTIFICATIONS, call, "notificationsPermissionCallback");
    }

    @PermissionCallback
    private void notificationsPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("state", granted() ? "granted" : "denied");
        call.resolve(result);
    }

    /* --------------------------- Focus block --------------------------- */

    @PluginMethod
    public void showFocus(PluginCall call) {
        if (!granted()) {
            call.resolve();
            return;
        }
        String title = call.getString("title", "Focus in motion");
        String body = call.getString("body", "");
        Double endsAt = call.getDouble("endsAt", 0d);
        boolean ongoing = Boolean.TRUE.equals(call.getBoolean("ongoing", true));

        NotificationCompat.Builder builder = baseBuilder(CHANNEL_FOCUS)
                .setContentTitle(title)
                .setContentText(body)
                .setOngoing(ongoing)
                .setOnlyAlertOnce(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true);

        if (endsAt != null && endsAt > 0) {
            builder.setWhen(endsAt.longValue());
            builder.setShowWhen(true);
        }

        builder.addAction(0, "Complete", focusAction("complete", FOCUS_ACTION_BASE + 1));
        builder.addAction(0, "+5 min", focusAction("add5", FOCUS_ACTION_BASE + 2));
        builder.addAction(0, "Skip", focusAction("skip", FOCUS_ACTION_BASE + 3));

        try {
            NotificationManagerCompat.from(getContext()).notify(FOCUS_NOTIFICATION_ID, builder.build());
        } catch (SecurityException ignored) {
            // Permission revoked between the check and the post.
        }
        call.resolve();
    }

    @PluginMethod
    public void updateFocus(PluginCall call) {
        String body = call.getString("body", "");
        Double endsAt = call.getDouble("endsAt", 0d);
        NotificationCompat.Builder builder = baseBuilder(CHANNEL_FOCUS)
                .setContentTitle("Focus in motion")
                .setContentText(body)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true);
        if (endsAt != null && endsAt > 0) builder.setWhen(endsAt.longValue());
        builder.addAction(0, "Complete", focusAction("complete", FOCUS_ACTION_BASE + 1));
        builder.addAction(0, "+5 min", focusAction("add5", FOCUS_ACTION_BASE + 2));
        builder.addAction(0, "Skip", focusAction("skip", FOCUS_ACTION_BASE + 3));
        try {
            NotificationManagerCompat.from(getContext()).notify(FOCUS_NOTIFICATION_ID, builder.build());
        } catch (SecurityException ignored) {
            // Ignored.
        }
        call.resolve();
    }

    @PluginMethod
    public void hideFocus(PluginCall call) {
        NotificationManagerCompat.from(getContext()).cancel(FOCUS_NOTIFICATION_ID);
        call.resolve();
    }

    @PluginMethod
    public void notify(PluginCall call) {
        if (!granted()) {
            call.resolve();
            return;
        }
        String title = call.getString("title", "Motion OS");
        String body = call.getString("body", "");
        NotificationCompat.Builder builder = baseBuilder(CHANNEL_REMINDERS)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true);
        try {
            NotificationManagerCompat.from(getContext())
                    .notify((int) System.currentTimeMillis(), builder.build());
        } catch (SecurityException ignored) {
            // Ignored.
        }
        call.resolve();
    }

    /* ---------------------------- Reminders ---------------------------- */

    @PluginMethod
    public void scheduleReminder(PluginCall call) {
        String id = call.getString("id", null);
        String title = call.getString("title", "Reminder");
        String body = call.getString("body", "");
        Double at = call.getDouble("at", 0d);
        if (id == null || at == null || at <= 0) {
            call.reject("An id and a moment are required.");
            return;
        }

        Intent intent = new Intent(getContext(), NotificationActionReceiver.class);
        intent.setAction(NotificationActionReceiver.ACTION_REMINDER);
        intent.putExtra(NotificationActionReceiver.EXTRA_ID, id);
        intent.putExtra(NotificationActionReceiver.EXTRA_TITLE, title);
        intent.putExtra(NotificationActionReceiver.EXTRA_BODY, body);
        intent.putExtra(NotificationActionReceiver.EXTRA_AT, (long) at);

        PendingIntent pending = PendingIntent.getBroadcast(
                getContext(), reminderRequestCode(id), intent, PendingIntent.FLAG_UPDATE_CURRENT | immutable());

        AlarmManager alarms = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) {
            call.reject("No alarm service.");
            return;
        }
        long when = at.longValue();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarms.canScheduleExactAlarms()) {
            // Without exact-alarm access an inexact alarm is still reliable to
            // within a few minutes, which is fine for a nudge.
            alarms.setWindow(AlarmManager.RTC_WAKEUP, when, 60_000L, pending);
        } else {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pending);
        }
        call.resolve();
    }

    @PluginMethod
    public void cancelReminder(PluginCall call) {
        String id = call.getString("id", null);
        if (id == null) {
            call.reject("An id is required.");
            return;
        }
        AlarmManager alarms = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) {
            Intent intent = new Intent(getContext(), NotificationActionReceiver.class);
            intent.setAction(NotificationActionReceiver.ACTION_REMINDER);
            PendingIntent pending = PendingIntent.getBroadcast(
                    getContext(),
                    reminderRequestCode(id),
                    intent,
                    PendingIntent.FLAG_NO_CREATE | immutable());
            if (pending != null) {
                alarms.cancel(pending);
                pending.cancel();
            }
        }
        NotificationManagerCompat.from(getContext()).cancel(reminderRequestCode(id));
        call.resolve();
    }

    @PluginMethod
    public void drainActions(PluginCall call) {
        JSArray actions = MotionBus.drainActions(getContext());
        JSObject result = new JSObject();
        result.put("actions", actions);
        call.resolve(result);
    }

    /* ----------------------------- Helpers ----------------------------- */

    private NotificationCompat.Builder baseBuilder(String channel) {
        return new NotificationCompat.Builder(getContext(), channel)
                .setSmallIcon(R.drawable.ic_stat_motion)
                .setColor(ContextCompat.getColor(getContext(), R.color.nred))
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setLocalOnly(true);
    }

    private PendingIntent focusAction(String kind, int requestCode) {
        Intent intent = new Intent(getContext(), NotificationActionReceiver.class);
        intent.setAction(NotificationActionReceiver.ACTION_FOCUS);
        intent.putExtra(NotificationActionReceiver.EXTRA_KIND, kind);
        return PendingIntent.getBroadcast(
                getContext(), requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | immutable());
    }

    private static int immutable() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    private static int reminderRequestCode(String id) {
        return REMINDER_ACTION_BASE + Math.abs(id.hashCode() % 500);
    }
}
