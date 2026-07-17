import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const footerLinks = {
  services: [
    { label: "Paid Advertising", href: "/services#paid-advertising" },
    { label: "High-Converting Funnels", href: "/services#funnel-build" },
    { label: "Websites & Landing Pages", href: "/services#website-design" },
    { label: "CRM & Automation", href: "/services#crm-automation" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "Pricing", href: "/pricing" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/faq" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Client Login", href: "/sign-in" },
  ],
};

export function Footer() {
  return (
    <footer className="px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-7xl rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-10 sm:px-8 sm:py-12 lg:px-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Link href="/" className="flex items-center gap-2">
                <Logo size={32} />
                <span className="text-lg font-semibold">Legendary Marketing</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs">
                Paid ads, funnels, and CRM automation built for growth.
                Transparent process, real-time tracking, direct collaboration.
              </p>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Services</h4>
              <ul className="space-y-2.5">
                {footerLinks.services.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/50 px-6 py-4 sm:px-8 lg:px-12 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Legendary Marketing. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            legendarymarketing.com
          </p>
        </div>
      </div>
    </footer>
  );
}
