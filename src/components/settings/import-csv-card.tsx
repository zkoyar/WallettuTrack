"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileSearchIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  UploadIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiSend, useApiData } from "@/lib/api-client";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/dates";
import { useI18n } from "@/components/i18n-provider";

interface PreviewRow {
  externalId: string;
  date: string;
  type: "EXPENSE" | "INCOME";
  amount: number;
  currency: string;
  description: string | null;
  category: string | null;
  status: "new" | "duplicate";
}

interface PreviewResult {
  source: "revolut" | "generic";
  fileName: string;
  totalRows: number;
  importable: number;
  duplicates: number;
  skipped: number;
  skippedByType: Record<string, number>;
  byCategory: Record<string, number>;
  errors: { row: number; message: string }[];
  rows: PreviewRow[];
  rowsShown: number;
  rowsAvailable: number;
}

interface ImportResult {
  source: "revolut" | "generic";
  inserted: number;
  duplicates: number;
  skipped: number;
  skippedByType?: Record<string, number>;
  byCategory?: Record<string, number>;
  errors: { row: number; message: string }[];
}

interface ImportBatchItem {
  id: string;
  fileName: string;
  source: string;
  totalRows: number;
  importedRows: number;
  remainingRows: number;
  duplicateRows: number;
  skippedRows: number;
  createdAt: string;
  undoneAt: string | null;
}

const SKIPPED_LABELS: Record<string, string> = {
  pendingSkipped: "pending/not completed",
  topupSkipped: "top-ups",
  exchangeSkipped: "currency exchanges",
  internalSkipped: "internal pocket movements",
  revPointsSkipped: "RevPoints savings",
  otherSkipped: "other",
};

export function ImportCsvCard() {
  const router = useRouter();
  const { intlLocale, t } = useI18n();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const history = useApiData<{ items: ImportBatchItem[] }>(
    "/api/import/batches",
    { silentError: true }
  );
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<PreviewResult | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [working, setWorking] = React.useState<"preview" | "commit" | null>(
    null
  );
  const [undoBatch, setUndoBatch] = React.useState<ImportBatchItem | null>(null);
  const [undoing, setUndoing] = React.useState(false);
  const [ignoreTopup, setIgnoreTopup] = React.useState(true);
  const [ignoreExchange, setIgnoreExchange] = React.useState(true);
  const [ignoreInternal, setIgnoreInternal] = React.useState(true);
  const [ignoreRevPoints, setIgnoreRevPoints] = React.useState(true);

  function resetPreview() {
    setPreview(null);
    setResult(null);
  }

  function buildForm(mode: "preview" | "commit"): FormData | null {
    if (!file) return null;
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    form.append("ignoreTopup", ignoreTopup ? "1" : "0");
    form.append("ignoreExchange", ignoreExchange ? "1" : "0");
    form.append("ignoreInternal", ignoreInternal ? "1" : "0");
    form.append("ignoreRevPoints", ignoreRevPoints ? "1" : "0");
    return form;
  }

  async function analyzeFile() {
    const form = buildForm("preview");
    if (!form) return;
    setWorking("preview");
    setPreview(null);
    setResult(null);
    try {
      const response = await fetch("/api/import", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(t(data?.error ?? "File analysis failed"));
        return;
      }
      setPreview(data as PreviewResult);
    } catch {
      toast.error(t("Error while analyzing the file"));
    } finally {
      setWorking(null);
    }
  }

  async function importFile() {
    const form = buildForm("commit");
    if (!form || !preview) return;
    setWorking("commit");
    try {
      const response = await fetch("/api/import", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(t(data?.error ?? "Import failed"));
        return;
      }
      setResult(data as ImportResult);
      setPreview(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success(
        t("Imported {count} transactions", { count: data.inserted }) +
          (data.duplicates
            ? t(", {count} duplicates skipped", { count: data.duplicates })
            : "")
      );
      await history.refresh();
      router.refresh();
    } catch {
      toast.error(t("Error during import"));
    } finally {
      setWorking(null);
    }
  }

  async function confirmUndo() {
    if (!undoBatch) return;
    setUndoing(true);
    const { ok, data, error } = await apiSend<{ ok: true; deleted: number }>(
      `/api/import/batches/${undoBatch.id}`,
      "DELETE"
    );
    setUndoing(false);
    if (!ok) {
      toast.error(t(error ?? "Could not undo import"));
      return;
    }
    toast.success(t("Removed {count} imported transactions", {
      count: data?.deleted ?? 0,
    }));
    setUndoBatch(null);
    await history.refresh();
    router.refresh();
  }

  const updateOption = (setter: (value: boolean) => void, value: boolean) => {
    setter(value);
    resetPreview();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("CSV import")}</CardTitle>
          <CardDescription>
            {t("Upload a")} <strong>Revolut</strong>{" "}
            {t("statement, including the supported Italian-language format, or a generic CSV with columns")}{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">date, type, category, amount, currency, description, notes</code>.
            {" "}{t("You will preview rows, categories, and duplicates before importing.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-medium">{t("Revolut statement options")}</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <ImportOption
                checked={ignoreTopup}
                onChange={(value) => updateOption(setIgnoreTopup, value)}
                label={t("Ignore top-ups")}
              />
              <ImportOption
                checked={ignoreInternal}
                onChange={(value) => updateOption(setIgnoreInternal, value)}
                label={t("Ignore transfers and pockets")}
              />
              <ImportOption
                checked={ignoreRevPoints}
                onChange={(value) => updateOption(setIgnoreRevPoints, value)}
                label={t("Ignore RevPoints spare change")}
              />
              <ImportOption
                checked={ignoreExchange}
                onChange={(value) => updateOption(setIgnoreExchange, value)}
                label={t("Ignore currency exchanges")}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              disabled={working !== null}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                resetPreview();
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!file || working !== null}
              onClick={analyzeFile}
            >
              {working === "preview" ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <FileSearchIcon />
              )}
              {t("Analyze file")}
            </Button>
          </div>

          {preview && (
            <div className="grid gap-3 rounded-lg border p-3">
              <ImportSummary result={preview} preview />
              <div className="max-h-80 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Date")}</TableHead>
                      <TableHead>{t("Description")}</TableHead>
                      <TableHead>{t("Category")}</TableHead>
                      <TableHead className="text-right">{t("Amount")}</TableHead>
                      <TableHead>{t("Result")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, index) => (
                      <TableRow
                        key={`${row.externalId}-${index}`}
                        className={cn(
                          row.status === "duplicate" && "opacity-55"
                        )}
                      >
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatDisplayDate(row.date, intlLocale)}
                        </TableCell>
                        <TableCell className="max-w-52 truncate">
                          {row.description ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.category ? t(row.category) : t("Uncategorized")}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right tabular-nums",
                            row.type === "INCOME" ? "text-emerald-600" : "text-foreground"
                          )}
                        >
                          {row.type === "EXPENSE" ? "−" : "+"}
                          {formatMoney(row.amount, row.currency, intlLocale)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs",
                              row.status === "new"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            )}
                          >
                            {t(row.status === "new" ? "New" : "Duplicate")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.rowsAvailable > preview.rowsShown && (
                <p className="text-xs text-muted-foreground">
                  {t("Showing the first {shown} of {total} rows.", {
                    shown: preview.rowsShown,
                    total: preview.rowsAvailable,
                  })}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={working !== null}
                  onClick={() => setPreview(null)}
                >
                  {t("Close preview")}
                </Button>
                <Button
                  type="button"
                  disabled={preview.importable === 0 || working !== null}
                  onClick={importFile}
                >
                  {working === "commit" ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <UploadIcon />
                  )}
                  {t("Import {count} rows", { count: preview.importable })}
                </Button>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-lg border p-3">
              <ImportSummary result={result} />
            </div>
          )}

          <div className="grid gap-2 border-t pt-4">
            <div>
              <p className="text-sm font-medium">{t("Recent account imports")}</p>
              <p className="text-xs text-muted-foreground">
                {t("You can undo one batch without deleting other movements.")}
              </p>
            </div>
            {history.loading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <LoaderCircleIcon className="size-3.5 animate-spin" />
                {t("Loading history…")}
              </p>
            ) : history.data?.items.length ? (
              <ul className="grid gap-2">
                {history.data.items.map((batch) => (
                  <li
                    key={batch.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{batch.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("{date} · {count} imported", {
                          date: formatDateTime(batch.createdAt, intlLocale),
                          count: batch.importedRows,
                        })}
                        {batch.remainingRows !== batch.importedRows
                          ? t(" · {count} still present", {
                              count: batch.remainingRows,
                            })
                          : ""}
                      </p>
                    </div>
                    {batch.undoneAt ? (
                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {t("Undone")}
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setUndoBatch(batch)}
                      >
                        <RotateCcwIcon />
                        {t("Cancel")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("No imports recorded for this account.")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(undoBatch)}
        onOpenChange={(open) => !open && !undoing && setUndoBatch(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Undo this import?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("The {count} transactions still linked to {file} will be deleted. Manual transactions will not be changed.", {
                count: undoBatch?.remainingRows ?? 0,
                file: undoBatch?.fileName ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={undoing}>{t("Keep")}</AlertDialogCancel>
            <AlertDialogAction disabled={undoing} onClick={confirmUndo}>
              {undoing && <LoaderCircleIcon className="animate-spin" />}
              {t("Undo import")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ImportOption({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        className="size-4 accent-[var(--primary)]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function ImportSummary({
  result,
  preview = false,
}: {
  result: PreviewResult | ImportResult;
  preview?: boolean;
}) {
  const { t } = useI18n();
  const count = preview
    ? (result as PreviewResult).importable
    : (result as ImportResult).inserted;
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {t(result.source === "revolut" ? "Revolut format" : "Generic format")}
        </span>
        <span>✅ {count} {t(preview ? "to import" : "imported")}</span>
        {result.duplicates > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            🔁 {t("{count} duplicates skipped", { count: result.duplicates })}
          </span>
        )}
        {result.skipped > 0 && (
          <span className="text-destructive">⚠️ {t("{count} invalid", { count: result.skipped })}</span>
        )}
      </div>
      {Object.entries(result.skippedByType ?? {}).some(([, count]) => count > 0) && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {t("Excluded:")} {Object.entries(result.skippedByType ?? {})
            .filter(([, count]) => count > 0)
            .map(([key, count]) => `${t(SKIPPED_LABELS[key] ?? key)} ${count}`)
            .join(" · ")}
        </p>
      )}
      {Object.keys(result.byCategory ?? {}).length > 0 && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {t("Categories:")} {Object.entries(result.byCategory ?? {})
            .sort((left, right) => right[1] - left[1])
            .map(([name, count]) => `${t(name)} (${count})`)
            .join(", ")}
        </p>
      )}
      {result.errors.length > 0 && (
        <ul className="max-h-32 overflow-y-auto text-xs text-muted-foreground">
          {result.errors.map((error, index) => (
            <li key={`${error.row}-${index}`}>
              {t("Row {row}: {message}", {
                row: error.row,
                message: t(error.message),
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
