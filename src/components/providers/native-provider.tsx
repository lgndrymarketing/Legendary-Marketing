"use client";

import { useEffect } from "react";
import { initNative } from "@/lib/native";

/**
 * Boots the native shell (status bar, splash, back button, push) once on
 * mount. Renders nothing and does nothing at all on the web — the Capacitor
 * plugins are only imported once `isNative()` is true, so the browser bundle
 * is unchanged.
 */
export function NativeProvider() {
  useEffect(() => {
    void initNative();
  }, []);
  return null;
}
