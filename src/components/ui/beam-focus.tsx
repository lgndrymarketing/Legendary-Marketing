"use client";

import { useState } from "react";
import { BorderBeam } from "border-beam";

/**
 * Always-on border beam — used sparingly, only where the light carries
 * meaning: the auth card (brand moment), an unsettled partner balance,
 * a weekly report awaiting the client. Slightly slowed for calm.
 * Pass `active={false}` to rest it (e.g. balance settled).
 */
export function Beam({
  children,
  className,
  active = true,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <BorderBeam
      size="line"
      colorVariant="sunset"
      theme="auto"
      duration={3.2}
      active={active}
      className={className}
    >
      {children}
    </BorderBeam>
  );
}

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
