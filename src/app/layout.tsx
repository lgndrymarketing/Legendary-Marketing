import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fortitudo Agency | Digital Solutions Built for Growth",
  description:
    "Web applications, ecommerce stores, funnels, AI automation, and more. Choose your service and watch your project come to life.",
  metadataBase: new URL("https://foritudo.agency"),
  openGraph: {
    title: "Fortitudo Agency | Digital Solutions Built for Growth",
    description:
      "Web applications, ecommerce stores, funnels, AI automation, and more.",
    url: "https://foritudo.agency",
    siteName: "Fortitudo Agency",
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
          colorPrimary: "#F97316",
          colorBackground: "#141414",
          colorText: "#F5F5F5",
          colorInputBackground: "#1C1C1C",
          colorInputText: "#F5F5F5",
        },
      }}
    >
      <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
        <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
