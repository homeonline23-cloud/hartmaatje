import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { PreferLocalhostForMic } from "@/components/PreferLocalhostForMic";
import { Providers } from "@/components/Providers";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    absolute: "HartMaatje",
    default: "HartMaatje",
  },
  applicationName: "HartMaatje",
  description:
    "HartMaatje is your calm companion at home / uw warme maatje in huis.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "HartMaatje",
    siteName: "HartMaatje",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#05381F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl-NL"
      suppressHydrationWarning
      className={`${sourceSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <title>HartMaatje</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.title="HartMaatje";`,
          }}
        />
      </head>
      <body className="min-h-full font-sans">
        <PreferLocalhostForMic />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
