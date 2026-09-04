import { getServerI18n } from "@/lib/i18n-server";

export async function GET() {
  const { locale, t } = await getServerI18n();

  return Response.json(
    {
      name: `WallettuTrack — ${t("Personal Finance Manager")}`,
      short_name: "WallettuTrack",
      description: t(
        "Track and plan your expenses with a calendar, forecasts, budgets, and multiple currencies."
      ),
      start_url: "/dashboard",
      scope: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#0a0a0a",
      theme_color: "#6366f1",
      lang: locale,
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "private, no-cache",
        Vary: "Cookie, Accept-Language",
      },
    }
  );
}
