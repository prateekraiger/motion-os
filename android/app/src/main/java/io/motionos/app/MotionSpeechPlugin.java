package io.motionos.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * On-device dictation for capturing tasks and notes.
 *
 * Android's WebView has no Web Speech API, so this wraps
 * {@link SpeechRecognizer} and streams partial / final transcripts back to the
 * web layer as plugin events. Recognition runs on the device — nothing is sent
 * to a server.
 */
@CapacitorPlugin(
        name = "MotionSpeech",
        permissions = {@Permission(strings = {Manifest.permission.RECORD_AUDIO}, alias = MotionSpeechPlugin.ALIAS_MIC)})
public class MotionSpeechPlugin extends Plugin {

    static final String ALIAS_MIC = "microphone";

    private SpeechRecognizer recognizer;
    private boolean listening;

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias(ALIAS_MIC, call, "microphonePermissionCallback");
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted",
                ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                        == PackageManager.PERMISSION_GRANTED);
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (listening) {
            call.resolve();
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            reject(call, "Speech recognition is not available on this device.");
            return;
        }
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            reject(call, "Microphone permission denied.");
            return;
        }

        final String locale = call.getString("locale", java.util.Locale.getDefault().toLanguageTag());
        listening = true;

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                recognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onPartialResults(Bundle partialResults) {
                        emit("speechPartial", firstResult(partialResults));
                    }

                    @Override
                    public void onResults(Bundle results) {
                        emit("speechFinal", firstResult(results));
                        teardown();
                    }

                    @Override
                    public void onError(int error) {
                        emit("speechError", String.valueOf(error));
                        teardown();
                    }

                    @Override
                    public void onReadyForSpeech(Bundle params) {}

                    @Override
                    public void onBeginningOfSpeech() {}

                    @Override
                    public void onRmsChanged(float rmsdB) {}

                    @Override
                    public void onBufferReceived(byte[] buffer) {}

                    @Override
                    public void onEndOfSpeech() {}

                    @Override
                    public void onEvent(int eventType, Bundle params) {}
                });

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                recognizer.startListening(intent);
                call.resolve();
            } catch (Exception e) {
                listening = false;
                reject(call, "Could not start dictation.");
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        new Handler(Looper.getMainLooper()).post(this::teardown);
        call.resolve();
    }

    private void teardown() {
        listening = false;
        if (recognizer == null) return;
        try {
            recognizer.stopListening();
            recognizer.cancel();
            recognizer.destroy();
        } catch (Exception ignored) {
            // Already destroyed.
        }
        recognizer = null;
    }

    private String firstResult(Bundle bundle) {
        if (bundle == null) return "";
        java.util.ArrayList<String> matches = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty()) return "";
        return matches.get(0);
    }

    private void emit(String event, String text) {
        JSObject data = new JSObject();
        data.put(event.equals("speechPartial") ? "partial" : event.equals("speechFinal") ? "final" : "error", text);
        notifyListeners(event, data);
    }

    private void reject(PluginCall call, String message) {
        if (call != null) call.reject(message);
    }

    @Override
    protected void handleOnDestroy() {
        new Handler(Looper.getMainLooper()).post(this::teardown);
        super.handleOnDestroy();
    }

    /** Kept for symmetry with the web bridge. */
    static boolean micGranted(Context context) {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
    }
}
