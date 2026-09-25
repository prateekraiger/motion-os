package io.motionos.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MotionWidgetsPlugin.class);
        registerPlugin(MotionIntentsPlugin.class);
        registerPlugin(MotionHapticsPlugin.class);
        registerPlugin(MotionSpeechPlugin.class);
        registerPlugin(MotionCalendarPlugin.class);
        registerPlugin(MotionNotificationsPlugin.class);
        super.onCreate(savedInstanceState);

        // A share intent (or the Quick Settings tile) can cold-start the app.
        // Queue it so the web layer picks it up as soon as the bridge is ready.
        if (getIntent() != null) {
            com.getcapacitor.JSObject parsed = MotionIntentsPlugin.parseIntent(this, getIntent());
            if (parsed != null) MotionBus.postIntent(this, parsed);
        }
    }

    /**
     * The activity is `singleTask`, so a second share lands here instead of a
     * new instance — Capacitor forwards it to the plugins, which push it to the
     * web layer live.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
}
