package com.dailynews.briefing;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String ASSET_URL = "https://" + ASSET_HOST + "/assets/index.html";
    private WebView web;
    private String liveHost = "";
    private boolean usingBackup = false;

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
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());   // null for the live site = normal loading
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String h = u.getHost() == null ? "" : u.getHost();
                if (h.equals(ASSET_HOST) || h.equals(liveHost)) return false;   // only your own pages stay inside
                if ("https".equals(u.getScheme())) startActivity(new Intent(Intent.ACTION_VIEW, u));
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

    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
