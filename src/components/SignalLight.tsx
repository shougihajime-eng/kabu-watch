"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { SignalKind } from "@/lib/ai/scorer";
import { Term } from "./Term";

const STYLES: Record<
  SignalKind,
  { label: string; sub: string; bg: string; ring: string; text: string; icon: typeof CheckCircle2; dot: string }
> = {
  buy: {
    label: "今、買い時かも",
    sub: "青信号",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    ring: "ring-emerald-300/70 dark:ring-emerald-700/60",
    text: "text-emerald-800 dark:text-emerald-200",
    icon: CheckCircle2,
    dot: "bg-emerald-500",
  },
  wait: {
    label: "様子見",
    sub: "黄信号",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    ring: "ring-amber-300/70 dark:ring-amber-700/60",
    text: "text-amber-800 dark:text-amber-200",
    icon: Clock,
    dot: "bg-amber-500",
  },
  avoid: {
    label: "今は手を出さない",
    sub: "赤信号",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    ring: "ring-rose-300/70 dark:ring-rose-700/60",
    text: "text-rose-800 dark:text-rose-200",
    icon: XCircle,
    dot: "bg-rose-500",
  },
};

type Props = {
  signal: SignalKind;
  reason?: string | null;
  size?: "lg" | "md";
};

// 大きく見せる「信号機」カード。一目で「今買って良いか」が分かるのが目的。
export function SignalLight({ signal, reason, size = "lg" }: Props) {
  const s = STYLES[signal];
  const Icon = s.icon;
  const big = size === "lg";

  return (
    <div className={`rounded-2xl ring-1 ${s.ring} ${s.bg} ${big ? "p-4" : "p-3"} flex items-center gap-3`}>
      {/* 縦に並んだ3つの丸 = 信号機 */}
      <div className="shrink-0 flex flex-col items-center gap-1.5 rounded-xl bg-slate-900/90 px-2 py-2">
        <span
          className={`block ${big ? "w-3 h-3" : "w-2.5 h-2.5"} rounded-full ${signal === "avoid" ? s.dot : "bg-slate-700"}`}
          aria-hidden
        />
        <span
          className={`block ${big ? "w-3 h-3" : "w-2.5 h-2.5"} rounded-full ${signal === "wait" ? s.dot : "bg-slate-700"}`}
          aria-hidden
        />
        <span
          className={`block ${big ? "w-3 h-3" : "w-2.5 h-2.5"} rounded-full ${signal === "buy" ? s.dot : "bg-slate-700"}`}
          aria-hidden
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className={`flex items-center gap-1.5 ${s.text}`}>
          <Icon className={big ? "w-5 h-5" : "w-4 h-4"} />
          <p className={big ? "text-lg font-bold leading-none" : "text-sm font-bold leading-none"}>
            {s.label}
          </p>
          <span className="text-[10px] font-semibold opacity-70 ml-1">
            <Term>信号機</Term>: {s.sub}
          </span>
        </div>
        {reason && (
          <p className={`mt-1 text-xs ${s.text} opacity-90 leading-snug`}>{reason}</p>
        )}
      </div>
    </div>
  );
}

// 小さい丸バッジ版（一覧カード用）
export function SignalDot({ signal }: { signal: SignalKind }) {
  const s = STYLES[signal];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
