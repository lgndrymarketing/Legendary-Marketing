/**
 * Native bridge for the iOS/Android shell.
 *
 * Everything here is a no-op on the web. The Capacitor plugins are loaded
 * with dynamic `import()` *inside* the native guard, so the browser bundle
 * never pulls them in and the web app behaves exactly as it did before this
 * existed. Nothing in this module may throw — a failed native call must
 * never take the portal down.
 */

/** True only inside the packaged iOS/Android app. */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return !!cap?.isNativePlatform?.();
}

/** "ios" | "android" | "web" */
export function nativePlatform(): string {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } })
    .Capacitor;
  return cap?.getPlatform?.() ?? "web";
}

/**
 * Register for push and hand the device token to our API so the existing
 * notification system can reach the phone. Permission is requested on first
 * launch; a denial is remembered by the OS and simply means no pushes.
 */
async function initPush(): Promise<void> {
  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;

  await PushNotifications.addListener("registration", async (token) => {
    try {
      await fetch("/api/device-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.value, platform: nativePlatform() }),
      });
    } catch {
      // Offline or signed out — the token re-registers on next launch.
    }
  });

  await PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration failed:", err);
  });

  // Tapping a notification deep-links to whatever the payload points at.
  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      const url = action.notification.data?.url;
      if (typeof url === "string" && url.startsWith("/")) {
        window.location.assign(url);
      }
    }
  );

  await PushNotifications.register();
}

/** Android hardware back button: go back in history, else leave the app. */
async function initBackButton(): Promise<void> {
  const { App } = await import("@capacitor/app");
  await App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });
}

async function initChrome(): Promise<void> {
  const [{ StatusBar, Style }, { SplashScreen }, { Keyboard }] =
    await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
      import("@capacitor/keyboard"),
    ]);

  // The portal is light-first, so dark glyphs on a light bar.
  await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  await Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
  await SplashScreen.hide().catch(() => {});
}

/**
 * Called once from the client shell. Safe to call on the web (returns
 * immediately) and safe to call twice.
 */
let started = false;
export async function initNative(): Promise<void> {
  if (started || !isNative()) return;
  started = true;
  document.documentElement.dataset.native = nativePlatform();
  await Promise.allSettled([initChrome(), initBackButton(), initPush()]);
}

/**
 * Open an external link outside the webview (Drive folders, client landing
 * pages). On the web this is just a normal new tab.
 */
export async function openExternal(url: string): Promise<void> {
  if (!isNative()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}
