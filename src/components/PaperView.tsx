"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { PaperSummary, PaperTradeWithLive } from "@/lib/paper";
import { Term } from "./Term";
import { ChangeChip } from "./PickBadges";
import { formatPrice } from "@/lib/format";

type Tab = "open" | "closed" | "stats";

export function PaperView() {
  const [trades, setTrades] = useState<PaperTradeWithLive[]>([]);
  const [summary, setSummary] = useState<PaperSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("open");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/paper", { cache: "no-store" });
      const data = await res.json();
      setTrades(data.trades ?? []);
      setSummary(data.summary ?? null);
    } catch (err) {
      console.warn("paper load failed", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
  }

  async function sell(id: string) {
    if (!confirm("この銘柄を売却したことにしますか？")) return;
    const res = await fetch(`/api/paper/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sell" }),
    });
    if (res.ok) await load();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "失敗しました");
    }
  }

  async function remove(id: string) {
    if (!confirm("この取引の記録を削除しますか？")) return;
    const res = await fetch(`/api/paper/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const openTrades = trades.filter((t) => t.status === "open");
  const closedTrades = trades.filter((t) => t.status === "closed");

  return (
    <div className="px-3 sm:px-4 pt-3 space-y-3">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          label="保有中"
          value={`${openTrades.length}件`}
          tone="default"
        />
        <StatCard
          label="売却済み"
          value={`${closedTrades.length}件`}
          tone="default"
        />
        <StatCard
          label={<Term>勝率</Term>}
          value={summary?.winRate != null ? `${summary.winRate}%` : "—"}
          tone="default"
        />
        <StatCard
          label="累計成績"
          value={
            summary
              ? `${summary.totalRealizedPnl.jp > 0 ? "+" : ""}${Math.round(summary.totalRealizedPnl.jp).toLocaleString("ja-JP")}円`
              : "—"
          }
          tone={(summary?.totalRealizedPnl.jp ?? 0) > 0 ? "up" : (summary?.totalRealizedPnl.jp ?? 0) < 0 ? "down" : "default"}
        />
      </div>

      {/* タブ */}
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full p-0.5">
          <TabButton active={tab === "open"} onClick={() => setTab("open")} label="保有中" count={openTrades.length} />
          <TabButton active={tab === "closed"} onClick={() => setTab("closed")} label="売却済み" count={closedTrades.length} />
          <TabButton active={tab === "stats"} onClick={() => setTab("stats")} label="成績" />
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="更新"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* タブ内容 */}
      {tab === "open" && (
        <OpenList trades={openTrades} onSell={sell} onRemove={remove} />
      )}
      {tab === "closed" && <ClosedList trades={closedTrades} onRemove={remove} />}
      {tab === "stats" && <StatsView summary={summary} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 text-xs sm:text-sm rounded-full font-semibold transition ${
        active
          ? "bg-white dark:bg-slate-950 shadow text-slate-900 dark:text-slate-100"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
      }`}
    >
      {label}
      {count != null && <span className="ml-1 opacity-60 text-[10px]">({count})</span>}
    </button>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: string;
  tone: "default" | "up" | "down";
}) {
  const color =
    tone === "up"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "down"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-3 py-3">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function OpenList({
  trades,
  onSell,
  onRemove,
}: {
  trades: PaperTradeWithLive[];
  onSell: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (trades.length === 0) {
    return (
      <EmptyMessage>
        まだエア取引中の銘柄はありません。<br />
        ホーム画面のAI注目銘柄から「エア取引で検証する」を押すと、ここに記録されます。
      </EmptyMessage>
    );
  }
  return (
    <ul className="space-y-2">
      {trades.map((t) => {
        const currency = t.market === "jp" ? "JPY" : "USD";
        return (
          <li
            key={t.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <Link href={`/stock/${encodeURIComponent(t.ticker)}`} className="min-w-0 flex-1 hover:underline">
                <p className="font-bold truncate">{t.name}</p>
                <p className="text-[11px] text-slate-500">
                  {t.shares}株 · 買値 {formatPrice(t.buy_price, currency)} · {t.hold_days}日経過
                </p>
              </Link>
              <button
                type="button"
                onClick={() => onRemove(t.id)}
                aria-label="削除"
                className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 my-2">
              <Cell label="現在値" value={formatPrice(t.current_price, currency)} />
              <Cell label="含み損益" value={t.unrealized_pnl != null ? `${t.unrealized_pnl > 0 ? "+" : ""}${Math.round(t.unrealized_pnl).toLocaleString("ja-JP")}` : "—"} tone={signTone(t.unrealized_pnl)} />
              <Cell
                label="変化率"
                value={<ChangeChip value={t.unrealized_pct} suffix="%" size="sm" />}
              />
            </div>
            <button
              type="button"
              onClick={() => onSell(t.id)}
              className="w-full mt-1 py-2 rounded-full text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 active:scale-95 transition"
            >
              いま売却したことにする
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ClosedList({
  trades,
  onRemove,
}: {
  trades: PaperTradeWithLive[];
  onRemove: (id: string) => void;
}) {
  if (trades.length === 0) {
    return <EmptyMessage>まだ売却した取引はありません。</EmptyMessage>;
  }
  return (
    <ul className="space-y-2">
      {trades.map((t) => {
        const currency = t.market === "jp" ? "JPY" : "USD";
        return (
          <li
            key={t.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <Link href={`/stock/${encodeURIComponent(t.ticker)}`} className="min-w-0 flex-1 hover:underline">
                <p className="font-bold truncate">{t.name}</p>
                <p className="text-[11px] text-slate-500">
                  {t.shares}株 · {t.hold_days}日保有 · {new Date(t.sell_at ?? t.buy_at).toLocaleDateString("ja-JP")}売却
                </p>
              </Link>
              <button
                type="button"
                onClick={() => onRemove(t.id)}
                aria-label="削除"
                className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <Cell label="買値" value={formatPrice(t.buy_price, currency)} />
              <Cell label="売値" value={formatPrice(t.sell_price, currency)} />
              <Cell label="確定損益" value={t.realized_pnl != null ? `${t.realized_pnl > 0 ? "+" : ""}${Math.round(t.realized_pnl).toLocaleString("ja-JP")}` : "—"} tone={signTone(t.realized_pnl)} />
              <Cell label="変化率" value={<ChangeChip value={t.realized_pct} suffix="%" size="sm" />} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatsView({ summary }: { summary: PaperSummary | null }) {
  if (!summary || summary.closedCount === 0) {
    return <EmptyMessage>売却した取引が貯まると、ここに累計成績のグラフが表示されます。</EmptyMessage>;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="勝ち" value={`${summary.winCount}件`} tone="default" />
        <StatCard label="負け" value={`${summary.loseCount}件`} tone="default" />
        <StatCard
          label="平均上昇率"
          value={summary.avgWinPct != null ? `+${summary.avgWinPct}%` : "—"}
          tone="up"
        />
        <StatCard
          label="最大下落率"
          value={summary.maxDrawPct != null ? `${summary.maxDrawPct}%` : "—"}
          tone="down"
        />
      </div>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <h3 className="text-sm font-semibold mb-2">累計損益の推移（日本株、円）</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary.realizedTimeline} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <XAxis
                dataKey="date"
                fontSize={10}
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                fontSize={10}
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v) => Math.round(v).toLocaleString("ja-JP")}
              />
              <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
              <Tooltip
                formatter={(v) => [`${Math.round(Number(v)).toLocaleString("ja-JP")}円`, "累計"]}
                labelFormatter={(v) => `${v}`}
                contentStyle={{ background: "rgba(15,23,42,0.92)", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }}
                itemStyle={{ color: "#f1f5f9" }}
              />
              <Line type="monotone" dataKey="cumulative" stroke="#6366f1" strokeWidth={2.5} dot={false} isAnimationActive={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {(summary.bestTrade || summary.worstTrade) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {summary.bestTrade && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-[11px] text-slate-500 mb-1">いちばん良かった取引</p>
              <p className="font-bold truncate">{summary.bestTrade.name}</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                +{summary.bestTrade.pct.toFixed(2)}%
              </p>
            </div>
          )}
          {summary.worstTrade && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-[11px] text-slate-500 mb-1">いちばん厳しかった取引</p>
              <p className="font-bold truncate">{summary.worstTrade.name}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {summary.worstTrade.pct.toFixed(2)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "up" | "down";
}) {
  const color =
    tone === "up" ? "text-rose-600 dark:text-rose-400" : tone === "down" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-center">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function signTone(v: number | null): "up" | "down" | undefined {
  if (v == null) return undefined;
  if (v > 0) return "up";
  if (v < 0) return "down";
  return undefined;
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
      {children}
    </div>
  );
}
