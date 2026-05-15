"use client";

import { Term } from "./Term";

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  // 60-100 を視覚的に綺麗に。色は値が高いほど濃く。
  const color =
    pct >= 85
      ? "bg-gradient-to-r from-indigo-500 to-violet-600"
      : pct >= 70
        ? "bg-gradient-to-r from-sky-500 to-indigo-500"
        : "bg-gradient-to-r from-emerald-400 to-sky-500";
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          <Term>自信度</Term>
        </span>
        <span className="text-sm font-bold tabular-nums">{Math.round(pct)}<span className="text-[11px] font-medium text-slate-400">/100</span></span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const map = {
    low: { label: "リスク低め", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200" },
    medium: { label: "リスク中くらい", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200" },
    high: { label: "リスク高め", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200" },
  } as const;
  const v = map[level];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${v.color}`}>
      {v.label}
    </span>
  );
}

export function HorizonBadge({ horizon }: { horizon: "short" | "long" }) {
  const label = horizon === "short" ? "短期向け" : "中長期向け";
  const color =
    horizon === "short"
      ? "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200"
      : "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
      {label}
    </span>
  );
}

// 値動きパーセンテージを色付きで表示（JP式：上昇=赤、下落=緑）
export function ChangeChip({ value, suffix = "%", size = "sm" }: { value: number | null | undefined; suffix?: string; size?: "sm" | "md" | "lg" }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-slate-400 tabular-nums">—</span>;
  }
  const sign = value > 0 ? "+" : "";
  const color =
    value > 0
      ? "text-rose-600 dark:text-rose-400"
      : value < 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-slate-500 dark:text-slate-400";
  const cls = size === "lg" ? "text-2xl font-bold" : size === "md" ? "text-base font-semibold" : "text-sm font-semibold";
  return (
    <span className={`${color} ${cls} tabular-nums`}>
      {sign}
      {value.toFixed(2)}
      {suffix}
    </span>
  );
}
