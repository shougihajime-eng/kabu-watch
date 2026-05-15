"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Sparkles, Wallet, PiggyBank, Target } from "lucide-react";
import type { AiPickWithSnapshots, PicksSummary } from "@/lib/picks";
import type { PaperSummary, PaperTradeWithLive } from "@/lib/paper";
import { HeroPick } from "./HeroPick";
import { PickCard } from "./PickCard";
import { Term } from "./Term";
import { AiNotice } from "./Disclaimer";
import { ChangeChip } from "./PickBadges";

export function Dashboard() {
  const [picks, setPicks] = useState<AiPickWithSnapshots[]>([]);
  const [picksSummary, setPicksSummary] = useState<PicksSummary | null>(null);
  const [paperSummary, setPaperSummary] = useState<PaperSummary | null>(null);
  const [paperTrades, setPaperTrades] = useState<PaperTradeWithLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes, paperRes] = await Promise.all([
        fetch("/api/picks?limit=12", { cache: "no-store" }),
        fetch("/api/picks/summary?days=180", { cache: "no-store" }),
        fetch("/api/paper", { cache: "no-store" }),
      ]);
      const pData = await pRes.json();
      const sData = await sRes.json();
      const paperData = await paperRes.json();
      setPicks(pData.picks ?? []);
      setPicksSummary(sData.summary ?? null);
      setPaperSummary(paperData.summary ?? null);
      setPaperTrades(paperData.trades ?? []);
    } catch (err) {
      console.warn("dashboard load failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  async function generateNow() {
    setGenerating(true);
    setGenMessage(null);
    try {
      const res = await fetch("/api/cron/generate-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setGenMessage(data.message ?? `AIが ${data.inserted ?? 0} 件の注目銘柄を選びました`);
        await loadAll();
      } else {
        setGenMessage(`エラー: ${data.error ?? "失敗しました"}`);
      }
    } catch {
      setGenMessage("通信エラーが起きました");
    } finally {
      setGenerating(false);
    }
  }

  // 「過去に似た予想が当たった率」: 同じ自信度バンド (±10) で、各 horizon 後に上昇していた割合
  function similarHitRate(target: AiPickWithSnapshots): { rate: number | null; sample: number } {
    const lo = target.confidence - 10;
    const hi = target.confidence + 10;
    let win = 0;
    let total = 0;
    for (const p of picks) {
      if (p.id === target.id) continue;
      if (p.confidence < lo || p.confidence > hi) continue;
      const change = p.snapshots[7]?.change_pct ?? p.snapshots[3]?.change_pct ?? p.snapshots[1]?.change_pct;
      if (change == null) continue;
      total += 1;
      if (change > 0) win += 1;
    }
    if (total === 0) return { rate: null, sample: 0 };
    return { rate: (win / total) * 100, sample: total };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    );
  }

  const todayPick = picks[0] ?? null;
  const restPicks = picks.slice(1, 5);
  const sim = todayPick ? similarHitRate(todayPick) : { rate: null, sample: 0 };

  return (
    <div className="space-y-4 pb-4">
      {/* ヒーロー */}
      <section className="px-3 sm:px-4 pt-3">
        {todayPick ? (
          <HeroPick pick={todayPick} similarHitRate={sim.rate} similarSampleSize={sim.sample} />
        ) : (
          <EmptyHero generating={generating} onGenerate={generateNow} message={genMessage} />
        )}
      </section>

      {/* 成績ハイライト */}
      <section className="px-3 sm:px-4">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1 tracking-wide">
          このアプリのAIの実績（参考）
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatBox
            label="AIの予想数"
            value={picksSummary?.totalPicks ?? 0}
            unit="件"
            icon={<Sparkles className="w-3.5 h-3.5" />}
          />
          <StatBox
            label="1週間後の的中率"
            value={picksSummary?.byHorizon.find((h) => h.horizonDays === 7)?.hitRate}
            unit="%"
            icon={<Target className="w-3.5 h-3.5" />}
            hint="snap"
          />
          <StatBox
            label="エア取引の含み損益"
            value={paperSummary?.totalUnrealizedPnl.jp ?? 0}
            unit="円"
            icon={<Wallet className="w-3.5 h-3.5" />}
            money
          />
          <StatBox
            label="エア取引の累計"
            value={paperSummary?.totalRealizedPnl.jp ?? 0}
            unit="円"
            icon={<PiggyBank className="w-3.5 h-3.5" />}
            money
          />
        </div>
      </section>

      {/* 他の注目銘柄 */}
      {restPicks.length > 0 && (
        <section className="px-3 sm:px-4 pt-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              他の注目銘柄
            </h2>
            <Link href="/picks" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              すべて見る →
            </Link>
          </div>
          <div className="grid gap-2">
            {restPicks.map((p) => (
              <PickCard key={p.id} pick={p} />
            ))}
          </div>
        </section>
      )}

      {/* エア取引の保有中（あれば） */}
      {paperTrades.filter((t) => t.status === "open").length > 0 && (
        <section className="px-3 sm:px-4 pt-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              エア取引で保有中
            </h2>
            <Link href="/paper" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              詳しく見る →
            </Link>
          </div>
          <ul className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {paperTrades
              .filter((t) => t.status === "open")
              .slice(0, 3)
              .map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{t.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {t.shares}株 · 買値 {Math.round(t.buy_price).toLocaleString()}
                    </p>
                  </div>
                  <ChangeChip value={t.unrealized_pct} suffix="%" size="md" />
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* 手動でAI再生成 */}
      <section className="px-3 sm:px-4 pt-2">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold">最新の注目銘柄を計算しなおす</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              毎日朝に自動で計算しますが、手動で今すぐ計算しなおすこともできます（数十秒かかります）
            </p>
            {genMessage && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">{genMessage}</p>
            )}
          </div>
          <button
            type="button"
            onClick={generateNow}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            計算する
          </button>
        </div>
      </section>

      <section className="px-3 sm:px-4 pt-2">
        <AiNotice>
          AIの予想は <Term>移動平均線</Term>・<Term>出来高</Term>・<Term>RSI</Term> などの指標を組み合わせた参考値です。
          ニュースや決算など、AIが読み取りきれない情報もあります。判断はご自身で。
        </AiNotice>
      </section>
    </div>
  );
}

function StatBox({
  label,
  value,
  unit,
  icon,
  money,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
  icon?: React.ReactNode;
  money?: boolean;
  hint?: string;
}) {
  const isNum = typeof value === "number" && Number.isFinite(value);
  const display = !isNum
    ? "—"
    : money
      ? `${(value as number) > 0 ? "+" : ""}${Math.round(value as number).toLocaleString("ja-JP")}`
      : `${value}`;
  const color = money && isNum
    ? (value as number) > 0
      ? "text-rose-600 dark:text-rose-400"
      : (value as number) < 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-slate-700 dark:text-slate-200"
    : "text-slate-900 dark:text-slate-100";
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
      <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums leading-tight ${color}`}>
        {display}
        <span className="text-xs font-medium text-slate-400 ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

function EmptyHero({
  generating,
  onGenerate,
  message,
}: {
  generating: boolean;
  onGenerate: () => void;
  message: string | null;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 text-center">
      <Sparkles className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
      <h2 className="text-lg font-bold mb-1">まだ AI の予想がありません</h2>
      <p className="text-sm text-slate-500 mb-5">
        下のボタンで、AI に今日の注目銘柄を選んでもらいましょう。
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating ? "計算中…（30〜60秒かかります）" : "今日の注目銘柄を計算する"}
      </button>
      {message && <p className="text-xs text-slate-500 mt-3">{message}</p>}
    </div>
  );
}
