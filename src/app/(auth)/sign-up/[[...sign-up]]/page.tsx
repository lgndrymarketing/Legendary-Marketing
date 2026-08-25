import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import Aurora from "@/components/ui/aurora";
import { Beam } from "@/components/ui/beam-focus";

/**
 * Invitation-only sign-up. The portal is not open for public registration —
 * staff add clients and team members, and Clerk emails them an invite. That
 * invite link carries a `__clerk_ticket`, which is the ONLY way this page
 * renders; anyone else is sent to sign-in. (The route has to stay alive:
 * accepting an invitation and setting a password happens here.)
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ticket = params.__clerk_ticket;
  if (!ticket) redirect("/sign-in");

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
        <p className="bracket-label">[ Accept Your Invite ]</p>

        {/* Clerk handles the form itself */}
        <Beam>
          <SignUp
            forceRedirectUrl="/post-login"
            signInUrl="/sign-in"
            appearance={{
              elements: {
                footerAction: { display: "none" },
                footerActionLink: { display: "none" },
              },
            }}
          />
        </Beam>
      </div>
    </div>
  );
}
