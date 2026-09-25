package io.motionos.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge for Android share intents and the Quick Settings tile.
 *
 * Text shared from any app ("Share → Motion OS") and the tile's focus request
 * both arrive as an {@link Intent}. While the app is alive they are pushed to
 * the web layer immediately; otherwise they are queued and consumed on the next
 * launch, so nothing is dropped.
 */
@CapacitorPlugin(name = "MotionIntents")
public class MotionIntentsPlugin extends Plugin {

    @Override
    public void load() {
        MotionBus.registerIntents(this);
        MotionBus.registerActions(this);
        super.load();
    }

    @Override
    protected void handleOnDestroy() {
        MotionBus.unregister(this);
        super.handleOnDestroy();
    }

    /** Called while the app is running and a new intent targets it. */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        JSObject parsed = MotionIntents.parseIntent(getContext(), intent);
        if (parsed != null) MotionBus.postIntent(getContext(), parsed);
    }

    @PluginMethod
    public void consume(PluginCall call) {
        JSObject intent = MotionBus.consumeIntent(getContext());
        JSObject result = new JSObject();
        result.put("intent", intent);
        call.resolve(result);
    }

    /**
     * Turn an incoming intent into a payload for the web layer, or null when it
     * is not one of ours (a plain launcher start, for example).
     */
    static JSObject parseIntent(android.content.Context context, Intent intent) {
        if (intent == null) return null;
        String action = intent.getAction();
        if (action == null) return null;

        JSObject payload = new JSObject();
        if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            if (!"text/plain".equals(intent.getType())) return null;
            String shared = intent.getStringExtra(Intent.EXTRA_TEXT);
            String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            if (shared == null && subject == null) return null;
            String text = shared != null ? shared : subject;
            if (subject != null && shared != null && !shared.contains(subject)) {
                text = subject + "\n" + shared;
            }
            payload.put("type", "share");
            payload.put("text", text.trim());
            payload.put("at", System.currentTimeMillis());
            return payload;
        }

        if (MotionTile.ACTION_FOCUS.equals(action)) {
            int minutes = intent.getIntExtra(MotionTile.EXTRA_MINUTES, 25);
            payload.put("type", "focus");
            payload.put("minutes", Math.max(1, Math.min(180, minutes)));
            payload.put("at", System.currentTimeMillis());
            return payload;
        }
        return null;
    }
}
