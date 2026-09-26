package io.motionos.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;

/**
 * Queue and fan-out for events that cross the native/web boundary.
 *
 * Share intents and notification actions can arrive while the WebView is not
 * running (app closed, or still booting). Those are queued in
 * SharedPreferences and drained by the web layer on the next launch; when the
 * app is already alive the same event is pushed straight to the plugin
 * listeners, so the user sees it immediately.
 */
public final class MotionBus {

    private static final String PREFERENCES = "motion_os_bus";
    private static final String KEY_INTENTS = "pending_intents";
    private static final String KEY_ACTIONS = "pending_actions";
    private static final int MAX_QUEUE = 25;

    private static final List<Plugin> INTENT_TARGETS = new ArrayList<>();
    private static final List<Plugin> ACTION_TARGETS = new ArrayList<>();

    private MotionBus() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    private static JSONArray readQueue(Context context, String key) {
        String raw = prefs(context).getString(key, "[]");
        try {
            JSONArray array = new JSONArray(raw);
            return array == null ? new JSONArray() : array;
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static void writeQueue(Context context, String key, JSONArray queue) {
        prefs(context).edit().putString(key, queue.toString()).apply();
    }

    private static void trim(JSONArray queue) throws org.json.JSONException {
        while (queue.length() > MAX_QUEUE) queue.remove(0);
    }

    /* ----------------------------- Intents ---------------------------- */

    /** Queue a share/tile intent and deliver it to any live listeners. */
    public static synchronized void postIntent(Context context, JSObject intent) {
        if (intent == null) return;
        try {
            JSONArray queue = readQueue(context, KEY_INTENTS);
            queue.put(intent);
            trim(queue);
            writeQueue(context, KEY_INTENTS, queue);
        } catch (Exception ignored) {
            // A lost intent is a lost quick-capture; never crash the host app.
        }
        for (Plugin target : new ArrayList<>(INTENT_TARGETS)) {
            try {
                notifyPlugin(target, "motionIntent", intent);
            } catch (Exception ignored) {
                // Listener went away mid-dispatch.
            }
        }
    }

    /** Take the oldest queued intent, or null when the queue is empty. */
    public static synchronized JSObject consumeIntent(Context context) {
        JSONArray queue = readQueue(context, KEY_INTENTS);
        if (queue.length() == 0) return null;
        JSObject first = toJSObject(queue.optJSONObject(0));
        JSONArray rest = new JSONArray();
        for (int i = 1; i < queue.length(); i++) {
            try {
                rest.put(queue.get(i));
            } catch (Exception ignored) {
                break;
            }
        }
        writeQueue(context, KEY_INTENTS, rest);
        return first;
    }

    /**
     * Queued payloads are stored as plain JSON strings, so rehydrate them into
     * a {@link JSObject} on the way out.
     */
    private static JSObject toJSObject(org.json.JSONObject raw) {
        if (raw == null) return null;
        try {
            return new JSObject(raw.toString());
        } catch (Exception e) {
            return null;
        }
    }

    /* ------------------------- Notification actions -------------------- */

    /** Queue an action taken from a notification and notify live listeners. */
    public static synchronized void postAction(Context context, String event, JSObject action) {
        if (action == null) return;
        try {
            JSONArray queue = readQueue(context, KEY_ACTIONS);
            queue.put(action);
            trim(queue);
            writeQueue(context, KEY_ACTIONS, queue);
        } catch (Exception ignored) {
            // Ignored: the in-app reminder banner still covers the user.
        }
        for (Plugin target : new ArrayList<>(ACTION_TARGETS)) {
            try {
                notifyPlugin(target, event, action);
            } catch (Exception ignored) {
                // Listener went away mid-dispatch.
            }
        }
    }

    /** Empty the action queue and return everything that was in it. */
    public static synchronized JSArray drainActions(Context context) {
        JSONArray queue = readQueue(context, KEY_ACTIONS);
        writeQueue(context, KEY_ACTIONS, new JSONArray());
        JSArray out = new JSArray();
        for (int i = 0; i < queue.length(); i++) {
            JSObject item = toJSObject(queue.optJSONObject(i));
            if (item != null) out.put(item);
        }
        return out;
    }

    /* ---------------------------- Registration ------------------------- */

    private static void notifyPlugin(Plugin target, String event, JSObject data) {
        try {
            java.lang.reflect.Method m = Plugin.class.getDeclaredMethod("notifyListeners", String.class, JSObject.class);
            m.setAccessible(true);
            m.invoke(target, event, data);
        } catch (Exception e) {}
    }

    public static synchronized void registerIntents(Plugin plugin) {
        if (!INTENT_TARGETS.contains(plugin)) INTENT_TARGETS.add(plugin);
    }

    public static synchronized void registerActions(Plugin plugin) {
        if (!ACTION_TARGETS.contains(plugin)) ACTION_TARGETS.add(plugin);
    }

    public static synchronized void unregister(Plugin plugin) {
        INTENT_TARGETS.remove(plugin);
        ACTION_TARGETS.remove(plugin);
    }
}
