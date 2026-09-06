package com.motionos.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

/** Capacitor bridge between WebView settings and native Android widgets. */
@CapacitorPlugin(name = "MotionWidgets")
public class MotionWidgetsPlugin extends Plugin {

    @PluginMethod
    public void syncSettings(PluginCall call) {
        String epochValue = call.getString("birthEpochMs", "0");
        long birthEpochMs = 0L;
        try {
            birthEpochMs = Long.parseLong(epochValue == null ? "0" : epochValue);
        } catch (NumberFormatException ignored) {
            // Treat malformed data as an empty profile rather than breaking the app.
        }

        String name = call.getString("name", "");
        Boolean h24Value = call.getBoolean("h24", true);
        MotionWidgetData.save(getContext(), birthEpochMs, name, h24Value == null || h24Value);
        MotionWidgetData.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void requestPinWidget(PluginCall call) {
        String kind = call.getString("kind", "age");
        Class<?> provider = "year".equals(kind) ? YearWidgetProvider.class : AgeWidgetProvider.class;
        JSObject result = new JSObject();
        boolean supported = false;
        boolean requested = false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
            supported = manager.isRequestPinAppWidgetSupported();
            if (supported) {
                ComponentName providerName = new ComponentName(getContext(), provider);
                Intent callbackIntent = new Intent(getContext(), WidgetPinReceiver.class)
                        .setAction("com.motionos.app.ACTION_WIDGET_PINNED");
                int callbackFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) callbackFlags |= PendingIntent.FLAG_IMMUTABLE;
                PendingIntent callback = PendingIntent.getBroadcast(
                        getContext(),
                        "year".equals(kind) ? 4202 : 4201,
                        callbackIntent,
                        callbackFlags
                );
                requested = manager.requestPinAppWidget(providerName, null, callback);
            }
        }

        result.put("supported", supported);
        result.put("requested", requested);
        call.resolve(result);
    }
}
