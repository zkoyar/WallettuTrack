"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LoaderCircleIcon,
  PlusIcon,
  TargetIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiSend, useApiData } from "@/lib/api-client";
import { formatMoney, formatMoneyCompact } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/dates";
import { useI18n } from "@/components/i18n-provider";

interface GoalItem {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  savedAmount: number;
  currency: string;
  deadline: string | null;
}

const ICONS = ["🎯", "✈️", "🏠", "🚗", "🎓", "💍", "🛡️", "💻", "🏖️", "🎁"];

export function GoalsSection({ baseCurrency }: { baseCurrency: string }) {
  const router = useRouter();
  const { intlLocale, t: tr } = useI18n();
  const goals = useApiData<{ items: GoalItem[] }>("/api/goals");
  const items = goals.data?.items ?? [];
  const loading = goals.loading;

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GoalItem | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Form state.
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("🎯");
  const [target, setTarget] = React.useState("");
  const [saved, setSaved] = React.useState("0");
  const [deadline, setDeadline] = React.useState("");

  function refresh() {
    goals.refresh();
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setIcon("🎯");
    setTarget("");
    setSaved("0");
    setDeadline("");
    setOpen(true);
  }

  function openEdit(g: GoalItem) {
    setEditing(g);
    setName(g.name);
    setIcon(g.icon);
    setTarget(String(g.targetAmount));
    setSaved(String(g.savedAmount));
    setDeadline(g.deadline ?? "");
    setOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const t = Number(target.replace(",", "."));
    const s = Number(saved.replace(",", ".")) || 0;
    if (!name.trim()) return toast.error(tr("Enter a name"));
    if (!Number.isFinite(t) || t <= 0) return toast.error(tr("Invalid goal amount"));

    setSaving(true);
    const { ok, error } = await apiSend(
      editing ? `/api/goals?id=${editing.id}` : "/api/goals",
      editing ? "PATCH" : "POST",
      {
        name: name.trim(),
        icon,
        targetAmount: t,
        savedAmount: s,
        deadline: deadline || null,
      }
    );
    setSaving(false);
    if (!ok) return toast.error(tr(error ?? "Save failed"));

    toast.success(tr(editing ? "Goal updated" : "Goal created"));
    setOpen(false);
    refresh();
  }

  /** Quickly adds or removes an amount from accumulated savings. */
  async function quickAdd(g: GoalItem, delta: number) {
    const { ok } = await apiSend("/api/goals", "PATCH", {
      id: g.id,
      addToSaved: delta,
    });
    if (!ok) return toast.error(tr("Update failed"));
    refresh();
  }

  async function onDelete(g: GoalItem) {
    if (!confirm(tr("Delete the goal \"{name}\"?", { name: g.name }))) return;
    const { ok } = await apiSend(`/api/goals?id=${g.id}`, "DELETE");
    if (!ok) return toast.error(tr("Delete failed"));
    toast.success(tr("Goal deleted"));
    refresh();
  }

  function monthsNeeded(g: GoalItem): number | null {
    if (!g.deadline) return null;
    const now = new Date();
    const dl = new Date(g.deadline + "T00:00:00Z");
    const months =
      (dl.getUTCFullYear() - now.getUTCFullYear()) * 12 +
      (dl.getUTCMonth() - now.getUTCMonth());
    return Math.max(0, months);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <TargetIcon className="size-5" />
            {tr("Savings goals")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tr("Targets and deadlines: see what remains and the monthly amount needed")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon />
          {tr("New goal")}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <LoaderCircleIcon className="mx-auto size-4 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {tr("No goals yet. Create one, such as “Summer holiday: €1,200 by July”.")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((g) => {
            const pct =
              g.targetAmount > 0
                ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100))
                : 0;
            const remaining = Math.max(0, g.targetAmount - g.savedAmount);
            const months = monthsNeeded(g);
            const perMonth =
              months !== null && months > 0
                ? Math.ceil((remaining / months) * 100) / 100
                : null;
            const done = pct >= 100;

            return (
              <Card key={g.id} className={cn(done && "border-emerald-500/50")}>
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-xl">{g.icon}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.deadline
                            ? tr("by {date}", {
                                date: formatDisplayDate(g.deadline, intlLocale),
                              })
                            : tr("no deadline")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDelete(g)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={tr("Delete goal")}
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-1.5">
                    <div className="flex items-baseline justify-between text-sm tabular-nums">
                      <span
                        className={cn(
                          "font-semibold",
                          done && "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {formatMoney(g.savedAmount, baseCurrency, intlLocale)}
                        {done && " 🎉"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / {formatMoneyCompact(g.targetAmount, baseCurrency, intlLocale)} · {pct}%
                      </span>
                    </div>
                    <Progress value={pct} aria-label={`${pct}%`} />
                    {done ? (
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {tr("Goal reached!")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {tr("{amount} remaining", {
                          amount: formatMoney(remaining, baseCurrency, intlLocale),
                        })}
                        {perMonth !== null && (
                          <>
                            {tr(" · ~{amount}/month for {months}", {
                              amount: formatMoneyCompact(perMonth, baseCurrency, intlLocale),
                              months:
                                months === 1
                                  ? tr("1 month")
                                  : tr("{count} months", { count: months ?? 0 }),
                            })}
                          </>
                        )}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {[10, 25, 50, 100].map((v) => (
                        <Button
                          key={v}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => quickAdd(g, v)}
                        >
                          +{formatMoneyCompact(v, baseCurrency, intlLocale)}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => openEdit(g)}
                      >
                        {tr("Edit")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Goal dialog. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tr(editing ? "Edit goal" : "New goal")}</DialogTitle>
            <DialogDescription>{tr("Set a target and deadline.")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSave} className="grid gap-4">
            <div className="grid grid-cols-[70px_1fr] gap-3">
              <div className="grid gap-2">
                <Label>{tr("Icon")}</Label>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-center rounded-lg border text-lg"
                  onClick={() =>
                    setIcon(ICONS[(ICONS.indexOf(icon) + 1) % ICONS.length])
                  }
                  aria-label={tr("Change icon")}
                >
                  {icon}
                </button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="goal-name">{tr("Name")}</Label>
                <Input
                  id="goal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="goal-target">{tr("Goal ({currency})", { currency: baseCurrency })}</Label>
                <Input
                  id="goal-target"
                  inputMode="decimal"
                  placeholder="1200"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="goal-saved">{tr("Already saved")}</Label>
                <Input
                  id="goal-saved"
                  inputMode="decimal"
                  value={saved}
                  onChange={(e) => setSaved(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="goal-deadline">{tr("Deadline (optional)")}</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tr("Cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircleIcon className="animate-spin" />}
                {tr("Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
