"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trash2, Loader2, AlertTriangle, Save, Star } from "lucide-react";
import type { Group, Quote, WatchlistItem } from "@/lib/types";
import { changeColor, formatChange, formatPrice } from "@/lib/format";
import { ChartView } from "./ChartView";
import { NewsList } from "./NewsList";
import { AddPaperButton } from "./AddPaperButton";
import { SignalLight } from "./SignalLight";
import { WorstLossCard } from "./WorstLossCard";
import type { SignalKind } from "@/lib/ai/scorer";

type Insight = {
  signal: SignalKind;
  signalReason: string;
  confidence: number;
  maxDrawdownPct: number | null;
  reasons: string[];
};

type Props = {
  ticker: string;
};

export function StockDetail({ ticker }: Props) {
  const router = useRouter();
  const [item, setItem] = useState<WatchlistItem | null>(null);
  const [name, setName] = useState<string>(ticker);
  const [groups, setGroups] = useState<Group[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [memo, setMemo] = useState("");
  const [low, setLow] = useState<string>("");
  const [high, setHigh] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [adding, setAdding] = useState(false);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wlRes, gRes, qRes] = await Promise.all([
        fetch("/api/watchlist", { cache: "no-store" }),
        fetch("/api/groups", { cache: "no-store" }),
        fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tickers: [ticker] }),
        }),
      ]);
      const wl = await wlRes.json();
      const gr = await gRes.json();
      const qData = await qRes.json();
      const q: Quote | null = (qData.quotes ?? [])[0] ?? null;
      setQuote(q);

      const found = (wl.items as WatchlistItem[]).find((i) => i.ticker === ticker) ?? null;
      setGroups(gr.groups ?? []);
      if (found) {
        setItem(found);
        setInWatchlist(true);
        setName(found.name);
        setMemo(found.memo);
        setLow(found.alert_low != null ? String(found.alert_low) : "");
        setHigh(found.alert_high != null ? String(found.alert_high) : "");
        setGroupId(found.group_id ?? "");
      } else {
        setItem(null);
        setInWatchlist(false);
        if (q?.name) setName(q.name);
      }
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setInsightLoading(true);
    setInsight(null);
    (async () => {
      try {
        const res = await fetch(`/api/stock/insight?ticker=${encodeURIComponent(ticker)}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.ok) {
          setInsight({
            signal: data.signal,
            signalReason: data.signalReason,
            confidence: data.confidence,
            maxDrawdownPct: data.maxDrawdownPct,
            reasons: data.reasons ?? [],
          });
        }
      } catch {
        // 失敗時は単に表示しない
      } finally {
        if (!cancelled) setInsightLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  async function save() {
    if (!item) return;
    setSaving(true);
    try {
      const lowNum = low.trim() ? Number(low) : null;
      const highNum = high.trim() ? Number(high) : null;
      const res = await fetch(`/api/watchlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memo,
          group_id: groupId || null,
          alert_low: Number.isFinite(lowNum) ? lowNum : null,
          alert_high: Number.isFinite(highNum) ? highNum : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItem(data.item);
        setSavedHint(true);
        setTimeout(() => setSavedHint(false), 1800);
      }
    } finally {
      setSaving(false);
    }
  }

  async function addToWatchlist() {
    setAdding(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, name }),
      });
      if (res.ok) await load();
    } finally {
      setAdding(false);
    }
  }

  async function remove() {
    if (!item) return;
    if (!confirm(`${item.name} をウォッチリストから削除しますか？`)) return;
    const res = await fetch(`/api/watchlist/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/watchlist");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const market = ticker.endsWith(".T") ? "jp" : "us";
  const currency = quote?.currency ?? (market === "jp" ? "JPY" : "USD");
  const price = quote?.price ?? null;
  const alertHit =
    inWatchlist &&
    item &&
    price != null &&
    ((item.alert_low != null && price <= item.alert_low) ||
      (item.alert_high != null && price >= item.alert_high));

  return (
    <div>
      <div className="px-2 pt-2 flex items-center gap-2">
        <Link
          href="/"
          aria-label="戻る"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {displayTicker(ticker)} · {market === "jp" ? "日本株" : "米国株"}
          </p>
        </div>
        {inWatchlist && (
          <button
            type="button"
            onClick={remove}
            aria-label="削除"
            className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <section className="px-4 py-5 mt-2 bg-white dark:bg-slate-900 sm:rounded-2xl sm:mx-2 sm:my-2 border-y sm:border border-slate-200 dark:border-slate-800">
        <p className="text-3xl font-bold tabular-nums">
          {formatPrice(price, currency)}
        </p>
        <p className={`text-sm tabular-nums mt-1 ${changeColor(quote?.change)}`}>
          {formatChange(quote?.change, quote?.changePercent, currency)}
        </p>
        {alertHit && (
          <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-3 py-2 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4" />
            アラート条件に達しています
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <AddPaperButton ticker={ticker} small={false} label="エア取引で買う" />
          {!inWatchlist && (
            <button
              type="button"
              onClick={addToWatchlist}
              disabled={adding}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold border border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50 transition"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              ウォッチリストに追加
            </button>
          )}
        </div>
      </section>

      {/* AI による信号機 + 最悪損失 */}
      <section className="sm:rounded-2xl sm:mx-2 my-2 bg-white dark:bg-slate-900 border-y sm:border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
          AIによる判定
        </p>
        {insightLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> 計算中…
          </div>
        ) : insight ? (
          <>
            <SignalLight signal={insight.signal} reason={insight.signalReason} size="lg" />
            <WorstLossCard maxDrawdownPct={insight.maxDrawdownPct} size="lg" />
            {insight.reasons.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
                  AIが見ているポイント
                </p>
                <ul className="space-y-1">
                  {insight.reasons.slice(0, 4).map((r, i) => (
                    <li key={i} className="text-sm flex gap-2 leading-relaxed">
                      <span className="text-indigo-500 shrink-0 select-none">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500">過去データが少なく、AI判定はできませんでした。</p>
        )}
      </section>

      <div className="my-2">
        <ChartView
          ticker={ticker}
          currency={currency}
          alertLow={item?.alert_low ?? null}
          alertHigh={item?.alert_high ?? null}
        />
      </div>

      {inWatchlist && item && (
        <section className="bg-white dark:bg-slate-900 sm:rounded-2xl sm:mx-2 my-2 border-y sm:border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">フォルダ</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
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

          <div>
            <label className="block text-sm font-semibold mb-1">価格アラート</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              下限・上限の価格を設定すると、その価格に達したときに⚠️マークで知らせます。空欄ならアラート無しです。
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">下限</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={low}
                  onChange={(e) => setLow(e.target.value)}
                  placeholder="例: 2500"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">上限</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={high}
                  onChange={(e) => setHigh(e.target.value)}
                  placeholder="例: 3500"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm tabular-nums"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="この銘柄を買う理由・気になっているポイントなど"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm leading-relaxed"
            />
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savedHint ? "保存しました" : "保存"}
          </button>
        </section>
      )}

      <div className="my-2">
        <NewsList ticker={ticker} />
      </div>
    </div>
  );
}

function displayTicker(t: string): string {
  return t.endsWith(".T") ? t.slice(0, -2) : t;
}
