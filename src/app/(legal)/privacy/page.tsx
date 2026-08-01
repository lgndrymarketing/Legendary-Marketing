import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy Policy | ${brand.name}`,
  description: `How ${brand.name} collects, uses, and protects information in the client portal and mobile apps.`,
};

/**
 * Public privacy policy. Required by both the App Store and Google Play
 * (each needs a publicly reachable URL), and referenced from the iOS
 * privacy nutrition label / Play Data Safety form.
 *
 * Deliberately public — no auth — so store reviewers can open it.
 */

const UPDATED = "August 1, 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="inline-flex">
        <Logo size={48} />
      </Link>

      <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        Last updated {UPDATED}
      </p>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        {brand.name} operates a private client portal for the businesses we run
        marketing for, available on the web and as iOS and Android apps. This
        policy explains what we collect and why. The portal is invitation-only
        — it is not open to public sign-up.
      </p>

      <div className="mt-10 space-y-8">
        <Section title="Information we collect">
          <p>
            <strong className="text-foreground">Account information.</strong>{" "}
            Your name and email address, provided by your agency contact when
            they create your account. Authentication (including your password)
            is handled by our identity provider, Clerk — we never see or store
            your password.
          </p>
          <p>
            <strong className="text-foreground">Business information.</strong>{" "}
            Details about your company and engagement: company name, industry,
            service package, project milestones, campaign performance figures,
            and payment records for the services we invoice you for.
          </p>
          <p>
            <strong className="text-foreground">Content you submit.</strong>{" "}
            Messages to our team, files you upload, revision requests, and the
            sales figures you enter on your weekly reports.
          </p>
          <p>
            <strong className="text-foreground">
              What the mobile apps do not collect.
            </strong>{" "}
            The apps request no location, contacts, photos, microphone, or
            camera access, contain no advertising or analytics SDKs, and do not
            track you across other apps or websites. Reminders are scheduled on
            your device and are not sent through any notification service.
          </p>
        </Section>

        <Section title="How we use it">
          <p>
            To operate the portal: show your project status and results,
            exchange messages and files with our team, and track the invoices
            and payments for your engagement. We do not sell your information,
            and we do not use it for advertising.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>
            Only the service providers required to run the portal, each acting
            on our instructions: Clerk (authentication), Supabase (database
            hosting), Vercel (application hosting), Ably (real-time messaging),
            UploadThing (file storage), and GoHighLevel (our CRM, where your
            contact record and pipeline are mirrored).
          </p>
          <p>
            We may disclose information if required by law. We do not sell or
            rent personal information to anyone.
          </p>
        </Section>

        <Section title="Data storage and security">
          <p>
            Data is stored in the United States. Access is restricted to your
            own records — you can see only your projects, reports, files, and
            invoices — and enforced on every request. Agency staff access is
            limited by role. Connections are encrypted in transit.
          </p>
        </Section>

        <Section title="Retention">
          <p>
            We keep your information for as long as your engagement is active
            and afterwards as needed for our business and financial records.
            You can ask us to delete your account at any time.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            You can request access to, correction of, or deletion of your
            information by emailing us. Deleting the app removes any reminders
            and cached data held on your device. If you were invited but never
            accepted, ask us and we will remove the invitation.
          </p>
        </Section>

        <Section title="Children">
          <p>
            The portal is a business tool and is not directed to anyone under
            18. We do not knowingly collect information from children.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If we make material changes we will update the date at the top of
            this page and, where appropriate, notify you in the portal.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy or your data:{" "}
            <a
              href={`mailto:${brand.supportEmail}`}
              className="text-orange hover:underline"
            >
              {brand.supportEmail}
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
