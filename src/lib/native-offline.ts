/**
 * Offline behaviour for the native shell.
 *
 * The portal is server-driven, so a dropped connection would otherwise show
 * a blank webview. We cache the last successful payload of the screens
 * clients actually check on the move (dashboard, weekly reports, payments)
 * on the device, and serve it read-only when offline with a clear banner.
 *
 * Storage is Capacitor Preferences — the OS keychain/SharedPreferences on
 * the device. Nothing leaves the phone, and nothing is added server-side.
 * No-ops on the web.
 */

import { isNative } from "@/lib/native";

const KEY = (name: string) => `lgndry.cache.${name}`;

export async function cacheSnapshot(
  name: string,
  data: unknown
): Promise<void> {
  if (!isNative()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({
      key: KEY(name),
      value: JSON.stringify({ at: Date.now(), data }),
    });
  } catch {
    // Cache is best-effort; a failure just means no offline copy.
  }
}

export async function readSnapshot<T>(
  name: string
): Promise<{ at: number; data: T } | null> {
  if (!isNative()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: KEY(name) });
    if (!value) return null;
    return JSON.parse(value) as { at: number; data: T };
  } catch {
    return null;
  }
}

/** Current connectivity. Always true on the web (the browser handles it). */
export async function isOnline(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    return true;
  }
}

/** Subscribe to connectivity changes; returns an unsubscribe function. */
export async function onNetworkChange(
  cb: (online: boolean) => void
): Promise<() => void> {
  if (!isNative()) return () => {};
  try {
    const { Network } = await import("@capacitor/network");
    const handle = await Network.addListener("networkStatusChange", (s) =>
      cb(s.connected)
    );
    return () => void handle.remove();
  } catch {
    return () => {};
  }
}

/** Short tap of haptic feedback on a meaningful action. No-op on web. */
export async function tapFeedback(
  style: "light" | "medium" | "heavy" = "medium"
): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: map[style] });
  } catch {
    // Device without a taptic engine — silently skip.
  }
}

/** Native share sheet (weekly results, a report link). No-op on web. */
export async function shareNative(opts: {
  title: string;
  text: string;
  url?: string;
}): Promise<void> {
  if (!isNative()) {
    if (navigator.share) await navigator.share(opts).catch(() => {});
    return;
  }
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share(opts);
  } catch {
    // User dismissed the sheet.
  }
}
