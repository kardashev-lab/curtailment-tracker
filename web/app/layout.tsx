import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://curtailment.kardashevlabs.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "US Curtailment Tracker — Kardashev Labs",
  description:
    "Daily solar and wind curtailment across US ISOs — CAISO leads the nation. The duck curve problem made visible.",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "US Curtailment Tracker — Kardashev Labs",
    description: "How much clean energy is being thrown away every day — by ISO.",
    url: siteUrl,
    siteName: "Kardashev Labs",
    images: [
      {
        url: "/images/og-duck-curve.png",
        width: 1200,
        height: 630,
        alt: "The duck curve — solar production vs net load",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "US Curtailment Tracker — Kardashev Labs",
    description: "How much clean energy is being thrown away every day — by ISO.",
    images: ["/images/og-duck-curve.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body style={{ fontFamily: "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)" }}>
        <Header />
        {children}
      </body>
    </html>
  );
}
