package com.dailynews.briefing;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.app.AlertDialog;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Handler;
import android.os.Looper;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
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
        final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
            try {
                java.io.StringWriter sw = new java.io.StringWriter();
                e.printStackTrace(new java.io.PrintWriter(sw));
                String s = sw.toString();
                getSharedPreferences("diag", MODE_PRIVATE).edit().putString("crash", (new java.util.Date()).toString() + " " + (s.length() > 1200 ? s.substring(0, 1200) : s)).commit();
            } catch (Exception ignored) { }
            if (prev != null) prev.uncaughtException(t, e);
        });
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
        s.setSupportZoom(true);                 // pinch to zoom
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
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

    private static final String RELEASE_PAGE = "https://github.com/jnanendray/daily_news/releases/tag/apk-latest";
    private volatile String updState = "idle";      // idle | checking | uptodate | available | failed
    private volatile String updLatest = "";
    private volatile long updTime = 0;
    private boolean checking = false;

    private String httpGet(String url, String accept) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(10000);
        c.setUseCaches(false);
        if (accept != null) c.setRequestProperty("Accept", accept);
        if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
        StringBuilder sb = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()))) {
            String line;
            while ((line = r.readLine()) != null && sb.length() < 400000) sb.append(line).append('\n');
        }
        return sb.toString();
    }

    /** Reads versionCode and version name from the release notes. Tries GitHub's data service, then the release web page. */
    private long[] fetchLatest() throws Exception {
        String text;
        try {
            text = new JSONObject(httpGet(RELEASE_API, "application/vnd.github+json")).optString("body", "");
        } catch (Exception first) {
            text = httpGet(RELEASE_PAGE, null);           // not rate limited the same way
        }
        Matcher m = Pattern.compile("versionCode:\\s*(\\d{1,9})").matcher(text);
        if (!m.find()) throw new Exception("no version in notes");
        Matcher n = Pattern.compile("version\\s+(\\d+(?:\\.\\d+){1,3})").matcher(text);
        updLatest = n.find() ? n.group(1) : "";
        return new long[] { Long.parseLong(m.group(1)) };
    }

    /** Runs on every open and every return to the app. Only the version number is read; the download address is fixed in this app. */
    private void checkForUpdate() {
        if (checking) return;
        checking = true;
        lastUpdateCheck = System.currentTimeMillis();
        updState = "checking";
        new Thread(() -> {
            String result = "failed";
            for (int attempt = 0; attempt < 3 && result.equals("failed"); attempt++) {
                try {
                    long latest = fetchLatest()[0];
                    result = latest > installedCode() ? "available" : "uptodate";
                } catch (Exception e) {
                    try { Thread.sleep(2500); } catch (InterruptedException ignored) { }
                }
            }
            updTime = System.currentTimeMillis();
            updState = result;
            checking = false;
            if (result.equals("available")) runOnUiThread(this::showUpdateDialog);
        }).start();
    }

    private void showUpdateDialog() {
        if (updateDialogOpen || isFinishing()) return;
        updateDialogOpen = true;
        String have = installedName();
        String msg = "A newer version of Daily News Briefing is ready" + (updLatest.isEmpty() ? "" : " (version " + updLatest + ")")
            + ". You have " + have + ". Update now? Your browser will download it, then tap the downloaded file to install.";
        new AlertDialog.Builder(this)
            .setTitle("Update available")
            .setMessage(msg)
            .setPositiveButton("Update", (d, w) -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(APK_URL))); } catch (Exception ignored) { }
            })
            .setNegativeButton("Later", null)
            .setOnDismissListener(d -> updateDialogOpen = false)
            .show();
    }

    @Override protected void onResume() {
        super.onResume();
        if (System.currentTimeMillis() - lastUpdateCheck > 20 * 1000L) checkForUpdate();   // every time the app comes forward
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
        if (code == 78) {                                   // approximate location, asked once when the user opens Weather
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) fetchLocation();
            else evalJs("window.__loc&&window.__loc('denied',0,0)");
            return;
        }
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

    /* ---------- approximate location (only when the user taps Weather; coarse permission, nothing is stored natively) ---------- */
    private boolean locDone = false;

    private void sendLoc(Location l) {
        locDone = true;
        evalJs("window.__loc&&window.__loc('ok'," + l.getLatitude() + "," + l.getLongitude() + ")");
    }

    private void locFail() {
        if (locDone) return;
        locDone = true;
        evalJs("window.__loc&&window.__loc('fail',0,0)");
    }

    @SuppressWarnings("deprecation")
    private void fetchLocation() {
        locDone = false;
        try {
            final LocationManager lm = (LocationManager) getSystemService(LOCATION_SERVICE);
            if (lm == null) { locFail(); return; }
            Location best = null;
            String[] providers = { LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER };
            for (String p : providers) {
                if (!lm.isProviderEnabled(p)) continue;
                Location l = lm.getLastKnownLocation(p);
                if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
            }
            if (best != null) { sendLoc(best); return; }
            if (!lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) { locFail(); return; }
            final LocationListener ll = new LocationListener() {
                public void onLocationChanged(Location l) { if (!locDone) sendLoc(l); }
                public void onStatusChanged(String p, int st, Bundle e) { }
                public void onProviderEnabled(String p) { }
                public void onProviderDisabled(String p) { }
            };
            lm.requestSingleUpdate(LocationManager.NETWORK_PROVIDER, ll, Looper.getMainLooper());
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try { lm.removeUpdates(ll); } catch (RuntimeException ignored) { }
                locFail();
            }, 20000);
        } catch (SecurityException | IllegalArgumentException e) {
            locFail();
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
        @JavascriptInterface public String deviceInfo() { return "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + "), " + Build.MANUFACTURER + " " + Build.MODEL; }
        @JavascriptInterface public String lastCrash() { return getSharedPreferences("diag", MODE_PRIVATE).getString("crash", ""); }
        @JavascriptInterface public void clearCrash() { getSharedPreferences("diag", MODE_PRIVATE).edit().remove("crash").apply(); }
        @JavascriptInterface public void openExternal(final String url) {
            if (url == null || !url.startsWith("https://") || url.length() > 1000) return;
            runOnUiThread(() -> { try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { } });
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
        /** Fetches one day's headline list for the page. Only the GDELT document API over https is allowed. */
        @JavascriptInterface public void liveGet(final String id, final String url) {
            final String sid = id == null ? "" : id.replaceAll("[^A-Za-z0-9]", "");
            if (url == null || !url.startsWith("https://api.gdeltproject.org/api/v2/doc/doc?") || url.length() > 4000) {
                evalJs("window.__live&&window.__live('" + sid + "',false,'')");
                return;
            }
            new Thread(() -> {
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                    c.setConnectTimeout(10000);
                    c.setReadTimeout(20000);
                    c.setInstanceFollowRedirects(false);
                    if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
                    ByteArrayOutputStream bo = new ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n;
                    try (InputStream in = c.getInputStream()) {
                        while ((n = in.read(buf)) > 0) {
                            bo.write(buf, 0, n);
                            if (bo.size() > 3000000) throw new Exception("too large");
                        }
                    }
                    String b64 = android.util.Base64.encodeToString(bo.toByteArray(), android.util.Base64.NO_WRAP);
                    evalJs("window.__live&&window.__live('" + sid + "',true,'" + b64 + "')");
                } catch (Exception e) {
                    evalJs("window.__live&&window.__live('" + sid + "',false,'')");
                }
            }).start();
        }
        @JavascriptInterface public void requestLocation() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION}, 78);
                } else fetchLocation();
            });
        }
        @JavascriptInterface public String updateStatus() { return updState + "|" + updLatest + "|" + updTime; }
        @JavascriptInterface public void checkUpdate() { runOnUiThread(() -> { lastUpdateCheck = 0; checkForUpdate(); }); }
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
