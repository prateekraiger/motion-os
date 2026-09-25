package io.motionos.app;

/** Shared constants for the Quick Settings tile and its focus intent. */
public final class MotionTile {

    /** Action used by the tile (and its label click) to start a focus block. */
    public static final String ACTION_FOCUS = "io.motionos.app.ACTION_START_FOCUS";
    public static final String EXTRA_MINUTES = "minutes";

    /** Default block length started from the shade, in minutes. */
    public static final int DEFAULT_MINUTES = 25;

    private MotionTile() {}
}
