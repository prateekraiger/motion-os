package io.motionos.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;
import java.util.Calendar;
import java.util.Locale;

/** Native 4 × 2 year progress widget. */
public class YearWidgetProvider extends AppWidgetProvider {

    private static final int PENDING_INTENT_REQUEST_CODE = 4102;

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new android.content.ComponentName(context, YearWidgetProvider.class));
        if (ids.length == 0) return;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_year);
        MotionWidgetData.attachOpenAction(context, views, R.id.year_widget_root, PENDING_INTENT_REQUEST_CODE);

        Calendar now = Calendar.getInstance();
        double fraction = MotionWidgetData.yearFraction(now);
        int year = now.get(Calendar.YEAR);
        int dayOfYear = now.get(Calendar.DAY_OF_YEAR);
        int daysInYear = MotionWidgetData.daysInYear(year);
        int progress = (int) Math.round(fraction * 1000d);

        views.setTextViewText(R.id.year_widget_year, String.valueOf(year));
        views.setTextViewText(R.id.year_widget_percent, MotionWidgetData.formatPercent(fraction));
        views.setTextViewText(
                R.id.year_widget_details,
                String.format(Locale.US, "DAY %d OF %d  •  %d REMAINING", dayOfYear, daysInYear, daysInYear - dayOfYear)
        );
        views.setProgressBar(R.id.year_widget_progress, 1000, progress, false);
        views.setTextViewText(R.id.year_widget_status, "YEAR IN MOTION  •  TAP TO OPEN");
        views.setTextViewText(R.id.year_widget_time, MotionWidgetData.currentTime(context, now));

        manager.updateAppWidget(ids, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        refresh(context);
    }

    @Override
    public void onEnabled(Context context) {
        refresh(context);
    }
}
