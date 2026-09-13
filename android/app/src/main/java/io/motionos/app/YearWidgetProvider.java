package io.motionos.app;

import android.annotation.TargetApi;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.SizeF;
import android.widget.RemoteViews;
import io.motionos.app.MotionWidgetSize.Bucket;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Native "Year in motion" widget.
 *
 * <p>Same responsive family as the life clock: single column, strip, 2x2, 4x2
 * and 4x4. The local clock is a {@link android.widget.TextClock}, so it keeps
 * ticking inside the launcher without waking the app, and follows the saved
 * 12/24 hour preference through its format strings.
 */
public class YearWidgetProvider extends AppWidgetProvider {

    private static final int OPEN_REQUEST_CODE = 4102;
    private static final int DAY_ROLL_REQUEST_CODE = 4302;

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, YearWidgetProvider.class));
        if (ids.length == 0) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            manager.updateAppWidget(ids, sizedViews(context));
        } else {
            for (int id : ids) {
                Bucket bucket = MotionWidgetSize.fromOptions(manager.getAppWidgetOptions(id), Bucket.WIDE);
                manager.updateAppWidget(id, render(context, bucket));
            }
        }
        MotionWidgetData.scheduleDayRoll(context, DAY_ROLL_REQUEST_CODE);
    }

    @TargetApi(Build.VERSION_CODES.S)
    private static RemoteViews sizedViews(Context context) {
        Map<SizeF, RemoteViews> mapping = new HashMap<>();
        for (Bucket bucket : Bucket.values()) {
            mapping.put(new SizeF(bucket.keyWidth(), bucket.keyHeight()), render(context, bucket));
        }
        return new RemoteViews(mapping);
    }

    private static RemoteViews render(Context context, Bucket bucket) {
        MotionWidgetTheme theme = MotionWidgetTheme.resolve(context);
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutFor(bucket));
        theme.applyBackground(views, R.id.year_widget_root);
        MotionWidgetData.attachOpenAction(context, views, R.id.year_widget_root, OPEN_REQUEST_CODE);
        views.setImageViewResource(R.id.year_widget_dot, theme.dotNowRes);

        Calendar now = Calendar.getInstance();
        double fraction = MotionWidgetData.yearFraction(now);
        int year = now.get(Calendar.YEAR);
        int dayOfYear = now.get(Calendar.DAY_OF_YEAR);
        int totalDays = MotionWidgetData.daysInYear(year);
        String details = String.format(
                Locale.US, "DAY %d OF %d  •  %d LEFT", dayOfYear, totalDays, totalDays - dayOfYear);
        String quarters = String.format(
                Locale.US, "Q%d  •  WEEK %02d", MotionWidgetData.quarter(now), MotionWidgetData.weekOfYear(now));
        int monthsDone = Math.min(MotionWidgetData.RAIL_DOTS, (int) Math.floor(fraction * MotionWidgetData.RAIL_DOTS));

        switch (bucket) {
            case MICRO:
                views.setTextViewText(R.id.year_widget_percent, String.format(Locale.US, "%.0f%%", fraction * 100d));
                views.setTextColor(R.id.year_widget_percent, theme.text);
                views.setTextViewText(R.id.year_widget_year, String.valueOf(year));
                views.setTextColor(R.id.year_widget_year, theme.muted);
                break;

            case STRIP:
                views.setTextViewText(R.id.year_widget_year, String.valueOf(year));
                views.setTextColor(R.id.year_widget_year, theme.text);
                views.setTextViewText(R.id.year_widget_percent, MotionWidgetData.formatPercent(fraction));
                views.setTextColor(R.id.year_widget_percent, theme.muted);
                paintClock(context, views, theme);
                break;

            case LARGE:
                views.setTextColor(R.id.year_widget_rail_label, theme.muted);
                // fall through: the large panel shares the card skeleton
            case WIDE:
            case SMALL:
            default:
                views.setTextViewText(R.id.year_widget_label, "YEAR IN MOTION");
                views.setTextColor(R.id.year_widget_label, theme.muted);
                views.setTextViewText(R.id.year_widget_percent, MotionWidgetData.formatPercent(fraction));
                views.setTextColor(R.id.year_widget_percent, theme.text);
                views.setTextViewText(R.id.year_widget_year, String.valueOf(year));
                views.setTextColor(R.id.year_widget_year, theme.text);
                views.setTextViewText(R.id.year_widget_details, details);
                views.setTextColor(R.id.year_widget_details, theme.muted);
                views.setTextViewText(R.id.year_widget_quarters, quarters);
                views.setTextColor(R.id.year_widget_quarters, theme.muted);
                paintClock(context, views, theme);
                MotionWidgetData.applyRail(views, theme, monthsDone, MotionWidgetData.RAIL_DOTS);
                break;
        }
        return views;
    }

    /** Forces the saved 12/24 hour preference onto the self-ticking clock. */
    private static void paintClock(Context context, RemoteViews views, MotionWidgetTheme theme) {
        String format = MotionWidgetData.isTwentyFourHour(context) ? "HH:mm" : "h:mm a";
        views.setCharSequence(R.id.year_widget_clock, "setFormat24Hour", format);
        views.setCharSequence(R.id.year_widget_clock, "setFormat12Hour", format);
        views.setTextColor(R.id.year_widget_clock, theme.text);
    }

    private static int layoutFor(Bucket bucket) {
        switch (bucket) {
            case MICRO:
                return R.layout.widget_year_micro;
            case STRIP:
                return R.layout.widget_year_strip;
            case WIDE:
                return R.layout.widget_year_wide;
            case LARGE:
                return R.layout.widget_year_large;
            case SMALL:
            default:
                return R.layout.widget_year_small;
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        refresh(context);
    }

    @Override
    public void onEnabled(Context context) {
        refresh(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(
            Context context, AppWidgetManager appWidgetManager, int appWidgetId, android.os.Bundle newOptions) {
        refresh(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || Intent.ACTION_LOCALE_CHANGED.equals(action)
                || MotionWidgetData.ACTION_DAY_ROLL.equals(action)) {
            refresh(context);
        }
    }
}
