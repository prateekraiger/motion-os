package io.motionos.app;

import android.Manifest;
import android.content.ContentUris;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import android.text.format.DateUtils;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;

/**
 * Read-only calendar overlay.
 *
 * Queries the system calendar for the events of one local day so the Today
 * dashboard and the day planner can show what is already booked. Nothing is
 * written back, nothing is cached, and the permission is only requested when
 * the user turns the overlay on.
 */
@CapacitorPlugin(
        name = "MotionCalendar",
        permissions = {
            @Permission(
                    strings = {Manifest.permission.READ_CALENDAR},
                    alias = MotionCalendarPlugin.ALIAS_CALENDAR)
        })
public class MotionCalendarPlugin extends Plugin {

    static final String ALIAS_CALENDAR = "calendar";

    private boolean granted() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR)
                == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void permissionState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("state", granted() ? "granted" : "prompt");
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
        requestPermissionForAlias(ALIAS_CALENDAR, call, "calendarPermissionCallback");
    }

    @PermissionCallback
    private void calendarPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("state", granted() ? "granted" : "denied");
        call.resolve(result);
    }

    @PluginMethod
    public void eventsForDay(PluginCall call) {
        if (!granted()) {
            call.reject("Calendar permission not granted.");
            return;
        }
        String dayKey = call.getString("dayKey", null);
        if (dayKey == null || !dayKey.matches("\\d{4}-\\d{2}-\\d{2}")) {
            call.reject("A day key (YYYY-MM-DD) is required.");
            return;
        }

        long[] bounds = dayBounds(dayKey);
        List<JSObject> events = queryEvents(bounds[0], bounds[1]);

        JSObject result = new JSObject();
        result.put("events", new JSArray(events.toArray(new JSObject[0])));
        call.resolve(result);
    }

    /** Local midnight-to-midnight bounds for a day key. */
    private long[] dayBounds(String dayKey) {
        String[] parts = dayKey.split("-");
        java.util.Calendar start = java.util.Calendar.getInstance();
        start.set(
                Integer.parseInt(parts[0]),
                Integer.parseInt(parts[1]) - 1,
                Integer.parseInt(parts[2]),
                0,
                0,
                0);
        start.set(java.util.Calendar.MILLISECOND, 0);
        long from = start.getTimeInMillis();
        long to = from + DateUtils.DAY_IN_MILLIS;
        return new long[] {from, to};
    }

    private List<JSObject> queryEvents(long fromMs, long toMs) {
        List<JSObject> out = new ArrayList<>();
        Uri.Builder builder = CalendarContract.Instances.CONTENT_URI.buildUpon();
        ContentUris.appendId(builder, fromMs);
        ContentUris.appendId(builder, toMs);
        Uri uri = builder.build();

        String[] projection = {
            CalendarContract.Instances.EVENT_ID,
            CalendarContract.Instances.TITLE,
            CalendarContract.Instances.BEGIN,
            CalendarContract.Instances.END,
            CalendarContract.Instances.ALL_DAY,
            CalendarContract.Instances.DISPLAY_COLOR,
            CalendarContract.Instances.CALENDAR_DISPLAY_NAME,
        };

        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, null, null,
                CalendarContract.Instances.BEGIN + " ASC")) {
            if (cursor == null) return out;
            int idColumn = cursor.getColumnIndexOrThrow(CalendarContract.Instances.EVENT_ID);
            int titleColumn = cursor.getColumnIndexOrThrow(CalendarContract.Instances.TITLE);
            int beginColumn = cursor.getColumnIndexOrThrow(CalendarContract.Instances.BEGIN);
            int endColumn = cursor.getColumnIndexOrThrow(CalendarContract.Instances.END);
            int allDayColumn = cursor.getColumnIndexOrThrow(CalendarContract.Instances.ALL_DAY);
            int colorColumn = cursor.getColumnIndexOrThrow(CalendarContract.Instances.DISPLAY_COLOR);
            int calendarColumn = cursor.getColumnIndexOrThrow(CalendarContract.Instances.CALENDAR_DISPLAY_NAME);

            int guard = 0;
            while (cursor.moveToNext() && guard++ < 200) {
                long id = cursor.getLong(idColumn);
                long begin = cursor.getLong(beginColumn);
                long end = cursor.getLong(endColumn);
                boolean allDay = cursor.getInt(allDayColumn) != 0;
                String title = cursor.getString(titleColumn);
                int color = cursor.getInt(colorColumn);
                String calendar = cursor.getString(calendarColumn);

                JSObject event = new JSObject();
                event.put("id", String.valueOf(id));
                event.put("title", title == null || title.isEmpty() ? "Busy" : title);
                event.put("startMs", begin);
                event.put("endMs", Math.max(end, begin + 15 * 60 * 1000L));
                event.put("allDay", allDay);
                event.put("color", color == 0 ? null : colorHex(color));
                event.put("calendarName", calendar);
                out.add(event);
            }
        } catch (Exception ignored) {
            // Provider hiccups (some OEM calendars) must not break the app.
        }
        return out;
    }

    private static String colorHex(int color) {
        return String.format("#%06X", 0xFFFFFF & color);
    }
}
