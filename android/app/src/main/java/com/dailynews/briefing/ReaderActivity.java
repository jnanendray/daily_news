package com.dailynews.briefing;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** In-app reader for reference links. https only, no app bridge, no downloads, no file access. */
public class ReaderActivity extends Activity {
    private WebView web;
    private TextView title;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Uri u = getIntent().getData();
        if (u == null || !"https".equals(u.getScheme())) { finish(); return; }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setBackgroundColor(Color.parseColor("#0C2142"));
        int p = (int) (8 * getResources().getDisplayMetrics().density);
        bar.setPadding(p, p, p, p);

        Button close = new Button(this);
        close.setText("Close");
        close.setOnClickListener(v -> finish());
        title = new TextView(this);
        title.setTextColor(Color.WHITE);
        title.setSingleLine(true);
        title.setText(u.getHost());
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        tp.setMargins(p, 0, p, 0);
        Button share = new Button(this);
        share.setText("Share");
        share.setOnClickListener(v -> {
            String url = web.getUrl();
            if (url == null) return;
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, url);
            startActivity(Intent.createChooser(i, "Share"));
        });
        Button browser = new Button(this);
        browser.setText("Browser");
        browser.setOnClickListener(v -> {      // some sites ask for a human check inside embedded views; the full browser passes it
            String url = web.getUrl();
            if (url == null || !url.startsWith("https://")) return;
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
        });
        bar.addView(close);
        bar.addView(title, tp);
        bar.addView(browser);
        bar.addView(share);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);          // many news sites need it; this view has no app bridge
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSaveFormData(false);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, android.webkit.WebResourceRequest r) {
                return !"https".equals(r.getUrl().getScheme());   // block non-https schemes
            }
            @Override public void onPageFinished(WebView v, String url) {
                String t = v.getTitle();
                title.setText(t != null && !t.isEmpty() ? t : Uri.parse(url).getHost());
            }
        });
        web.setDownloadListener((url, ua, cd, mime, len) -> { });   // no downloads from the reader
        root.addView(bar);
        root.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);
        web.loadUrl(u.toString());
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (web != null) { web.stopLoading(); web.destroy(); }
        super.onDestroy();
    }
}
