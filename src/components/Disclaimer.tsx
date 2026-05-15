"use client";

import { ShieldAlert, Info } from "lucide-react";
import { usePathname } from "next/navigation";

// リスク表示。フッターに常時表示（ログイン画面以外）。

export function Disclaimer() {
  const path = usePathname() ?? "/";
  if (path === "/login") return null;
  return (
    <section className="max-w-screen-md mx-auto px-4 pt-2 pb-20 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
      <div className="flex items-start gap-2 bg-slate-100 dark:bg-slate-900 rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-800">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" aria-hidden />
        <p>
          このアプリは <b>投資判断のサポート</b> を目的としています。AI の予想は将来の利益を保証するものではありません。
          株式投資には <b>元本割れのリスク</b> があります。実際の売買の前に、まずは <b>エア取引</b> で実力を確かめることをおすすめします。
          最終的な判断はご自身の責任でお願いします。
        </p>
      </div>
    </section>
  );
}

// 「これは AI 予想です」という小バナー
export function AiNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 px-3 py-2 text-[12px] text-indigo-800 dark:text-indigo-200">
      <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
      <div>{children ?? "AI による参考予想です。「絶対に上がる」ことを意味しません。"}</div>
    </div>
  );
}
