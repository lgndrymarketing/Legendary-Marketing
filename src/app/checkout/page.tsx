import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Shield } from "lucide-react";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";
import { getPricing, formatUsd } from "@/lib/pricing";
import { PayButton } from "./pay-button";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function CheckoutShell({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-2">
          <p className="text-destructive font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const projectIdParam = params.projectId;
  const projectId =
    typeof projectIdParam === "string" ? projectIdParam : undefined;

  if (!projectId || !UUID_REGEX.test(projectId)) {
    return (
      <CheckoutShell
        title="Invalid or missing project ID."
        message="Please use a valid checkout link."
      />
    );
  }

  // The user is already signed in (route is Clerk-protected). Confirm they may
  // access this project — a caught error means it's missing or not theirs.
  let project: Awaited<ReturnType<typeof verifyProjectAccess>>;
  try {
    const user = await getAuthenticatedUser();
    project = await verifyProjectAccess(projectId, user.id, user.role);
  } catch {
    return (
      <CheckoutShell
        title="We couldn't load this checkout."
        message="This project doesn't exist or isn't associated with your account."
      />
    );
  }

  const pricing = getPricing(project.serviceType);
  if (!pricing) {
    return (
      <CheckoutShell
        title="We couldn't price this project."
        message="Please contact support to complete your payment."
      />
    );
  }

  const isMonthly = pricing.billing === "monthly";
  const billingLabel = isMonthly ? "Billed monthly" : "One-time payment";
  const totalSuffix = isMonthly ? "/mo" : "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Logo size={48} className="mx-auto mb-4" />
          <CardTitle className="text-2xl">Complete Your Payment</CardTitle>
          <CardDescription>
            Secure checkout for {project.name} — {pricing.label}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border p-4 space-y-3">
            {pricing.lineItems.map((item) => (
              <div key={item.name} className="flex justify-between text-sm gap-4">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium whitespace-nowrap">
                  {formatUsd(item.amountCents)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <div>
                <span className="font-semibold">Total</span>
                <span className="block text-xs text-muted-foreground">
                  {billingLabel}
                </span>
              </div>
              <span className="font-bold text-orange text-lg whitespace-nowrap">
                {formatUsd(pricing.amountCents)}
                {totalSuffix}
              </span>
            </div>
          </div>

          <PayButton
            projectId={projectId}
            label={isMonthly ? "Start monthly plan" : "Pay now"}
          />

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Secure, encrypted payment via Creem.io</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
