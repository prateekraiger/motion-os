package io.motionos.app;

import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

/**
 * Quick Settings tile: one tap starts a 25-minute focus block.
 *
 * The tile does not need the app to be running — it broadcasts our focus
 * action, which the WebView consumes as an intent (starting the block if the
 * app is closed, or the next time it opens).
 */
public class FocusTileService extends TileService {

    @Override
    public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        if (tile != null) {
            tile.setState(Tile.STATE_INACTIVE);
            tile.setLabel("Focus 25m");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                tile.setSubtitle("Motion OS");
            }
            tile.updateTile();
        }
    }

    @Override
    public void onClick() {
        super.onClick();
        Intent intent = new Intent(this, MainActivity.class);
        intent.setAction(MotionTile.ACTION_FOCUS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra(MotionTile.EXTRA_MINUTES, MotionTile.DEFAULT_MINUTES);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pending = PendingIntent.getActivity(this, 4301, intent, flags);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+: start the activity and collapse the shade with it.
            startActivityAndCollapse(pending);
        } else {
            startActivityAndCollapse(intent);
        }

        Tile tile = getQsTile();
        if (tile != null) {
            tile.setState(Tile.STATE_ACTIVE);
            tile.updateTile();
        }
    }

    /** Keep the tile honest when the shade is dismissed. */
    @Override
    public void onStopListening() {
        Tile tile = getQsTile();
        if (tile != null && tile.getState() == Tile.STATE_ACTIVE) {
            tile.setState(Tile.STATE_INACTIVE);
            tile.updateTile();
        }
        super.onStopListening();
    }
}
