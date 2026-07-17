import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

/** LM monogram mark — used wherever the full wordmark doesn't fit. */
export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Legendary Marketing"
    >
      <rect width="32" height="32" rx="8" className="fill-orange" />
      <text
        x="16"
        y="16"
        fill="white"
        fontFamily="var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontSize="14"
        fontWeight="700"
        letterSpacing="0.5"
        textAnchor="middle"
        dominantBaseline="central"
      >
        LM
      </text>
    </svg>
  );
}

/** Full lockup — monogram + wordmark. */
export function LogoWordmark({ size = 28, className }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo size={size} />
      <span className="text-base font-semibold tracking-tight text-foreground">
        Legendary <span className="text-gradient-orange">Marketing</span>
      </span>
    </span>
  );
}
