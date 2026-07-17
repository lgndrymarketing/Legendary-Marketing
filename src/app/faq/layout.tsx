import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | Legendary Marketing",
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
