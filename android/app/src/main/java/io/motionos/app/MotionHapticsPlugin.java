package io.motionos.app;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Tactile feedback backed by the system vibrator.
 *
 * Durations follow the platform's own guidance: a light tap (~10 ms), a medium
 * confirmation (~20 ms) and a double buzz for a completed focus block.
 */
@CapacitorPlugin(name = "MotionHaptics")
public class MotionHapticsPlugin extends Plugin {

    private static final long TICK_MS = 10;
    private static final long CLICK_MS = 20;
    private static final long HEAVY_MS = 32;

    private Vibrator vibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager =
                    (VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager == null ? null : manager.getDefaultVibrator();
        }
        return (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
    }

    private void buzz(long[] pattern, int repeat) {
        Vibrator vibrator = vibrator();
        if (vibrator == null || !vibrator.hasVibrator()) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, repeat));
            } else {
                vibrator.vibrate(pattern, repeat);
            }
        } catch (Exception ignored) {
            // Some devices reject waveforms they cannot render.
        }
    }

    private void once(long ms) {
        buzz(new long[] {ms}, -1);
    }

    @PluginMethod
    public void impact(PluginCall call) {
        String style = call.getString("style", "light");
        switch (style == null ? "light" : style) {
            case "heavy":
                once(HEAVY_MS);
                break;
            case "medium":
                once(CLICK_MS);
                break;
            default:
                once(TICK_MS);
                break;
        }
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void selection(PluginCall call) {
        once(TICK_MS);
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void notification(PluginCall call) {
        String type = call.getString("type", "success");
        if ("warning".equals(type) || "error".equals(type)) {
            // Two short buzzes: something needs attention.
            buzz(new long[] {0, CLICK_MS, 60, CLICK_MS}, -1);
        } else {
            buzz(new long[] {0, CLICK_MS, 50, CLICK_MS, 50, HEAVY_MS}, -1);
        }
        call.resolve(new JSObject());
    }
}
