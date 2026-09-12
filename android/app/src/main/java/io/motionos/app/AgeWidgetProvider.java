package io.motionos.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

/** Native 2 × 2 life clock widget. */
public class AgeWidgetProvider extends AppWidgetProvider {

    private static final int PENDING_INTENT_REQUEST_CODE = 4101;

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new android.content.ComponentName(context, AgeWidgetProvider.class));
        if (ids.length == 0) return;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_age);
        MotionWidgetData.attachOpenAction(context, views, R.id.age_widget_root, PENDING_INTENT_REQUEST_CODE);

        long birthEpochMs = MotionWidgetData.birthEpochMs(context);
        MotionWidgetData.AgeParts age = MotionWidgetData.ageAt(birthEpochMs, System.currentTimeMillis());
        if (age == null) {
            views.setTextViewText(R.id.age_widget_name, "MOTION OS");
            views.setTextViewText(R.id.age_widget_years, "—");
            views.setTextViewText(R.id.age_widget_details, "Open the app to start");
            views.setViewVisibility(R.id.age_widget_elapsed, android.view.View.GONE);
            views.setViewVisibility(R.id.age_widget_dot, android.view.View.GONE);
        } else {
            String name = MotionWidgetData.name(context);
            views.setTextViewText(R.id.age_widget_name, name.isEmpty() ? "AGE IN MOTION" : name.toUpperCase(java.util.Locale.US));
            views.setTextViewText(R.id.age_widget_years, String.valueOf(age.years));
            views.setTextViewText(
                    R.id.age_widget_details,
                    String.format(java.util.Locale.US, "%02d months  •  %02d days", age.months, age.days)
            );
            views.setChronometer(R.id.age_widget_elapsed, MotionWidgetData.chronometerBase(birthEpochMs), "%s", true);
            views.setViewVisibility(R.id.age_widget_elapsed, android.view.View.VISIBLE);
            views.setViewVisibility(R.id.age_widget_dot, android.view.View.VISIBLE);
        }

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
