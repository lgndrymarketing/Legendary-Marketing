"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

/**
 * Clerk, themed with the app's own palette.
 *
 * Two things to know before editing this:
 *
 * 1. The variable names below are this Clerk version's names. The older ones
 *    — colorText, colorInputBackground, colorInputText, colorTextSecondary —
 *    are silently ignored, which is what left the sign-in card white with
 *    dark inputs against a dark page. `@clerk/ui` isn't a local dependency,
 *    so `skipLibCheck` means TypeScript will not catch a wrong key here.
 *    Check the rendered widget, not the compiler.
 *
 * 2. Clerk parses these colors to derive its own shades, so they have to be
 *    real values rather than `var(--token)` references. That's why the
 *    palette is duplicated here instead of pointing at the CSS variables,
 *    and why it's selected from the resolved theme.
 */

const PALETTES = {
  light: {
    colorPrimary: "#F54A00",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "#ffffff",
    colorForeground: "#0F1010",
    colorMutedForeground: "#7A7F85",
    colorMuted: "#F7F7F7",
    colorInput: "#ffffff",
    colorInputForeground: "#0F1010",
    colorBorder: "#ECECEC",
    colorNeutral: "#0F1010",
    colorRing: "#F54A00",
    colorDanger: "#DC2626",
    colorSuccess: "#16A34A",
    colorWarning: "#D97706",
  },
  dark: {
    colorPrimary: "#FF6A2B",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "#12141B",
    colorForeground: "#F5F6F8",
    colorMutedForeground: "#9096A6",
    colorMuted: "#1A1D26",
    colorInput: "#1A1D26",
    colorInputForeground: "#F5F6F8",
    colorBorder: "#262A36",
    colorNeutral: "#F5F6F8",
    colorRing: "#FF6A2B",
    colorDanger: "#DC2626",
    colorSuccess: "#22C55E",
    colorWarning: "#F0A24A",
  },
} as const;

export function ThemedClerkProvider({ children }: { children: ReactNode }) {
  // resolvedTheme is undefined until next-themes has read the browser on the
  // client, so this falls to light for the server render and the hydration
  // that follows it — the two agree — then re-renders once the real theme
  // arrives.
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
