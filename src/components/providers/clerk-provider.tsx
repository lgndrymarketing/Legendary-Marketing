"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

/**
 * Clerk, themed with the app's own palette.
 *
 * The appearance used to be a fixed set of hex values — white background,
 * near-black text — which stayed put when the app switched to dark, so the
 * sign-in card came out inverted against the page. Clerk parses these colors
 * to derive its own shades, so they have to be real values rather than
 * `var(--token)` references: this reads the resolved theme and hands Clerk
 * the matching palette, keeping the two in step.
 */

const PALETTES = {
  light: {
    colorPrimary: "#F54A00",
    colorBackground: "#ffffff",
    colorText: "#0F1010",
    colorTextSecondary: "#7A7F85",
    colorInputBackground: "#ffffff",
    colorInputText: "#0F1010",
    colorDanger: "#DC2626",
    colorSuccess: "#16A34A",
    colorWarning: "#D97706",
  },
  dark: {
    colorPrimary: "#FF6A2B",
    colorBackground: "#12141B",
    colorText: "#F5F6F8",
    colorTextSecondary: "#9096A6",
    colorInputBackground: "#1A1D26",
    colorInputText: "#F5F6F8",
    colorDanger: "#DC2626",
    colorSuccess: "#22C55E",
    colorWarning: "#F0A24A",
  },
} as const;

export function ThemedClerkProvider({ children }: { children: ReactNode }) {
  // resolvedTheme is undefined until next-themes has read the browser on the
  // client, so this falls to light for the server render and the hydration
  // that follows it — the two agree — then re-renders once the real theme
  // arrives. No mounted flag needed.
  const { resolvedTheme } = useTheme();
  const palette = resolvedTheme === "dark" ? PALETTES.dark : PALETTES.light;

  return (
    <ClerkProvider
      appearance={{
        variables: {
          ...palette,
          borderRadius: "0.625rem",
          fontFamily: "var(--font-geist-sans)",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
