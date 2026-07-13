import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { HomeCompanionProvider } from "@/context/HomeCompanionContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { HartMaatjeSiteShell } from "@/components/HartMaatjeSiteShell";
import {
  DEFAULT_APP_LANG,
  LANG_COOKIE_NAME,
  parseAppLang,
} from "@/lib/languages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://hartmaatje.nl";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "HartMaatje — Uw rustige maatje",
  description:
    "HartMaatje is een warm maatje voor ouderen — iemand om mee te praten, ook als het eenzaam voelt. Rustig praten, luisteren, herinneringen delen en dagelijks even contact.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "HartMaatje — Uw rustige maatje",
    description:
      "HartMaatje is een warm maatje voor ouderen. Rustig praten, luisteren en dagelijks even contact.",
    url: siteUrl,
    siteName: "HartMaatje",
    locale: "nl_NL",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "HartMaatje logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "HartMaatje — Uw rustige maatje",
    description:
      "HartMaatje is een warm maatje voor ouderen.",
    images: ["/logo.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#05381F",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLang =
    parseAppLang(cookieStore.get(LANG_COOKIE_NAME)?.value) ?? DEFAULT_APP_LANG;

  return (
    <html
      lang={initialLang}
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>
          <LanguageProvider initialLang={initialLang}>
            <HomeCompanionProvider>
              <HartMaatjeSiteShell>{children}</HartMaatjeSiteShell>
            </HomeCompanionProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
