package io.motionos.app;

import android.appwidget.AppWidgetManager;
import android.os.Bundle;

/**
 * Size buckets behind the responsive widget layouts.
 *
 * <p>Each bucket owns a layout tuned for one family of launcher footprints. The
 * keys below mirror how {@code RemoteViews} selects a layout on Android 12+:
 * among the keys that fit inside the widget, the closest one (by squared
 * distance) wins. The same keys are used here for pre-Android 12 hosts, which
 * report their current footprint through the widget options bundle.
 *
 * <p>Key values sit a little under the real cell footprints (portrait cells are
 * ~73 x 118 dp minus launcher margins) so a layout is only chosen when it truly
 * fits:
 *
 * <ul>
 *   <li>MICRO — 1 x n single-column cells
 *   <li>STRIP — n x 1 rows and short landscape bands
 *   <li>SMALL — 2 x 2 and 2 x 3
 *   <li>WIDE — 3 x 2, 4 x 2, landscape 5 x 4
 *   <li>LARGE — 3 x 3, 4 x 3, 4 x 4 and up
 * </ul>
 */
public final class MotionWidgetSize {

    public enum Bucket {
        MICRO(40f, 40f),
        STRIP(110f, 40f),
        SMALL(150f, 150f),
        WIDE(250f, 150f),
        LARGE(250f, 330f);

        private final float keyWidth;
        private final float keyHeight;

        Bucket(float keyWidth, float keyHeight) {
            this.keyWidth = keyWidth;
            this.keyHeight = keyHeight;
        }

        public float keyWidth() {
            return keyWidth;
        }

        public float keyHeight() {
            return keyHeight;
        }
    }

    private MotionWidgetSize() {}

    /**
     * Chooses the bucket whose key fits inside {@code widthDp x heightDp} and is
     * closest to it. Returns MICRO when nothing fits, so the most compact
     * layout (the safe fallback a host also uses when it reports no size) is
     * rendered instead of a clipped one.
     */
    public static Bucket pick(float widthDp, float heightDp) {
        Bucket best = null;
        float bestDistance = Float.MAX_VALUE;
        for (Bucket bucket : Bucket.values()) {
            boolean fits =
                    Math.ceil(widthDp) + 1 > bucket.keyWidth()
                            && Math.ceil(heightDp) + 1 > bucket.keyHeight();
            if (!fits) continue;
            float dx = widthDp - bucket.keyWidth();
            float dy = heightDp - bucket.keyHeight();
            float distance = dx * dx + dy * dy;
            if (best == null || distance < bestDistance) {
                best = bucket;
                bestDistance = distance;
            }
        }
        return best == null ? Bucket.MICRO : best;
    }

    /**
     * Pre-Android 12 hosts publish the current footprint (in dips, for the
     * active orientation) under the MIN_* option keys. Fall back to MAX_* and
     * finally to the provider's default footprint when a host sends nothing.
     */
    public static Bucket fromOptions(Bundle options, Bucket fallback) {
        if (options == null) return fallback;
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
        if (width <= 0 || height <= 0) {
            width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0);
            height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        }
        if (width <= 0 || height <= 0) return fallback;
        return pick(width, height);
    }
}
