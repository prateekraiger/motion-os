package io.motionos.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;

/**
 * Shared native data and rendering helpers for the home/lock-screen widgets.
 *
 * <p>The WebView's localStorage is not readable from an AppWidgetProvider, so
 * the minimum display data is mirrored into SharedPreferences by
 * {@link MotionWidgetsPlugin} whenever the app's settings change.
 */
public final class MotionWidgetData {

    static final String PREFERENCES = "motion_os_widget_data";
    private static final String KEY_BIRTH_EPOCH = "birth_epoch_ms";
    private static final String KEY_NAME = "name";
    private static final String KEY_H24 = "h24";
    private static final String KEY_THEME = "theme";
    private static final String KEY_LIFE_EXPECTANCY = "life_expectancy";

    /** Our own inexact midnight alarm; flips the day counters on time. */
    static final String ACTION_DAY_ROLL = "io.motionos.app.ACTION_WIDGET_DAY_ROLL";

    private static final long SECOND_MS = 1_000L;
    private static final long MINUTE_MS = 60 * SECOND_MS;
    private static final long HOUR_MS = 60 * MINUTE_MS;
    private static final long DAY_MS = 24 * HOUR_MS;

    /** Dots in the shared rail (see res/layout/widget_rail.xml). */
    static final int RAIL_DOTS = 12;
    private static final int[] RAIL_IDS = {
        R.id.rail_0, R.id.rail_1, R.id.rail_2, R.id.rail_3,
        R.id.rail_4, R.id.rail_5, R.id.rail_6, R.id.rail_7,
        R.id.rail_8, R.id.rail_9, R.id.rail_10, R.id.rail_11,
    };

    private MotionWidgetData() {}

    static void save(Context context, long birthEpochMs, String name, boolean h24, String theme, int lifeExpectancy) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .edit()
                .putLong(KEY_BIRTH_EPOCH, Math.max(0L, birthEpochMs))
                .putString(KEY_NAME, name == null ? "" : name.trim())
                .putBoolean(KEY_H24, h24)
                .putString(KEY_THEME, theme == null || theme.isEmpty() ? MotionWidgetTheme.SYSTEM : theme)
                .putInt(KEY_LIFE_EXPECTANCY, Math.max(0, lifeExpectancy))
                .apply();
    }

    static long birthEpochMs(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getLong(KEY_BIRTH_EPOCH, 0L);
    }

    static String name(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString(KEY_NAME, "");
    }

    static boolean isTwentyFourHour(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getBoolean(KEY_H24, true);
    }

    static String widgetTheme(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .getString(KEY_THEME, MotionWidgetTheme.SYSTEM);
    }

    static int lifeExpectancy(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getInt(KEY_LIFE_EXPECTANCY, 0);
    }

    static void refreshAll(Context context) {
        AgeWidgetProvider.refresh(context);
        YearWidgetProvider.refresh(context);
    }

    static void attachOpenAction(Context context, RemoteViews views, int rootId, int requestCode) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) return;
        launch.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pendingIntent = PendingIntent.getActivity(context, requestCode, launch, flags);
        views.setOnClickPendingIntent(rootId, pendingIntent);
    }

    /**
     * Schedules one inexact alarm for the next midnight so day-based counters
     * roll over promptly instead of waiting for the 30 minute update cycle.
     * No special permission is required for inexact alarms.
     */
    static void scheduleDayRoll(Context context, int requestCode) {
        Calendar next = Calendar.getInstance();
        next.add(Calendar.DAY_OF_YEAR, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 5);
        next.set(Calendar.MILLISECOND, 0);

        Intent intent = new Intent(ACTION_DAY_ROLL).setPackage(context.getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pending = PendingIntent.getBroadcast(context, requestCode, intent, flags);

        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) alarms.set(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
    }

    /**
     * Base for a live {@link android.widget.Chronometer}: the start of the
     * current day of life, so the widget ticks through the hours, minutes and
     * seconds lived *today* — exactly what the in-app life clock shows.
     */
    static long chronometerBase(long dayRemainderMs) {
        return SystemClock.elapsedRealtime() - Math.max(0L, dayRemainderMs);
    }

    /**
     * Paints the shared twelve-dot rail: completed units in the text colour,
     * the unit in motion in the signal colour, the rest on the hairline.
     */
    static void applyRail(RemoteViews views, MotionWidgetTheme theme, int filled, int total) {
        int count = Math.min(RAIL_DOTS, Math.max(0, total));
        int done = Math.min(count, Math.max(0, filled));
        for (int i = 0; i < RAIL_IDS.length; i++) {
            if (i >= count) {
                views.setViewVisibility(RAIL_IDS[i], View.INVISIBLE);
                continue;
            }
            views.setViewVisibility(RAIL_IDS[i], View.VISIBLE);
            views.setImageViewResource(RAIL_IDS[i], i < done ? theme.dotOnRes : (i == done ? theme.dotNowRes : theme.dotOffRes));
        }
    }

    static Calendar calendarAt(Calendar template, int year, int month, int day) {
        Calendar result = new GregorianCalendar(template.getTimeZone());
        result.clear();
        result.set(Calendar.YEAR, year);
        result.set(Calendar.MONTH, month);
        result.set(Calendar.DAY_OF_MONTH, 1);
        result.set(Calendar.HOUR_OF_DAY, template.get(Calendar.HOUR_OF_DAY));
        result.set(Calendar.MINUTE, template.get(Calendar.MINUTE));
        result.set(Calendar.SECOND, template.get(Calendar.SECOND));
        result.set(Calendar.MILLISECOND, template.get(Calendar.MILLISECOND));
        result.set(Calendar.DAY_OF_MONTH, Math.min(day, result.getActualMaximum(Calendar.DAY_OF_MONTH)));
        return result;
    }

    static Calendar anniversary(Calendar birth, int year) {
        return calendarAt(birth, year, birth.get(Calendar.MONTH), birth.get(Calendar.DAY_OF_MONTH));
    }

    static Calendar addMonthsClamped(Calendar base, int months) {
        int total = base.get(Calendar.MONTH) + months;
        int year = base.get(Calendar.YEAR) + Math.floorDiv(total, 12);
        int month = Math.floorMod(total, 12);
        return calendarAt(base, year, month, base.get(Calendar.DAY_OF_MONTH));
    }

    static AgeParts ageAt(long birthEpochMs, long nowEpochMs) {
        if (birthEpochMs <= 0L || birthEpochMs > nowEpochMs) return null;

        Calendar birth = Calendar.getInstance();
        birth.setTimeInMillis(birthEpochMs);
        Calendar now = Calendar.getInstance();
        now.setTimeInMillis(nowEpochMs);

        int years = now.get(Calendar.YEAR) - birth.get(Calendar.YEAR);
        Calendar cursor = anniversary(birth, birth.get(Calendar.YEAR) + years);
        if (cursor.after(now)) {
            years -= 1;
            cursor = anniversary(birth, birth.get(Calendar.YEAR) + years);
        }
        years = Math.max(0, years);

        int months = 0;
        for (int i = 1; i <= 12; i++) {
            Calendar next = addMonthsClamped(cursor, i);
            if (next.after(now)) break;
            months = i;
        }
        cursor = addMonthsClamped(cursor, months);

        int days = 0;
        Calendar dayCursor = (Calendar) cursor.clone();
        while (true) {
            Calendar nextDay = (Calendar) dayCursor.clone();
            nextDay.add(Calendar.DAY_OF_MONTH, 1);
            if (nextDay.after(now)) break;
            days += 1;
            dayCursor = nextDay;
            // A month can never contain more than 31 whole calendar days.
            if (days > 31) break;
        }

        long remainder = Math.max(0L, nowEpochMs - dayCursor.getTimeInMillis());
        int hours = (int) ((remainder % DAY_MS) / HOUR_MS);
        int minutes = (int) ((remainder % HOUR_MS) / MINUTE_MS);
        int seconds = (int) ((remainder % MINUTE_MS) / SECOND_MS);
        return new AgeParts(years, months, days, hours, minutes, seconds, remainder);
    }

    static int daysInYear(int year) {
        return new GregorianCalendar().isLeapYear(year) ? 366 : 365;
    }

    static double yearFraction(Calendar now) {
        Calendar start = (Calendar) now.clone();
        start.set(Calendar.MONTH, Calendar.JANUARY);
        start.set(Calendar.DAY_OF_MONTH, 1);
        start.set(Calendar.HOUR_OF_DAY, 0);
        start.set(Calendar.MINUTE, 0);
        start.set(Calendar.SECOND, 0);
        start.set(Calendar.MILLISECOND, 0);

        Calendar end = (Calendar) start.clone();
        end.add(Calendar.YEAR, 1);
        return Math.max(0d, Math.min(1d, (now.getTimeInMillis() - start.getTimeInMillis()) / (double) (end.getTimeInMillis() - start.getTimeInMillis())));
    }

    static int quarter(Calendar now) {
        return now.get(Calendar.MONTH) / 3 + 1;
    }

    static int weekOfYear(Calendar now) {
        return Math.max(1, now.get(Calendar.WEEK_OF_YEAR));
    }

    static String formatPercent(double fraction) {
        return String.format(Locale.US, "%.2f%%", fraction * 100d);
    }

    static String formatAgeDetails(AgeParts age) {
        return String.format(Locale.US, "%02d MONTHS  •  %02d DAYS", age.months, age.days);
    }

    static final class AgeParts {
        final int years;
        final int months;
        final int days;
        final int hours;
        final int minutes;
        final int seconds;
        /** Milliseconds lived since the start of the current day of life. */
        final long dayRemainderMs;

        AgeParts(int years, int months, int days, int hours, int minutes, int seconds, long dayRemainderMs) {
            this.years = years;
            this.months = months;
            this.days = days;
            this.hours = hours;
            this.minutes = minutes;
            this.seconds = seconds;
            this.dayRemainderMs = dayRemainderMs;
        }
    }
}
