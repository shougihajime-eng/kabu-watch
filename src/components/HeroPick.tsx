"use client";

import Link from "next/link";
import { Sparkles, TrendingUp } from "lucide-react";
import type { AiPickWithSnapshots } from "@/lib/picks";
import { formatPrice } from "@/lib/format";
import { ConfidenceBar, RiskBadge, HorizonBadge, ChangeChip } from "./PickBadges";
import { AddPaperButton } from "./AddPaperButton";
import { Term } from "./Term";

type Props = {
  pick: AiPickWithSnapshots;
  similarHitRate: number | null; // 過去に同じくらいの自信度の予想が当たった率
  similarSampleSize: number;
  rankLabel?: string;
};

export function HeroPick({ pick, similarHitRate, similarSampleSize, rankLabel }: Props) {
  const currency = pick.market === "jp" ? "JPY" : "USD";
  return (
    <article className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
      {/* 上端の AI ストライプ */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" />
            {rankLabel ?? "AIが今、最も注目"}
          </span>
          <span className="text-[11px] text-slate-400">
            {new Date(pick.picked_at).toLocaleString("ja-JP", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* 銘柄名・現在値 */}
        <div className="flex items-end justify-between gap-3 mb-4">
          <div className="min-w-0">
            <Link
              href={`/stock/${encodeURIComponent(pick.ticker)}`}
              className="block hover:underline underline-offset-4 decoration-2"
            >
              <h2 className="text-2xl sm:text-3xl font-bold truncate leading-tight">{pick.name}</h2>
            </Link>
            <p className="text-xs text-slate-500 mt-1">
              {displayTicker(pick.ticker)} {pick.sector ? `· ${pick.sector}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold tabular-nums">
              {formatPrice(pick.livePrice ?? pick.price_at_pick, currency)}
            </p>
            <p className="text-xs text-slate-500">
              注目時 {formatPrice(pick.price_at_pick, currency)}
            </p>
            <div className="mt-1">
              <ChangeChip value={pick.liveChangePct} suffix="%" size="sm" />
            </div>
          </div>
        </div>

        {/* 自信度バー */}
        <div className="mb-4">
          <ConfidenceBar value={pick.confidence} />
        </div>

        {/* バッジ群 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <RiskBadge level={pick.risk_level} />
          <HorizonBadge horizon={pick.horizon} />
          {similarHitRate != null && similarSampleSize >= 3 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/60">
              <TrendingUp className="w-3 h-3" />
              似た予想の的中率 {similarHitRate.toFixed(0)}%
              <span className="text-[10px] opacity-70">({similarSampleSize}件)</span>
            </span>
          )}
        </div>

        {/* 注目理由 */}
        <div className="mb-5">
          <p className="text-[11px] text-slate-500 mb-1.5 font-semibold tracking-wide">
            なぜAIが注目しているか
          </p>
          <ul className="space-y-1.5">
            {pick.rationale
              .split(/。/)
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
              .map((reason, i) => (
                <li key={i} className="text-sm leading-relaxed flex gap-2">
                  <span className="text-indigo-500 shrink-0 select-none">•</span>
                  <span>{reason}。</span>
                </li>
              ))}
          </ul>
        </div>

        {/* 行動 */}
        <div className="flex flex-wrap gap-2 items-center">
          <AddPaperButton ticker={pick.ticker} pickId={pick.id} label="エア取引で検証する" />
          <Link
            href={`/stock/${encodeURIComponent(pick.ticker)}`}
            className="inline-flex items-center px-4 py-2.5 rounded-full text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            チャート・ニュースを見る
          </Link>
        </div>

        {/* AI 注意書き */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
          ※「<Term>自信度</Term>」はAIの内部スコアの目安です。「絶対に上がる」ことを意味しません。まずは<Term>エア取引</Term>で実力を確かめましょう。
        </p>
      </div>
    </article>
  );
}

function displayTicker(t: string): string {
  return t.endsWith(".T") ? t.slice(0, -2) : t;
}
