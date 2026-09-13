package io.motionos.app;

import android.annotation.TargetApi;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.SizeF;
import android.view.View;
import android.widget.RemoteViews;
import io.motionos.app.MotionWidgetSize.Bucket;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Native "Age in motion" widget.
 *
 * <p>One layout per size bucket (single column, strip, 2x2, 4x2, 4x4) in the
 * app's dot-matrix voice. On Android 12+ the launcher picks the closest layout
 * from a size map, so resizing never wakes the app; older versions re-render
 * when the host reports new options. The same widget is offered to lock-screen
 * hosts through the provider's keyguard category.
 */
public class AgeWidgetProvider extends AppWidgetProvider {

    private static final int OPEN_REQUEST_CODE = 4101;
    private static final int DAY_ROLL_REQUEST_CODE = 4301;

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, AgeWidgetProvider.class));
        if (ids.length == 0) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            manager.updateAppWidget(ids, sizedViews(context));
        } else {
            for (int id : ids) {
                Bucket bucket = MotionWidgetSize.fromOptions(manager.getAppWidgetOptions(id), Bucket.SMALL);
                manager.updateAppWidget(id, render(context, bucket));
            }
        }
        MotionWidgetData.scheduleDayRoll(context, DAY_ROLL_REQUEST_CODE);
    }

    /**
     * Every supported footprint up front; the launcher inflates the one that
     * fits each instance and swaps automatically when the widget is resized.
     */
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
        theme.applyBackground(views, R.id.age_widget_root);
        MotionWidgetData.attachOpenAction(context, views, R.id.age_widget_root, OPEN_REQUEST_CODE);
        views.setImageViewResource(R.id.age_widget_dot, theme.dotNowRes);

        long now = System.currentTimeMillis();
        MotionWidgetData.AgeParts age = MotionWidgetData.ageAt(MotionWidgetData.birthEpochMs(context), now);
        String storedName = MotionWidgetData.name(context);
        String title = storedName.isEmpty() ? "AGE IN MOTION" : storedName.toUpperCase(Locale.US);

        switch (bucket) {
            case MICRO:
                views.setTextViewText(R.id.age_widget_years, age == null ? "—" : String.valueOf(age.years));
                views.setTextColor(R.id.age_widget_years, theme.text);
                views.setTextColor(R.id.age_widget_unit, theme.muted);
                break;

            case STRIP:
                views.setTextViewText(R.id.age_widget_years, age == null ? "—" : String.valueOf(age.years));
                views.setTextColor(R.id.age_widget_years, theme.text);
                views.setTextColor(R.id.age_widget_unit, theme.muted);
                paintLiveSeconds(views, theme, age);
                break;

            case LARGE: {
                int expectancy = MotionWidgetData.lifeExpectancy(context);
                if (age == null || expectancy <= 0) {
                    views.setViewVisibility(R.id.age_widget_life, View.GONE);
                } else {
                    int livedPercent = Math.min(100, (int) Math.round(age.years * 100d / expectancy));
                    int ahead = Math.max(0, expectancy - age.years);
                    views.setViewVisibility(R.id.age_widget_life, View.VISIBLE);
                    views.setTextViewText(
                            R.id.age_widget_life,
                            String.format(Locale.US, "LIFE %d%%  •  %d YEARS AHEAD", livedPercent, ahead));
                    views.setTextColor(R.id.age_widget_life, theme.muted);
                }
                views.setTextColor(R.id.age_widget_rail_label, theme.muted);
                // fall through: the large panel shares the card skeleton
            }
            case WIDE:
            case SMALL:
            default:
                views.setTextViewText(R.id.age_widget_label, title);
                views.setTextColor(R.id.age_widget_label, theme.muted);
                views.setTextViewText(R.id.age_widget_years, age == null ? "—" : String.valueOf(age.years));
                views.setTextColor(R.id.age_widget_years, theme.text);
                views.setTextColor(R.id.age_widget_unit, theme.muted);
                views.setTextViewText(
                        R.id.age_widget_details,
                        age == null ? "Open the app to start" : MotionWidgetData.formatAgeDetails(age));
                views.setTextColor(R.id.age_widget_details, theme.muted);
                paintLiveSeconds(views, theme, age);
                MotionWidgetData.applyRail(
                        views, theme, age == null ? 0 : age.months, MotionWidgetData.RAIL_DOTS);
                break;
        }
        return views;
    }

    private static void paintLiveSeconds(RemoteViews views, MotionWidgetTheme theme, MotionWidgetData.AgeParts age) {
        if (age == null) {
            views.setViewVisibility(R.id.age_widget_elapsed, View.GONE);
            return;
        }
        views.setViewVisibility(R.id.age_widget_elapsed, View.VISIBLE);
        views.setChronometer(
                R.id.age_widget_elapsed,
                MotionWidgetData.chronometerBase(age.dayRemainderMs),
                "%s",
                true);
        views.setTextColor(R.id.age_widget_elapsed, theme.text);
    }

    private static int layoutFor(Bucket bucket) {
        switch (bucket) {
            case MICRO:
                return R.layout.widget_age_micro;
            case STRIP:
                return R.layout.widget_age_strip;
            case WIDE:
                return R.layout.widget_age_wide;
            case LARGE:
                return R.layout.widget_age_large;
            case SMALL:
            default:
                return R.layout.widget_age_small;
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
