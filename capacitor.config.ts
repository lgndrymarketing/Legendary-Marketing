import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

/**
 * Native shell for the LGNDRY client portal (iOS + Android).
 *
 * Server-driven on purpose: `server.url` points the native webview at the
 * deployed Next.js app, so SSR, API routes, Clerk auth, and realtime all
 * keep working exactly as they do on the web. There is no static export and
 * no second copy of the UI — shipping to the web ships to both stores.
 *
 * `webDir` is only a fallback shell used if the device is offline before the
 * first load; the real app always comes from server.url.
 *
 * Set NEXT_PUBLIC_APP_URL (or CAP_SERVER_URL) before `pnpm cap:sync` to
 * point a build at staging instead of production.
 */
const serverUrl =
  process.env.CAP_SERVER_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://lgndrymarketing.app";

const config: CapacitorConfig = {
  appId: "com.lgndrymarketing.portal",
  appName: "LGNDRY",
  webDir: "native/shell",
  server: {
    url: serverUrl,
    // The portal is HTTPS-only; never silently downgrade.
    cleartext: false,
    // Keep navigation to our own domains inside the app; everything else
    // (Drive links, client landing pages) opens in the system browser.
    allowNavigation: ["lgndrymarketing.app", "*.lgndrymarketing.app"],
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    Keyboard: {
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
