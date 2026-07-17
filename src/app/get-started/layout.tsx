import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started | Legendary Marketing",
};

export default function GetStartedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
