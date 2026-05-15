"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AiPickWithSnapshots } from "@/lib/picks";
import { formatPrice } from "@/lib/format";
import { ChangeChip, HorizonBadge, RiskBadge } from "./PickBadges";

type Props = { pick: AiPickWithSnapshots };

export function PickCard({ pick }: Props) {
  const currency = pick.market === "jp" ? "JPY" : "USD";
  const cells = [
    { label: "1日後", v: pick.snapshots[1]?.change_pct ?? null },
    { label: "3日後", v: pick.snapshots[3]?.change_pct ?? null },
    { label: "1週間後", v: pick.snapshots[7]?.change_pct ?? null },
    { label: "1か月後", v: pick.snapshots[30]?.change_pct ?? null },
    { label: "現在", v: pick.liveChangePct ?? null },
  ];

  return (
    <Link
      href={`/stock/${encodeURIComponent(pick.ticker)}`}
      className="block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold truncate text-base">{pick.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {displayTicker(pick.ticker)} · {new Date(pick.picked_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })} 注目
            {pick.sector ? ` · ${pick.sector}` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold tabular-nums">{formatPrice(pick.price_at_pick, currency)}</p>
          <p className="text-[10px] text-slate-500">注目時の株価</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
      </div>

      <div className="flex flex-wrap gap-1.5 items-center mb-3">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
          自信度 {pick.confidence}
        </span>
        <RiskBadge level={pick.risk_level} />
        <HorizonBadge horizon={pick.horizon} />
      </div>

      <div className="grid grid-cols-5 gap-1 text-center">
        {cells.map((c) => (
          <div key={c.label} className="px-1 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <p className="text-[10px] text-slate-500 mb-0.5">{c.label}</p>
            <ChangeChip value={c.v} size="sm" />
          </div>
        ))}
      </div>

      {pick.rationale && (
        <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-3 line-clamp-2">
          {pick.rationale}
        </p>
      )}
    </Link>
  );
}

function displayTicker(t: string): string {
  return t.endsWith(".T") ? t.slice(0, -2) : t;
}
