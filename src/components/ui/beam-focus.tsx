"use client";

import { useState } from "react";
import { BorderBeam } from "border-beam";

/**
 * Focus-triggered border beam for important inputs and cards, per the
 * client's spec: `border-beam` package, size="line", colorVariant="sunset".
 * The beam runs while any field inside has focus. theme="auto" keeps it
 * legible in both color schemes (the product is light-first).
 */
export function FocusBeam({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <BorderBeam
      size="line"
      colorVariant="sunset"
      theme="auto"
      active={focused}
      className={className}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        // Only deactivate when focus truly leaves the card, not when it
        // moves between fields inside it.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      {children}
    </BorderBeam>
  );
}
