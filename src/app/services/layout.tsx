import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services | Legendary Marketing",
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
