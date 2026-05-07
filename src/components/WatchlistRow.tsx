"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Quote, WatchlistItem } from "@/lib/types";
import { changeColor, formatChange, formatPrice } from "@/lib/format";

type Props = {
  item: WatchlistItem;
  quote: Quote | undefined;
};

export function WatchlistRow({ item, quote }: Props) {
  const price = quote?.price ?? null;
  const currency = quote?.currency ?? (item.market === "jp" ? "JPY" : "USD");

  const alertHit =
    price != null &&
    ((item.alert_low != null && price <= item.alert_low) ||
      (item.alert_high != null && price >= item.alert_high));

  return (
    <Link
      href={`/stock/${encodeURIComponent(item.ticker)}`}
      className="flex items-center gap-3 px-4 py-3 active:bg-slate-100 dark:active:bg-slate-800/60 transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {alertHit && (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" aria-label="アラート" />
          )}
          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {item.name}
          </p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {displayTicker(item.ticker)} · {item.market === "jp" ? "日本株" : "米国株"}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="font-semibold tabular-nums">{formatPrice(price, currency)}</p>
        <p className={`text-xs tabular-nums ${changeColor(quote?.change)}`}>
          {formatChange(quote?.change, quote?.changePercent, currency)}
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
    </Link>
  );
}

function displayTicker(t: string): string {
  return t.endsWith(".T") ? t.slice(0, -2) : t;
}
