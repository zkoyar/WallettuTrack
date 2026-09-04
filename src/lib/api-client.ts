"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Lightweight client-side caching layer:
 * - deduplicates concurrent requests to the same URL
 * - keeps the latest result in memory for instant remounts
 * - refresh() forces a reload
 */
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

async function requestJson<T>(url: string): Promise<T> {
  if (inflight.has(url)) return inflight.get(url)! as Promise<T>;
  if (cache.has(url)) return cache.get(url) as T;

  const p = fetch(url).then(async (res) => {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error ?? `Error ${res.status}`);
    }
    cache.set(url, data);
    inflight.delete(url);
    return data as T;
  });
  inflight.set(url, p);
  p.catch(() => inflight.delete(url));
  return p;
}

export function invalidateApi(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * Maps resources to the lists that must be invalidated after a mutation.
 * For example, changing a transaction affects cash flow and forecasts.
 */
const INVALIDATION_MAP: [prefix: string, targets: string[]][] = [
  ["/api/transactions", ["/api/transactions", "/api/recurrences/upcoming", "/api/cashflow", "/api/scenarios"]],
  ["/api/transfers", ["/api/transfers", "/api/transactions", "/api/cashflow"]],
  ["/api/import", ["/api/import/batches", "/api/transactions", "/api/categories", "/api/cashflow"]],
  ["/api/events", ["/api/events", "/api/recurrences/upcoming", "/api/cashflow"]],
  ["/api/recurrences", ["/api/recurrences", "/api/recurrences/upcoming", "/api/cashflow"]],
  ["/api/subscriptions", ["/api/subscriptions"]],
  ["/api/accounts", ["/api/accounts", "/api/cashflow"]],
  ["/api/goals", ["/api/goals"]],
  ["/api/budgets", ["/api/budgets"]],
  ["/api/categories", ["/api/categories", "/api/category-rules"]],
  ["/api/category-rules", ["/api/category-rules"]],
  ["/api/tags", ["/api/tags", "/api/transactions"]],
  ["/api/alert-preferences", ["/api/alert-preferences", "/api/notifications"]],
];

function invalidateFor(url: string): void {
  const path = url.split("?")[0];
  for (const [prefix, targets] of INVALIDATION_MAP) {
    if (path.startsWith(prefix)) {
      for (const t of targets) invalidateApi(t);
      // Mutations with an ID (/api/x/<id>) share the same prefix.
      return;
    }
  }
  invalidateApi(); // Conservative fallback.
}

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  /** Reloads data while bypassing the cache. */
  refresh: () => Promise<void>;
}

/**
 * GET API hook with a shared cache.
 * A null URL suspends the request for conditional loading.
 */
export function useApiData<T>(
  url: string | null,
  opts: { silentError?: boolean } = {}
): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(() =>
    url ? ((cache.get(url) as T | undefined) ?? null) : null
  );
  const [loading, setLoading] = useState(!!url && !cache.has(url));
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (force: boolean) => {
      if (!url) {
        setLoading(false);
        return;
      }
      if (!force && cache.has(url)) {
        setData(cache.get(url) as T);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        if (force) invalidateApi(url);
        const d = await requestJson<T>(url);
        if (mounted.current) setData(d);
      } catch (e) {
        if (mounted.current && !opts.silentError) {
          toast.error(e instanceof Error ? e.message : "Network error");
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [url, opts.silentError]
  );

  useEffect(() => {
    // Defer to the next tick to avoid setting state synchronously.
    const t = setTimeout(() => load(false), 0);
    return () => clearTimeout(t);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, refresh };
}

/** POST/PATCH/DELETE with JSON parsing and consistent error handling. */
export async function apiSend<T = { ok: true }>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, data: null, error: data?.error ?? `Error ${res.status}` };
    }
    // Invalidate only lists related to the mutated resource.
    invalidateFor(url);
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, data: null, error: "Connection error" };
  }
}
