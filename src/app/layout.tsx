import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { connection } from "next/server";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getServerI18n } from "@/lib/i18n-server";
import { getSourceCodeUrl } from "@/lib/runtime-config";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: `WallettuTrack — ${t("Personal Finance Manager")}`,
    description: t(
      "Track daily, weekly, and monthly spending with a calendar, statistics, multiple currencies, and budgets."
    ),
    manifest: "/api/manifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "WallettuTrack",
    },
    icons: {
      icon: "/icon.svg",
      apple: [
        {
          url: "/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    robots: { index: false, follow: false, noarchive: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const [{ locale, t }, requestHeaders] = await Promise.all([
    getServerI18n(),
    headers(),
  ]);
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const sourceCodeUrl = getSourceCodeUrl();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers nonce={nonce} locale={locale}>
          {children}
          <PwaRegister />
          <footer className="flex flex-wrap justify-center gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
            <Link href="/privacy" className="underline underline-offset-4">
              {t("Privacy")}
            </Link>
            <Link href="/terms" className="underline underline-offset-4">
              {t("Terms of use")}
            </Link>
            {sourceCodeUrl && (
              <a
                href={sourceCodeUrl}
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {t("Source code")}
              </a>
            )}
            <LanguageSwitcher />
          </footer>
        </Providers>
      </body>
    </html>
  );
}
