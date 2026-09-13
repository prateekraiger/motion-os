package io.motionos.app;

import android.content.Context;
import android.content.res.Configuration;
import android.widget.RemoteViews;

/**
 * Widget surface theme.
 *
 * <p>RemoteViews cannot follow the app's CSS-like theme variables, so the saved
 * preference ("system" | "light" | "dark") is resolved once per render into a
 * small palette. "system" follows the OS configuration at render time; the
 * result is painted onto the views with {@code setBackgroundResource} /
 * {@code setTextColor} / {@code setImageViewResource}, all of which are
 * remotable and therefore safe to call on views owned by the launcher.
 */
public final class MotionWidgetTheme {

    public static final String SYSTEM = "system";
    public static final String LIGHT = "light";
    public static final String DARK = "dark";

    public final int backgroundRes;
    public final int dotOnRes;
    public final int dotNowRes;
    public final int dotOffRes;
    public final int text;
    public final int muted;
    public final int accent;

    private MotionWidgetTheme(
            int backgroundRes,
            int dotOnRes,
            int dotNowRes,
            int dotOffRes,
            int text,
            int muted,
            int accent) {
        this.backgroundRes = backgroundRes;
        this.dotOnRes = dotOnRes;
        this.dotNowRes = dotNowRes;
        this.dotOffRes = dotOffRes;
        this.text = text;
        this.muted = muted;
        this.accent = accent;
    }

    public static MotionWidgetTheme resolve(Context context) {
        String preference = MotionWidgetData.widgetTheme(context);
        boolean light;
        if (LIGHT.equals(preference)) {
            light = true;
        } else if (DARK.equals(preference)) {
            light = false;
        } else {
            int night = context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
            light = night != Configuration.UI_MODE_NIGHT_YES;
        }

        if (light) {
            return new MotionWidgetTheme(
                    R.drawable.widget_background_light,
                    R.drawable.widget_dot_on_light,
                    R.drawable.widget_dot_now_light,
                    R.drawable.widget_dot_off_light,
                    context.getColor(R.color.widget_text_light),
                    context.getColor(R.color.widget_muted_light),
                    context.getColor(R.color.widget_red_light));
        }
        return new MotionWidgetTheme(
                R.drawable.widget_background,
                R.drawable.widget_dot_on_dark,
                R.drawable.widget_dot_now_dark,
                R.drawable.widget_dot_off_dark,
                context.getColor(R.color.widget_text),
                context.getColor(R.color.widget_muted),
                context.getColor(R.color.widget_red));
    }

    /** Repaints the card behind a widget; the layouts ship the dark default. */
    public void applyBackground(RemoteViews views, int rootId) {
        views.setInt(rootId, "setBackgroundResource", backgroundRes);
    }
}
