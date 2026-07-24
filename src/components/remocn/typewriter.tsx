"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Typewriter — types `text` out once on mount, then stops. No looping.
 *
 * Notes on the details that matter here:
 * - Space is reserved by rendering the full string invisibly underneath, so
 *   a title typing in never reflows the page around it.
 * - Screen readers get the finished string once (the animated glyphs are
 *   aria-hidden), instead of a stuttering character-by-character live region.
 * - `prefers-reduced-motion` renders the text immediately, no animation.
 * - Presentation props are optional: omit them and the component inherits
 *   the surrounding typography, which is how page titles use it.
 */
export function Typewriter({
  text,
  cursor = true,
  charsPerSecond = 22,
  fontSize,
  color,
  cursorColor,
  fontWeight,
  speed = 1,
  className,
  onDone,
}: {
  text: string;
  /** Show the caret while typing (fades out when finished). */
  cursor?: boolean;
  /** Characters revealed per second, before `speed` is applied. */
  charsPerSecond?: number;
  fontSize?: number | string;
  color?: string;
  cursorColor?: string;
  fontWeight?: number | string;
  /** Multiplier on `charsPerSecond`. */
  speed?: number;
  className?: string;
  onDone?: () => void;
}) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(onDone);

  // Keep the callback current without re-running the typing effect.
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const cps = Math.max(1, charsPerSecond * (speed || 1));

    let raf = 0;
    const finish = () => {
      setCount(text.length);
      setDone(true);
      doneRef.current?.();
    };

    // Reduced motion (or empty text): land on the final string next frame.
    if (reduced || !text) {
      raf = requestAnimationFrame(finish);
      return () => cancelAnimationFrame(raf);
    }

    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) {
        // First frame of a fresh run — reset in case `text` changed.
        start = now;
        setDone(false);
        setCount(0);
        raf = requestAnimationFrame(tick);
        return;
      }
      const revealed = Math.floor(((now - start) / 1000) * cps);
      if (revealed >= text.length) {
        finish();
        return;
      }
      setCount(revealed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, charsPerSecond, speed]);

  const style: React.CSSProperties = {
    ...(fontSize !== undefined && {
      fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize,
    }),
    ...(color !== undefined && { color }),
    ...(fontWeight !== undefined && { fontWeight }),
  };

  return (
    <span className={cn("relative inline-block", className)} style={style}>
      {/* Reserves the final size so nothing reflows while typing. */}
      <span aria-hidden className="invisible">
        {text}
      </span>
      <span className="absolute inset-0" aria-hidden>
        {text.slice(0, count)}
        {cursor && (
          <motion.span
            aria-hidden
            className="ml-0.5 inline-block w-[0.06em] align-baseline"
            style={{
              height: "0.9em",
              backgroundColor: cursorColor ?? color ?? "currentColor",
              verticalAlign: "-0.08em",
            }}
            initial={{ opacity: 1 }}
            animate={done ? { opacity: 0 } : { opacity: [1, 1, 0, 0] }}
            transition={
              done
                ? { duration: 0.4, delay: 0.35 }
                : { duration: 0.9, repeat: Infinity, times: [0, 0.5, 0.5, 1] }
            }
          />
        )}
      </span>
      {/* The real, stable string for assistive tech. */}
      <span className="sr-only">{text}</span>
    </span>
  );
}
