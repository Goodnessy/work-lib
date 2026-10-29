package app.readance.unofficial;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;

public class MainActivity extends Activity {
    private static final Uri HOME = Uri.parse("https://readance.app/");
    private boolean launchedOnce = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR |
                View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setGravity(Gravity.CENTER);
        page.setPadding(dp(28), dp(24), dp(28), dp(24));
        page.setBackgroundColor(Color.WHITE);

        TextView heading = new TextView(this);
        heading.setText("Readance");
        heading.setTextSize(28);
        heading.setTextColor(Color.rgb(22, 56, 47));
        heading.setGravity(Gravity.CENTER);
        page.addView(heading, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView hint = new TextView(this);
        hint.setText("使用浏览器安全登录 Google 账号，\n阅读和登录在同一会话中完成。");
        hint.setTextSize(14);
        hint.setTextColor(Color.DKGRAY);
        hint.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams hintParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        hintParams.topMargin = dp(12);
        page.addView(hint, hintParams);

        Button open = new Button(this);
        open.setText("打开 Readance");
        open.setAllCaps(false);
        open.setOnClickListener(v -> openReadance());
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
        buttonParams.topMargin = dp(24);
        page.addView(open, buttonParams);
        setContentView(page);

        if (savedInstanceState == null) {
            page.post(this::openReadance);
        } else {
            launchedOnce = savedInstanceState.getBoolean("launchedOnce", false);
        }
    }

    private int dp(float dimension) {
        return (int) (dimension * getResources().getDisplayMetrics().density + .5f);
    }

    private void openReadance() {
        launchedOnce = true;
        CustomTabColorSchemeParams colors = new CustomTabColorSchemeParams.Builder()
                .setToolbarColor(Color.WHITE)
                .setNavigationBarColor(Color.WHITE)
                .build();
        CustomTabsIntent tab = new CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(colors)
                .setShowTitle(false)
                .setUrlBarHidingEnabled(true)
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .build();

        // Chrome Custom Tabs share Chrome's cookie jar. Google sign-in completes
        // in the same browser session used for Readance (unlike Android WebView).
        tab.intent.setPackage("com.android.chrome");
        try {
            tab.launchUrl(this, HOME);
        } catch (ActivityNotFoundException chromeMissing) {
            // Other Custom Tabs providers are also allowed, but share that
            // browser's cookies rather than Chrome's.
            tab.intent.setPackage(null);
            try {
                tab.launchUrl(this, HOME);
            } catch (ActivityNotFoundException noCustomTabsBrowser) {
                Intent external = new Intent(Intent.ACTION_VIEW, HOME);
                startActivity(external);
            }
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        outState.putBoolean("launchedOnce", launchedOnce);
        super.onSaveInstanceState(outState);
    }
}
