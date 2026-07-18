import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

/* Native dimensions of public/logo.png — used to keep the aspect ratio. */
const LOGO_WIDTH = 545;
const LOGO_HEIGHT = 481;

/** LGNDRY mark — the official logo, rendered at the requested height. */
export function Logo({ size = 32, className }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="LGNDRY"
      height={size}
      width={Math.round((size * LOGO_WIDTH) / LOGO_HEIGHT)}
      className={cn("shrink-0", className)}
      priority
    />
  );
}

/** Full lockup — the logo already carries the LGNDRY wordmark, so this is the
 * same mark at a slightly larger default size. Kept for API compatibility. */
export function LogoWordmark({ size = 40, className }: LogoProps) {
  return <Logo size={size} className={className} />;
}
