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
      <path
        d="M9 8.5V21.5H15.5V19.2H11.6V8.5H9Z"
        fill="white"
      />
      <path
        d="M17.5 8.5L20.3 15.2L23.1 8.5H25.5V21.5H23.1V13L20.9 18.3H19.6L17.5 13V21.5H15.1V8.5H17.5Z"
        fill="white"
        fillOpacity="0.85"
      />
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
