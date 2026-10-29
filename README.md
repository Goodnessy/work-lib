# Readance Android — unofficial personal launcher

Minimal Android Custom Tabs wrapper for https://readance.app/.
Not affiliated with or endorsed by Readance.

## Why Custom Tabs instead of WebView
Google prohibits OAuth from embedded Android WebViews. Custom Tabs run in the
real browser (Chrome, where available), sharing the browser's cookies and
authentication session. Login, redirect and continued reading therefore happen
in a single supported browser context.

## Behavior
- Opens Readance on launch in a Chrome Custom Tab.
- Keeps the full Readance website and its built-in Google login in the Custom Tab.
- If Chrome isn't installed, attempts another Custom Tabs browser.
- Browser toolbar cannot be fully hidden without verified website ownership.
- Chrome keeps its existing Readance session after closing and reopening.
- The small native launcher offers a reopen button after closing the tab.

## Requirements
Android 7.0+ (API 24). Uses AndroidX Browser 1.8.0, AGP 8.7.3.
The APK is debug signed for testing, not an official release.

## Installation
GitHub Actions uses an ephemeral debug signing key. To avoid a signature
mismatch, uninstall the previous test version before installing this build.
The old WebView local session is lost, but Chrome cookies remain unaffected.
