import type { Metadata, Viewport } from "next";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://curtailment-tracker.kardashevlabs.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "US Curtailment Tracker | Kardashev Labs",
  description:
    "Daily solar and wind curtailment for CAISO, SPP, and ERCOT. 90-day history.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "US Curtailment Tracker | Kardashev Labs",
    description: "How much solar and wind CAISO, SPP, and ERCOT curtail each day.",
    url: siteUrl,
    siteName: "Kardashev Labs",
    images: [
      {
        url: "/images/og-duck-curve.png",
        width: 1200,
        height: 630,
        alt: "The duck curve: solar production vs net load",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "US Curtailment Tracker | Kardashev Labs",
    description: "How much solar and wind CAISO, SPP, and ERCOT curtail each day.",
    images: ["/images/og-duck-curve.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "US Curtailment Tracker",
      url: siteUrl,
      description:
        "Daily solar and wind curtailment across US ISOs, with a 90-day rolling history.",
      publisher: { "@id": "https://kardashevlabs.org#organization" },
    },
    {
      "@type": "Dataset",
      name: "US Curtailment Tracker Data",
      description:
        "Daily solar and wind curtailment across CAISO, SPP, and ERCOT. When the grid can't absorb all available solar and wind, operators instruct generators to produce less, even when the sun is shining or wind is blowing. High curtailment signals congested transmission, insufficient storage, or poor demand timing.",
      url: siteUrl,
      license: "https://opensource.org/licenses/MIT",
      creator: {
        "@id": "https://kardashevlabs.org#organization",
        "@type": "Organization",
        name: "Kardashev Labs",
        url: "https://kardashevlabs.org",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body style={{ fontFamily: "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
