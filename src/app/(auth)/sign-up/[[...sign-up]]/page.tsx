import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import Aurora from "@/components/ui/aurora";

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Subtle aurora glow pinned to the upper portion of the page */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[45vh] opacity-30">
        <Aurora
          colorStops={["#ff9953", "#F97316", "#9c4407"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      {/* Blueprint frame — centered column between two faint full-height hairlines (design.md §1.5) */}
      <div className="relative mx-auto flex w-full max-w-[26rem] flex-1 flex-col border-x border-border">
        {/* Top spacer band */}
        <div className="relative h-16 border-b border-border sm:h-24">
          <div
            className="dot-texture pointer-events-none absolute inset-0"
            style={{
              maskImage: "linear-gradient(to bottom, black, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
            }}
          />
        </div>

        {/* Logo band */}
        <div className="flex flex-col items-center gap-3 border-b border-border px-6 py-8">
          <Link href="/" className="flex flex-col items-center gap-3">
            <Logo size={72} />
          </Link>
          <p className="bracket-label">[ Client Portal ]</p>
        </div>

        {/* Widget band — Clerk handles the form itself */}
        <div className="flex flex-1 flex-col items-center justify-center border-b border-border py-10">
          <SignUp forceRedirectUrl="/onboarding" signInUrl="/sign-in" />
        </div>

        {/* Bottom spacer band */}
        <div className="h-16 sm:h-24" />
      </div>
    </div>
  );
}
