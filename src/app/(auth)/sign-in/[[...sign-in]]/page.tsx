import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import Aurora from "@/components/ui/aurora";
import { Beam } from "@/components/ui/beam-focus";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Subtle aurora glow pinned to the upper portion of the page */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[45vh] opacity-35">
        <Aurora
          colorStops={["#FFB347", "#FF7A00", "#F97316"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[26rem] flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
        <Link href="/" className="flex flex-col items-center gap-3">
          <Logo size={72} />
        </Link>
        <p className="bracket-label">[ Client Portal ]</p>

        {/* Clerk handles the form itself; the beam is the one brand moment.
            No sign-up link — the portal is invitation-only (staff add
            clients and team members, Clerk emails the invite). */}
        <Beam>
          <SignIn
            forceRedirectUrl="/post-login"
            appearance={{
              elements: {
                footerAction: { display: "none" },
                footerActionLink: { display: "none" },
              },
            }}
          />
        </Beam>
        <p className="max-w-xs text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
          Access is by invitation. If your agency hasn&apos;t sent one yet,
          reach out and they&apos;ll add you.
        </p>
      </div>
    </div>
  );
}
