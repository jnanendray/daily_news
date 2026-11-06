package com.dailynews.briefing;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.app.AlertDialog;
import android.content.pm.PackageInfo;
import android.os.Build;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
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
    private static final String GOOGLE_TTS = "com.google.android.tts";
    private static final String RELEASE_API = "https://api.github.com/repos/jnanendray/daily_news/releases/tags/apk-latest";
    private static final String APK_URL = "https://github.com/jnanendray/daily_news/releases/download/apk-latest/DailyNewsBriefing.apk";
    private long lastUpdateCheck = 0;
    private boolean updateDialogOpen = false;
    private int pendingH = 7, pendingM = 0;
    private TextToSpeech tts;
    private boolean usingGoogle = false;
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
        initTts(true);
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
        Reminder.ensureChannel(this);
        Reminder.schedule(this);
        checkForUpdate();
    }

    @SuppressWarnings("deprecation")
    private long installedCode() {
        try {
            PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
        } catch (Exception e) { return Long.MAX_VALUE; }
    }

    private String installedName() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
        catch (Exception e) { return ""; }
    }

    /** Asks GitHub which app version is newest. Only the version number is read; the download address is fixed in this app. */
    private void checkForUpdate() {
        lastUpdateCheck = System.currentTimeMillis();
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(RELEASE_API).openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                c.setRequestProperty("Accept", "application/vnd.github+json");
                if (c.getResponseCode() != 200) return;
                StringBuilder sb = new StringBuilder();
                try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()))) {
                    String line;
                    while ((line = r.readLine()) != null && sb.length() < 200000) sb.append(line);
                }
                Matcher m = Pattern.compile("versionCode:\\s*(\\d{1,9})").matcher(new JSONObject(sb.toString()).optString("body", ""));
                if (!m.find()) return;
                final long latest = Long.parseLong(m.group(1));
                if (latest > installedCode()) runOnUiThread(this::showUpdateDialog);
            } catch (Exception ignored) { }
        }).start();
    }

    private void showUpdateDialog() {
        if (updateDialogOpen || isFinishing()) return;
        updateDialogOpen = true;
        new AlertDialog.Builder(this)
            .setTitle("Update available")
            .setMessage("A newer version of Daily News Briefing is ready. Update now? Your browser will download it, then tap the downloaded file to install.")
            .setPositiveButton("Update", (d, w) -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(APK_URL))); } catch (Exception ignored) { }
            })
            .setNegativeButton("Later", null)
            .setOnDismissListener(d -> updateDialogOpen = false)
            .show();
    }

    @Override protected void onResume() {
        super.onResume();
        if (System.currentTimeMillis() - lastUpdateCheck > 30 * 60 * 1000L) checkForUpdate();
    }

    /* ---------- text to speech (device voice, no permission needed) ---------- */
    /** Prefer Google's speech engine (clearest Kannada and Indian English); fall back to the phone's default. */
    private void initTts(final boolean google) {
        final TextToSpeech.OnInitListener l = status -> {
            if (status != TextToSpeech.SUCCESS && google) {
                if (tts != null) { tts.shutdown(); tts = null; }
                initTts(false);
                return;
            }
            ttsReady = (status == TextToSpeech.SUCCESS);
            usingGoogle = ttsReady && google;
            if (ttsReady) {
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { notifyJs("done", id); }
                    @Override public void onError(String id) { notifyJs("error", id); }
                });
            }
            for (Runnable r : new ArrayList<>(waiting)) runOnUiThread(r);
            waiting.clear();
        };
        try {
            tts = google ? new TextToSpeech(getApplicationContext(), l, GOOGLE_TTS) : new TextToSpeech(getApplicationContext(), l);
        } catch (Exception e) {
            if (google) initTts(false);
        }
    }

    private void evalJs(final String js) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(js, null); });
    }

    private boolean notifAllowed() {
        return Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    @Override public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (code != 77) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            Reminder.save(this, true, pendingH, pendingM);
            Reminder.schedule(this);
            evalJs("window.__remind&&window.__remind('ok')");
        } else {
            Reminder.save(this, false, pendingH, pendingM);
            evalJs("window.__remind&&window.__remind('denied')");
        }
    }

    private void notifyJs(final String ev, final String id) {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("window.__tts&&window.__tts('" + ev + "','" + id.replaceAll("[^A-Za-z0-9]", "") + "')", null);
        });
    }

    private Locale setLang(String lang) {
        Locale[] tries = "kn".equals(lang)
            ? new Locale[]{ new Locale("kn", "IN") }
            : new Locale[]{ new Locale("en", "IN"), Locale.UK, Locale.US };
        for (Locale l : tries) {
            if (tts.setLanguage(l) >= TextToSpeech.LANG_AVAILABLE) { pickBestVoice(l); return l; }
        }
        return null;
    }

    /** Choose the highest-quality installed voice for the language (country match first). */
    private void pickBestVoice(Locale loc) {
        try {
            Voice best = null; int bestScore = -1;
            for (Voice v : tts.getVoices()) {
                Locale vl = v.getLocale();
                if (vl == null || !vl.getLanguage().equals(loc.getLanguage())) continue;
                if (v.getFeatures() != null && v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                int score = v.getQuality() + (loc.getCountry().equals(vl.getCountry()) ? 1000 : 0);
                if (score > bestScore) { bestScore = score; best = v; }
            }
            if (best != null) tts.setVoice(best);
        } catch (Exception ignored) { }
    }

    private class Bridge {
        @JavascriptInterface public String voiceStatus(String lang) {
            if (!ttsReady) return "wait";
            Locale l = "kn".equals(lang) ? new Locale("kn", "IN") : new Locale("en", "IN");
            return tts.isLanguageAvailable(l) >= TextToSpeech.LANG_AVAILABLE ? "ok" : "missing";
        }
        @JavascriptInterface public String getReminder() { return Reminder.describe(MainActivity.this); }
        @JavascriptInterface public boolean notifAllowed() { return MainActivity.this.notifAllowed(); }
        @JavascriptInterface public void setReminder(final boolean on, final int h, final int m) {
            if (h < 0 || h > 23 || m < 0 || m > 59) return;
            runOnUiThread(() -> {
                pendingH = h; pendingM = m;
                if (on && !notifAllowed()) { requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 77); return; }
                Reminder.save(MainActivity.this, on, h, m);
                Reminder.schedule(MainActivity.this);
            });
        }
        @JavascriptInterface public void refreshVoices() {
            runOnUiThread(() -> { if (tts != null && !usingGoogle) { ttsReady = false; tts.shutdown(); initTts(true); } });
        }
        @JavascriptInterface public String appVersion() { return installedName(); }
        @JavascriptInterface public String engine() { return !ttsReady ? "wait" : (usingGoogle ? "google" : "other"); }
        @JavascriptInterface public void installGoogle() {
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + GOOGLE_TTS))); }
                catch (ActivityNotFoundException e) {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + GOOGLE_TTS)));
                }
            });
        }
        @JavascriptInterface public void speak(final String text, final String lang, final float rate, final String id) {
            if (text == null || text.length() > 2000 || id == null) return;
            Runnable job = () -> {
                if (!ttsReady) { notifyJs("novoice", id); return; }
                if (setLang(lang) == null) { notifyJs("novoice", id); return; }
                tts.setSpeechRate(Math.max(0.5f, Math.min(2.0f, rate)));
                tts.setPitch(1.0f);
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
            };
            if (ttsReady) runOnUiThread(job); else waiting.add(job);
        }
        @JavascriptInterface public void stop() { if (tts != null) tts.stop(); }
        @JavascriptInterface public void installVoices() {
            runOnUiThread(() -> {
                try {
                    Intent in = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
                    if (usingGoogle) in.setPackage(GOOGLE_TTS);
                    startActivity(in);
                }
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
