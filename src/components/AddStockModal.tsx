"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import type { Group, SearchResult, WatchlistItem } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  defaultGroupId: string | null;
  onAdded: (item: WatchlistItem) => void;
};

export function AddStockModal({ open, onClose, groups, defaultGroupId, onAdded }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(defaultGroupId);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setError(null);
      setGroupId(defaultGroupId);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultGroupId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!open) return null;

  async function add(r: SearchResult) {
    setSubmitting(r.ticker);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: r.ticker,
          market: r.market,
          name: r.name,
          groupId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "追加に失敗しました");
        return;
      }
      onAdded(data.item);
      onClose();
    } catch {
      setError("通信エラーが起きました");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold">銘柄を追加</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="銘柄コードや会社名で検索（例: 7203 / トヨタ / AAPL）"
              className="w-full pl-10 pr-3 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>

          {groups.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                追加先のフォルダ
              </label>
              <select
                value={groupId ?? ""}
                onChange={(e) => setGroupId(e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">未分類</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="max-h-[50vh] overflow-y-auto border-t border-slate-200 dark:border-slate-800">
          {searching && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
              該当する銘柄が見つかりません
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.ticker}
              type="button"
              disabled={!!submitting}
              onClick={() => add(r)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{r.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {r.ticker.endsWith(".T") ? r.ticker.slice(0, -2) : r.ticker} ·{" "}
                  {r.market === "jp" ? "日本株" : "米国株"}
                </p>
              </div>
              {submitting === r.ticker ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <span className="text-sm font-semibold text-emerald-600">追加</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
