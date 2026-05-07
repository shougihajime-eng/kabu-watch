"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import type { Group, Quote, WatchlistItem } from "@/lib/types";
import { GroupTabs } from "./GroupTabs";
import { WatchlistRow } from "./WatchlistRow";
import { AddStockModal } from "./AddStockModal";
import { AddGroupModal } from "./AddGroupModal";

const POLL_INTERVAL_MS = 60_000;

export function WatchlistView() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stockModal, setStockModal] = useState(false);
  const [groupModal, setGroupModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [wRes, gRes] = await Promise.all([
        fetch("/api/watchlist", { cache: "no-store" }),
        fetch("/api/groups", { cache: "no-store" }),
      ]);
      const wData = await wRes.json();
      const gData = await gRes.json();
      setItems(wData.items ?? []);
      setGroups(gData.groups ?? []);
      return wData.items as WatchlistItem[];
    } catch (err) {
      setError("読み込みに失敗しました");
      return [];
    }
  }, []);

  const loadQuotes = useCallback(async (list: WatchlistItem[]) => {
    if (list.length === 0) {
      setQuotes({});
      return;
    }
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: list.map((i) => i.ticker) }),
      });
      const data = await res.json();
      const map: Record<string, Quote> = {};
      for (const q of data.quotes ?? []) {
        map[q.ticker] = q;
      }
      setQuotes(map);
    } catch (err) {
      console.warn("quote fetch failed", err);
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    (async () => {
      setLoading(true);
      const list = await loadAll();
      if (!stopped) {
        await loadQuotes(list);
        setLoading(false);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [loadAll, loadQuotes]);

  // Periodically refresh quotes
  useEffect(() => {
    if (loading) return;
    const t = setInterval(() => {
      loadQuotes(items);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [items, loading, loadQuotes]);

  async function refresh() {
    setRefreshing(true);
    const list = await loadAll();
    await loadQuotes(list);
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    if (selectedGroup === null) return items;
    if (selectedGroup === "ungrouped") return items.filter((i) => !i.group_id);
    return items.filter((i) => i.group_id === selectedGroup);
  }, [items, selectedGroup]);

  return (
    <div className="flex-1 flex flex-col">
      <GroupTabs
        groups={groups}
        selected={selectedGroup}
        onSelect={setSelectedGroup}
        onAddGroup={() => setGroupModal(true)}
      />

      <div className="max-w-screen-md w-full mx-auto flex items-center justify-between px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{filtered.length} 銘柄</span>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>更新</span>
        </button>
      </div>

      <main className="flex-1 max-w-screen-md w-full mx-auto pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-center text-red-600 py-10">{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => setStockModal(true)} hasItems={items.length > 0} />
        ) : (
          <ul className="bg-white dark:bg-slate-900 sm:rounded-2xl sm:mx-2 sm:my-2 divide-y divide-slate-100 dark:divide-slate-800 border-y sm:border border-slate-200 dark:border-slate-800">
            {filtered.map((item) => (
              <li key={item.id}>
                <WatchlistRow item={item} quote={quotes[item.ticker]} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <button
        type="button"
        onClick={() => setStockModal(true)}
        aria-label="銘柄を追加"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddStockModal
        open={stockModal}
        onClose={() => setStockModal(false)}
        groups={groups}
        defaultGroupId={
          selectedGroup && selectedGroup !== "ungrouped" ? selectedGroup : null
        }
        onAdded={async (item) => {
          setItems((prev) => [...prev, item]);
          await loadQuotes([...items, item]);
        }}
      />

      <AddGroupModal
        open={groupModal}
        onClose={() => setGroupModal(false)}
        onCreated={(g) => setGroups((prev) => [...prev, g])}
      />
    </div>
  );
}

function EmptyState({ onAdd, hasItems }: { onAdd: () => void; hasItems: boolean }) {
  return (
    <div className="text-center px-6 py-16">
      <p className="text-5xl mb-4">📈</p>
      <h2 className="text-lg font-bold mb-2">
        {hasItems ? "このフォルダは空です" : "気になる銘柄を追加しましょう"}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        {hasItems
          ? "「すべて」タブから追加するか、下のボタンから追加してください。"
          : "右下の「＋」ボタンから、株のコードや会社名で検索して追加できます。"}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
      >
        <Plus className="w-4 h-4" /> 銘柄を追加
      </button>
    </div>
  );
}
