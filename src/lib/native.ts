/**
 * Native bridge for the iOS/Android shell.
 *
 * No push notifications: the shell asks for no notification permission and
 * talks to no third party. Adding push later is additive — see README.
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
 * Universal/App links: when the OS hands us a lgndrymarketing.app URL
 * (an emailed invite, a shared report), route to it in-app rather than
 * bouncing the user to Safari.
 */
async function initDeepLinks(): Promise<void> {
  const { App } = await import("@capacitor/app");
  await App.addListener("appUrlOpen", ({ url }) => {
    try {
      const target = new URL(url);
      if (!target.hostname.endsWith("lgndrymarketing.app")) return;
      window.location.assign(target.pathname + target.search);
    } catch {
      // Malformed URL — ignore rather than crash the launch.
    }
  });
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
  await Promise.allSettled([initChrome(), initBackButton(), initDeepLinks()]);
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
