import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "US Curtailment Tracker — Kardashev Labs",
  description:
    "Daily solar and wind curtailment across US ISOs — CAISO, ERCOT, and more. How much clean energy is being thrown away every day.",
  openGraph: {
    title: "US Curtailment Tracker — Kardashev Labs",
    description: "Daily solar and wind curtailment across US ISOs.",
    url: "https://curtailment.kardashevlabs.org",
    siteName: "Kardashev Labs",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
