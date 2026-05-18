"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { estimateWorstLoss } from "@/lib/ai/scorer";
import { Term } from "./Term";

const AMOUNT_PRESETS = [
  { label: "1万円", value: 10000 },
  { label: "5万円", value: 50000 },
  { label: "10万円", value: 100000 },
  { label: "30万円", value: 300000 },
];

type Props = {
  maxDrawdownPct: number | null; // 負の値 (例: -25)
  size?: "md" | "lg";
};

// 過去のチャートから「最悪いくら損するか」を見せるカード。
// 投資額をボタンで切り替え可能。
export function WorstLossCard({ maxDrawdownPct, size = "md" }: Props) {
  const [amount, setAmount] = useState<number>(100000); // 既定: 10万円

  if (maxDrawdownPct == null || !Number.isFinite(maxDrawdownPct) || maxDrawdownPct === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-xs text-slate-500">過去の値動きデータが足りないため、最悪損失は計算できませんでした。</p>
      </div>
    );
  }

  const est = estimateWorstLoss(maxDrawdownPct, amount);
  const big = size === "lg";

  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-950/30 dark:to-rose-950/30 border border-orange-200/70 dark:border-orange-900/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/60 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-orange-700 dark:text-orange-300" />
        </div>
        <p className="text-sm font-bold text-orange-900 dark:text-orange-100">
          <Term>最悪いくら損するか</Term>
        </p>
      </div>

      <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-snug mb-3">
        過去90日のチャートで、この銘柄は最大{est.lossPct}%下げたことがあります。
        もし同じことが起きたら――
      </p>

      <div className="bg-white dark:bg-slate-900 rounded-xl px-4 py-3 mb-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs text-slate-500">{amount.toLocaleString("ja-JP")}円買うと、最悪</span>
          <span className={`${big ? "text-2xl" : "text-xl"} font-bold text-rose-600 dark:text-rose-400 tabular-nums`}>
            −{est.lossAmount.toLocaleString("ja-JP")}円
          </span>
          <span className="text-xs text-slate-500">までいく可能性</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {AMOUNT_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setAmount(p.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              amount === p.value
                ? "bg-orange-600 text-white"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-orange-900/30"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
        ※ あくまで過去90日に起きた「最悪のケース」の参考値です。これより大きく下がる可能性もゼロではありません。
      </p>
    </div>
  );
}
