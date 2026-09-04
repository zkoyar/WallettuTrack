"use client";

import { useI18n } from "@/components/i18n-provider";

export function PrintButton() {
  const { t } = useI18n();
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      🖨️ {t("Print / Save as PDF")}
    </button>
  );
}
