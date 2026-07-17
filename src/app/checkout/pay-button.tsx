"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, ArrowRight, Loader2 } from "lucide-react";

interface PayButtonProps {
  projectId: string;
  label: string;
}

export function PayButton({ projectId, label }: PayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        setError("Something went wrong starting your payment. Please try again.");
        setLoading(false);
        return;
      }

      const data = (await res.json()) as {
        configured?: boolean;
        checkoutUrl?: string;
      };

      if (!data.configured || !data.checkoutUrl) {
        setError("Payment isn't configured yet. Please contact support.");
        setLoading(false);
        return;
      }

      // Hand off to the Creem-hosted checkout.
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant="glow"
        size="lg"
        className="w-full"
        onClick={handlePay}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Redirecting...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            {label}
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
