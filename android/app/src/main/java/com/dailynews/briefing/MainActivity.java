package com.dailynews.briefing;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String ASSET_URL = "https://" + ASSET_HOST + "/assets/index.html";
    private WebView web;
    private String liveHost = "";
    private boolean usingBackup = false;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private final ArrayList<Runnable> waiting = new ArrayList<>();

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        final String liveUrl = getString(R.string.live_url);
        final Uri live = Uri.parse(liveUrl);
        liveHost = live.getHost() == null ? "" : live.getHost();
        final boolean configured = "https".equals(live.getScheme()) && !liveUrl.contains("YOUR-");

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .setDomain(ASSET_HOST)
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        web.addJavascriptInterface(new Bridge(), "NewsApp");
        initTts();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());   // null for the live site = normal loading
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String h = u.getHost() == null ? "" : u.getHost();
                if (h.equals(ASSET_HOST) || h.equals(liveHost)) return false;   // your own pages stay in this view
                if ("https".equals(u.getScheme())) {                            // reference links open in the in-app reader
                    Intent i = new Intent(MainActivity.this, ReaderActivity.class);
                    i.setData(u);
                    startActivity(i);
                }
                return true;
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame() && !usingBackup) {   // offline or site down: show the bundled copy
                    usingBackup = true;
                    v.loadUrl(ASSET_URL);
                }
            }
        });
        setContentView(web);
        if (configured) web.loadUrl(liveUrl); else { usingBackup = true; web.loadUrl(ASSET_URL); }
    }

    /* ---------- text to speech (device voice, no permission needed) ---------- */
    private void initTts() {
        tts = new TextToSpeech(getApplicationContext(), status -> {
            ttsReady = (status == TextToSpeech.SUCCESS);
            if (ttsReady) {
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { notifyJs("done", id); }
                    @Override public void onError(String id) { notifyJs("error", id); }
                });
            }
            for (Runnable r : new ArrayList<>(waiting)) runOnUiThread(r);
            waiting.clear();
        });
    }

    private void notifyJs(final String ev, final String id) {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("window.__tts&&window.__tts('" + ev + "','" + id.replaceAll("[^A-Za-z0-9]", "") + "')", null);
        });
    }

    private int setLang(String lang) {
        if ("kn".equals(lang)) return tts.setLanguage(new Locale("kn", "IN"));
        int r = tts.setLanguage(new Locale("en", "IN"));
        if (r < TextToSpeech.LANG_AVAILABLE) r = tts.setLanguage(Locale.UK);
        if (r < TextToSpeech.LANG_AVAILABLE) r = tts.setLanguage(Locale.US);
        return r;
    }

    private class Bridge {
        @JavascriptInterface public String voiceStatus(String lang) {
            if (!ttsReady) return "wait";
            Locale l = "kn".equals(lang) ? new Locale("kn", "IN") : new Locale("en", "IN");
            return tts.isLanguageAvailable(l) >= TextToSpeech.LANG_AVAILABLE ? "ok" : "missing";
        }
        @JavascriptInterface public void speak(final String text, final String lang, final float rate, final String id) {
            if (text == null || text.length() > 2000 || id == null) return;
            Runnable job = () -> {
                if (!ttsReady) { notifyJs("novoice", id); return; }
                int r = setLang(lang);
                if (r < TextToSpeech.LANG_AVAILABLE) { notifyJs("novoice", id); return; }
                tts.setSpeechRate(Math.max(0.5f, Math.min(2.0f, rate)));
                tts.setPitch(1.0f);
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
            };
            if (ttsReady) runOnUiThread(job); else waiting.add(job);
        }
        @JavascriptInterface public void stop() { if (tts != null) tts.stop(); }
        @JavascriptInterface public void installVoices() {
            runOnUiThread(() -> {
                try { startActivity(new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA)); }
                catch (ActivityNotFoundException e1) {
                    try { startActivity(new Intent("com.android.settings.TTS_SETTINGS")); }
                    catch (ActivityNotFoundException e2) {
                        Toast.makeText(MainActivity.this, "Open Settings, search for Text-to-speech, and download Kannada.", Toast.LENGTH_LONG).show();
                    }
                }
            });
        }
        @JavascriptInterface public void share(final String text) {
            if (text == null || text.length() > 1000) return;
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(i, "Share"));
            });
        }
    }

    @Override protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        super.onDestroy();
    }

    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
