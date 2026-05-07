"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ChartPoint } from "@/lib/types";

const RANGES: { key: Range; label: string }[] = [
  { key: "1d", label: "1日" },
  { key: "5d", label: "5日" },
  { key: "1mo", label: "1ヶ月" },
  { key: "3mo", label: "3ヶ月" },
  { key: "6mo", label: "半年" },
  { key: "1y", label: "1年" },
];

type Range = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y";

type Props = {
  ticker: string;
  currency: string;
  alertLow: number | null;
  alertHigh: number | null;
};

export function ChartView({ ticker, currency, alertLow, alertHigh }: Props) {
  const [range, setRange] = useState<Range>("1mo");
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/chart?ticker=${encodeURIComponent(ticker)}&range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setPoints(d.points ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setPoints([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ticker, range]);

  const min = points.length ? Math.min(...points.map((p) => p.close)) : 0;
  const max = points.length ? Math.max(...points.map((p) => p.close)) : 0;
  const yPad = (max - min) * 0.1 || max * 0.02;
  const yMin = Math.min(min - yPad, alertLow ?? Infinity);
  const yMax = Math.max(max + yPad, alertHigh ?? -Infinity);

  const startPrice = points[0]?.close;
  const endPrice = points[points.length - 1]?.close;
  const trendUp = startPrice != null && endPrice != null && endPrice >= startPrice;
  const lineColor = trendUp ? "#dc2626" : "#059669";

  return (
    <div className="bg-white dark:bg-slate-900 sm:rounded-2xl sm:mx-2 border-y sm:border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1 px-2 pt-3 overflow-x-auto no-scrollbar">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition ${
              range === r.key
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="h-56 sm:h-72 px-2 pb-3 pt-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : points.length === 0 ? (
          <p className="h-full flex items-center justify-center text-sm text-slate-400">
            チャートを取得できませんでした
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatDate(v, range)}
                fontSize={10}
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                domain={[yMin, yMax]}
                fontSize={10}
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(v) => formatPriceShort(v, currency)}
              />
              <Tooltip
                formatter={(value) => {
                  const num = typeof value === "number" ? value : Number(value);
                  return [formatPriceShort(num, currency), "終値"] as [string, string];
                }}
                labelFormatter={(v) =>
                  new Date(v as string).toLocaleString("ja-JP")
                }
                contentStyle={{
                  background: "rgba(15,23,42,0.92)",
                  border: "none",
                  borderRadius: 8,
                  color: "#f1f5f9",
                  fontSize: 12,
                }}
                itemStyle={{ color: "#f1f5f9" }}
              />
              {alertLow != null && (
                <ReferenceLine
                  y={alertLow}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{
                    value: `下限 ${formatPriceShort(alertLow, currency)}`,
                    fontSize: 10,
                    fill: "#10b981",
                    position: "insideBottomRight",
                  }}
                />
              )}
              {alertHigh != null && (
                <ReferenceLine
                  y={alertHigh}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{
                    value: `上限 ${formatPriceShort(alertHigh, currency)}`,
                    fontSize: 10,
                    fill: "#f59e0b",
                    position: "insideTopRight",
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="close"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === "1d" || range === "5d") {
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatPriceShort(v: number, currency: string): string {
  if (currency === "JPY") return `${Math.round(v).toLocaleString("ja-JP")}`;
  return v.toFixed(2);
}
