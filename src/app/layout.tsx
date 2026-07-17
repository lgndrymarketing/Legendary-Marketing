import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { brand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${brand.name} | ${brand.tagline}`,
  description: brand.description,
  metadataBase: new URL(brand.url),
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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#2954E5",
          colorBackground: "#ffffff",
          colorText: "#14151A",
          colorInputBackground: "#ffffff",
          colorInputText: "#14151A",
        },
      }}
    >
      <html
        lang="en"
        className={`${GeistSans.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
