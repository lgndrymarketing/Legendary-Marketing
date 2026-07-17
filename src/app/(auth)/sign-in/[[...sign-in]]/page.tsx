import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4">
      <Link href="/" className="flex items-center gap-2">
        <Logo size={36} />
        <span className="text-lg font-semibold">Legendary Marketing</span>
      </Link>
      <SignIn forceRedirectUrl="/post-login" signUpUrl="/sign-up" />
    </div>
  );
}
