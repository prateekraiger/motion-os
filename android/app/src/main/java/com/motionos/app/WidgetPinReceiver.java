package com.motionos.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Refreshes existing widgets after the launcher accepts an in-app pin request. */
public class WidgetPinReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        MotionWidgetData.refreshAll(context);
    }
}
