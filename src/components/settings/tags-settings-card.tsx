"use client";

import * as React from "react";
import { PlusIcon, TagIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { apiSend, useApiData } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";

interface TagItem {
  id: string;
  name: string;
  color: string;
}

export function TagsSettingsCard() {
  const { t } = useI18n();
  const tagsApi = useApiData<{ items: TagItem[] }>("/api/tags");
  const tags = tagsApi.data?.items ?? [];
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#6366f1");
  const [saving, setSaving] = React.useState(false);

  async function createTag(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { ok, error } = await apiSend("/api/tags", "POST", {
      name: name.trim(),
      color,
    });
    setSaving(false);
    if (!ok) return toast.error(t(error ?? "Could not create tag"));
    setName("");
    toast.success(t("Tag created"));
    tagsApi.refresh();
  }

  async function deleteTag(tag: TagItem) {
    if (!confirm(t("Delete the tag \"{name}\"? It will be removed from transactions.", {
      name: tag.name,
    }))) return;
    const { ok, error } = await apiSend(`/api/tags/${tag.id}`, "DELETE");
    if (!ok) return toast.error(t(error ?? "Deletion failed"));
    toast.success(t("Tag deleted"));
    tagsApi.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TagIcon className="size-4" />
          {t("Tags and projects")}
        </CardTitle>
        <CardDescription>
          {t("Group related movements, such as holidays, work, or renovations.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center gap-1 rounded-full border py-1 pr-1 pl-2.5 text-sm"
                style={{ borderColor: tag.color, backgroundColor: `${tag.color}16` }}
              >
                <span>{tag.name}</span>
                <button
                  type="button"
                  onClick={() => deleteTag(tag)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                  aria-label={t("Delete tag {name}", { name: tag.name })}
                >
                  <Trash2Icon className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={createTag} className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("New tag or project")}
            maxLength={40}
            className="min-w-44 flex-1"
          />
          <Input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="w-14 p-1"
            aria-label={t("Tag color")}
          />
          <Button type="submit" variant="outline" size="sm" disabled={saving || !name.trim()}>
            <PlusIcon />
            {t("Add")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
