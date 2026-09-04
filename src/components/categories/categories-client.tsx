"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface CategoryItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: "EXPENSE" | "INCOME";
}

const ICONS = [
  "🛒", "🏠", "🚗", "💡", "🍽️", "💊", "🎬", "👕", "✈️", "📚",
  "🔁", "📦", "💼", "💻", "📈", "🎁", "🐾", "🏋️", "🎮", "☕",
  "⛽", "🔧", "📱", "🎓", "🏥", "👶", "🎸", "⚽", "🌳", "💳",
];

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#78716c", "#94a3b8", "#64748b",
];

interface CategoryRuleItem {
  id: string;
  keyword: string;
  categoryId: string;
  category: CategoryItem & { type: string };
}

export function CategoriesClient({
  initialCategories,
}: {
  initialCategories: CategoryItem[];
}) {
  const router = useRouter();
  const { t: tr } = useI18n();
  const [items, setItems] = React.useState<CategoryItem[]>(initialCategories);
  const [rules, setRules] = React.useState<CategoryRuleItem[]>([]);
  const [newKeyword, setNewKeyword] = React.useState("");
  const [ruleCategoryId, setRuleCategoryId] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryItem | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("📦");
  const [color, setColor] = React.useState("#6366f1");
  const [type, setType] = React.useState<"EXPENSE" | "INCOME">("EXPENSE");

  function openCreate(t: "EXPENSE" | "INCOME") {
    setEditing(null);
    setName("");
    setIcon("📦");
    setColor("#6366f1");
    setType(t);
    setDialogOpen(true);
  }

  function openEdit(c: CategoryItem) {
    setEditing(c);
    setName(c.name);
    setIcon(c.icon);
    setColor(c.color);
    setType(c.type);
    setDialogOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(tr("Enter a name"));
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), icon, color, type };
      const res = await fetch(
        editing ? `/api/categories/${editing.id}` : "/api/categories",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(tr(data?.error ?? "Save failed"));
        return;
      }
      toast.success(tr(editing ? "Category updated" : "Category created"));
      setDialogOpen(false);
      const fresh = await fetch("/api/categories").then((r) => r.json());
      setItems(fresh.items ?? []);
      router.refresh();
    } catch {
      toast.error(tr("Connection error"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(c: CategoryItem) {
    if (
      !confirm(
        tr("Delete the category \"{name}\"? Linked transactions will remain uncategorized.", {
          name: tr(c.name),
        })
      )
    )
      return;
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(tr("Category deleted"));
      setItems((prev) => prev.filter((x) => x.id !== c.id));
      router.refresh();
    } catch {
      toast.error(tr("Deletion failed"));
    }
  }

  const groups = [
    { key: "EXPENSE" as const, title: "Expenses" },
    { key: "INCOME" as const, title: "Income" },
  ];

  function refreshRules() {
    fetch("/api/category-rules")
      .then((r) => r.json())
      .then((d) => {
        setRules(d.items ?? []);
        if (!ruleCategoryId && d.items?.length === 0) {
          setRuleCategoryId(initialCategories[0]?.id ?? "");
        }
      })
      .catch(() => {});
  }

  React.useEffect(() => {
    refreshRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyword.trim() || !ruleCategoryId) return;
    try {
      const res = await fetch("/api/category-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: newKeyword.trim(), categoryId: ruleCategoryId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(tr(data?.error ?? "Could not create rule"));
        return;
      }
      toast.success(tr("Rule created"));
      setNewKeyword("");
      refreshRules();
    } catch {
      toast.error(tr("Connection error"));
    }
  }

  async function deleteRule(id: string) {
    try {
      const res = await fetch(`/api/category-rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(tr("Rule deleted"));
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error(tr("Deletion failed"));
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">{tr("Categories")}</h1>
        <p className="text-sm text-muted-foreground">
          {tr("Customize categories with a name, color, and icon")}
        </p>
      </div>

      {groups.map((g) => (
        <section key={g.key} className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">{tr(g.title)}</h2>
            <Button variant="outline" size="sm" onClick={() => openCreate(g.key)}>
              <PlusIcon />
              {tr("Add")}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {items
              .filter((c) => c.type === g.key)
              .map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center gap-2.5 p-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
                      style={{ backgroundColor: c.color + "22" }}
                    >
                      {c.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {tr(c.name)}
                    </span>
                    <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={tr("Edit")}
                        onClick={() => openEdit(c)}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        aria-label={tr("Delete")}
                        onClick={() => onDelete(c)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </section>
      ))}

      <section className="grid gap-3">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            {tr("Automatic import rules")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {tr("When an imported transaction description contains a keyword, it is categorized automatically. These rules take priority over defaults.")}
          </p>
        </div>

        <form onSubmit={addRule} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1">
            <Input
              placeholder={tr("Keyword (for example, Netflix)")}
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              maxLength={50}
            />
          </div>
          <Select value={ruleCategoryId || undefined} onValueChange={setRuleCategoryId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={tr("Category")} />
            </SelectTrigger>
            <SelectContent>
              {items.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {tr(c.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={!newKeyword.trim() || !ruleCategoryId}>
            {tr("Add rule")}
          </Button>
        </form>

        {rules.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {rules.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm"
              >
                <span>{r.category.icon}</span>
                <span className="font-medium">{r.keyword}</span>
                <ArrowRightIcon className="size-3 text-muted-foreground" />
                <span className="text-muted-foreground">{tr(r.category.name)}</span>
                <button
                  onClick={() => deleteRule(r.id)}
                  className="ml-0.5 text-muted-foreground hover:text-destructive"
                  aria-label={tr("Delete rule {keyword}", { keyword: r.keyword })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {tr(editing ? "Edit category" : "New category")}
            </DialogTitle>
            <DialogDescription>
              {tr("Choose a name, icon, and color.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSave} className="grid gap-4">
            <div className="grid grid-cols-[70px_1fr] gap-3">
              <div className="grid gap-2">
                <Label>{tr("Icon")}</Label>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-center rounded-lg border text-lg"
                  style={{ backgroundColor: color + "22" }}
                  onClick={() => {
                    const idx = ICONS.indexOf(icon);
                    setIcon(ICONS[(idx + 1) % ICONS.length]);
                  }}
                  aria-label={tr("Change icon")}
                >
                  {icon}
                </button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cat-name">{tr("Name")}</Label>
                <Input
                  id="cat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{tr("Color")}</Label>
              <div className="grid grid-cols-10 gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "size-7 rounded-full transition-transform hover:scale-110",
                      color === c && "ring-2 ring-offset-2 ring-ring ring-offset-background"
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={tr("Color {color}", { color: c })}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{tr("Type")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={type === "EXPENSE" ? "default" : "outline"}
                  onClick={() => setType("EXPENSE")}
                  disabled={!!editing}
                >
                  {tr("Expense")}
                </Button>
                <Button
                  type="button"
                  variant={type === "INCOME" ? "default" : "outline"}
                  onClick={() => setType("INCOME")}
                  disabled={!!editing}
                >
                  {tr("Income")}
                </Button>
              </div>
              {editing && (
                <p className="text-xs text-muted-foreground">
                  {tr("The type cannot be changed after creation.")}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
