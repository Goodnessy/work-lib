package app.readance.unofficial;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String HOME = "https://readance.app/";
    private FrameLayout root;
    private WebView webView;
    private WebView authPopup;
    private LinearLayout popupPanel;
    private TextView popupHost;
    private boolean authFlowActive = false;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR |
                View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);

        root = new FrameLayout(this);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        configureMain();
        if (state == null) webView.loadUrl(HOME);
        else webView.restoreState(state);
    }

    private void applyWebSettings(WebView view, boolean allowPopups) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(allowPopups);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, true);
    }

    private void configureMain() {
        applyWebSettings(webView, true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return request.isForMainFrame() && navigateMain(request.getUrl(), view.getUrl());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return navigateMain(Uri.parse(url), view.getUrl());
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean dialog, boolean isUserGesture, Message resultMsg) {
                if (!isUserGesture) return false;
                showPopup(resultMsg);
                return true;
            }
            @Override
            public void onCloseWindow(WebView window) {
                if (window == authPopup) closePopup(true);
            }
        });
        webView.setDownloadListener((url, userAgent, disposition, type, length) ->
                openExternal(Uri.parse(url)));
    }

    private boolean isHttp(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme()) ||
               "http".equalsIgnoreCase(uri.getScheme());
    }

    private boolean isReadance(Uri uri) {
        String host = uri.getHost();
        return "https".equalsIgnoreCase(uri.getScheme()) && host != null &&
                (host.equalsIgnoreCase("readance.app") ||
                 host.toLowerCase(Locale.ROOT).endsWith(".readance.app"));
    }

    private boolean isAuthContext(String current) {
        if (current == null) return false;
        try {
            Uri uri = Uri.parse(current);
            String path = uri.getPath() == null ? "" : uri.getPath().toLowerCase(Locale.ROOT);
            return isReadance(uri) &&
                    (path.startsWith("/login") || path.startsWith("/signup") ||
                     path.startsWith("/register") || path.contains("/auth") ||
                     path.contains("/callback"));
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean isAuthProvider(Uri uri) {
        String host = uri.getHost();
        if (host == null) return false;
        String h = host.toLowerCase(Locale.ROOT);
        String p = uri.getPath() == null ? "" : uri.getPath().toLowerCase(Locale.ROOT);
        return h.equals("accounts.google.com") ||
                h.equals("appleid.apple.com") ||
                h.equals("login.microsoftonline.com") ||
                h.equals("github.com") && p.startsWith("/login") ||
                h.equals("auth.readance.app") ||
                h.endsWith(".supabase.co") ||
                h.endsWith(".clerk.accounts.dev");
    }

    private boolean navigateMain(Uri uri, String current) {
        if (isReadance(uri)) {
            if (authFlowActive && !isAuthContext(uri.toString())) authFlowActive = false;
            return false;
        }
        if ("about".equalsIgnoreCase(uri.getScheme())) return false;
        // Keep every redirect of the authentication flow in the same cookie store.
        if (isHttp(uri) && (isAuthContext(current) || authFlowActive || isAuthProvider(uri))) {
            authFlowActive = true;
            return false;
        }
        openExternal(uri);
        return true;
    }

    private int dp(float d) {
        return (int) (getResources().getDisplayMetrics().density * d + 0.5f);
    }

    private void showPopup(Message resultMsg) {
        closePopup(false);
        authPopup = new WebView(this);
        authPopup.setBackgroundColor(Color.WHITE);
        applyWebSettings(authPopup, false);

        popupPanel = new LinearLayout(this);
        popupPanel.setOrientation(LinearLayout.VERTICAL);
        popupPanel.setBackgroundColor(Color.WHITE);

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setBackgroundColor(Color.rgb(249, 249, 249));
        header.setPadding(dp(14), 0, dp(6), 0);

        popupHost = new TextView(this);
        popupHost.setText("正在打开登录页面…");
        popupHost.setTextColor(Color.DKGRAY);
        popupHost.setTextSize(13);
        header.addView(popupHost, new LinearLayout.LayoutParams(0, dp(48), 1));

        TextView close = new TextView(this);
        close.setText("关闭");
        close.setTextColor(Color.rgb(30, 88, 76));
        close.setTextSize(14);
        close.setGravity(Gravity.CENTER);
        header.addView(close, new LinearLayout.LayoutParams(dp(62), dp(48)));
        close.setOnClickListener(v -> closePopup(true));

        popupPanel.addView(header);
        popupPanel.addView(authPopup, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(popupPanel, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        final boolean fromLogin = isAuthContext(webView.getUrl());
        authPopup.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return request.isForMainFrame() && popupNavigate(request.getUrl(), fromLogin);
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return popupNavigate(Uri.parse(url), fromLogin);
            }
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                updatePopupHost(url);
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                updatePopupHost(url);
                CookieManager.getInstance().flush();
            }
        });
        authPopup.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onCloseWindow(WebView window) {
                closePopup(true);
            }
        });
        authPopup.setDownloadListener((url, agent, disposition, type, length) ->
                openExternal(Uri.parse(url)));

        WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
        transport.setWebView(authPopup);
        resultMsg.sendToTarget();
    }

    private boolean popupNavigate(Uri uri, boolean fromLogin) {
        if (isReadance(uri) || "about".equalsIgnoreCase(uri.getScheme())) return false;
        // Popup windows stay in the app, including multi-step identity provider redirects.
        if (isHttp(uri)) return false;
        openExternal(uri);
        closePopup(false);
        return true;
    }

    private void updatePopupHost(String url) {
        if (popupHost == null || url == null) return;
        Uri uri = Uri.parse(url);
        if (uri.getHost() != null) popupHost.setText(uri.getHost());
    }

    private void closePopup(boolean reload) {
        if (authPopup == null) return;
        WebView popup = authPopup;
        authPopup = null;
        if (popupPanel != null) {
            root.removeView(popupPanel);
            popupPanel.removeAllViews();
            popupPanel = null;
            popupHost = null;
        }
        popup.stopLoading();
        popup.destroy();
        CookieManager.getInstance().flush();
        if (reload && webView != null) webView.reload();
    }

    private void openExternal(Uri uri) {
        try {
            Intent intent;
            if ("intent".equalsIgnoreCase(uri.getScheme())) {
                intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
            } else {
                intent = new Intent(Intent.ACTION_VIEW, uri);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
            }
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "无法打开链接，请检查浏览器设置", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onBackPressed() {
        if (authPopup != null) {
            if (authPopup.canGoBack()) authPopup.goBack();
            else closePopup(true);
        } else if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        if (webView != null) webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    protected void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        closePopup(false);
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
