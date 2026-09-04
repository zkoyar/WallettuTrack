"use client";

import { useEffect } from "react";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    console.error("App segment error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="grid max-w-md gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertTriangleIcon className="mx-auto size-10 text-destructive" />
        <h1 className="text-lg font-semibold">{t("Something went wrong")}</h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "An unexpected error occurred while loading. Your data is safe — try again."
          )}
        </p>
        <Button onClick={reset} className="mx-auto gap-2">
          <RotateCcwIcon className="size-4" />
          {t("Try again")}
        </Button>
      </div>
    </div>
  );
}
