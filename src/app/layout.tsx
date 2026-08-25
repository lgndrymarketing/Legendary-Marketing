import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemedClerkProvider } from "@/components/providers/clerk-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { brand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${brand.name} | ${brand.tagline}`,
  description: brand.description,
  metadataBase: new URL(brand.url),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brand.name,
  },
  openGraph: {
    title: `${brand.name} | ${brand.tagline}`,
    description: brand.description,
    url: brand.url,
    siteName: brand.name,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {/* Theme first: Clerk's appearance is derived from the resolved
            theme, so it has to sit inside the provider that resolves it. */}
        <ThemeProvider>
          <ThemedClerkProvider>{children}</ThemedClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
