"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import type { AiPickWithSnapshots, PicksSummary } from "@/lib/picks";
import { PickCard } from "./PickCard";
import { Term } from "./Term";
import { AiNotice } from "./Disclaimer";

type Filter = "all" | "short" | "long";

export function PicksView() {
  const [picks, setPicks] = useState<AiPickWithSnapshots[]>([]);
  const [summary, setSummary] = useState<PicksSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/picks?limit=100", { cache: "no-store" }),
        fetch("/api/picks/summary", { cache: "no-store" }),
      ]);
      const pData = await pRes.json();
      const sData = await sRes.json();
      setPicks(pData.picks ?? []);
      setSummary(sData.summary ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPicks = useMemo(() => {
    if (filter === "all") return picks;
    return picks.filter((p) => p.horizon === filter);
  }, [picks, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 pt-3 space-y-3">
      <AiNotice>
        AIが過去に注目した銘柄を <b>当たった・外した に関わらず全て</b> 表示しています。透明性のためにすべて残しています。
      </AiNotice>

      {/* 期間別の的中率 */}
      {summary && summary.byHorizon.some((h) => h.count > 0) && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <h2 className="text-sm font-semibold mb-1">
            注目後の <Term>勝率</Term>
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">
            注目した時点から見て、上昇していた割合（％）。サンプル数が増えるほど信頼できます。
          </p>
          <HitRateBars data={summary.byHorizon} />
        </section>
      )}

      {/* 自信度バンド別 */}
      {summary && summary.byConfidenceBand.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <h2 className="text-sm font-semibold mb-1">
            <Term>自信度</Term> 別の平均成績
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">
            AIの自信度が高いほど成績が良いかどうか、を検証しています。
          </p>
          <ConfidenceBandBars data={summary.byConfidenceBand} />
        </section>
      )}

      {/* 業種別 */}
      {summary && summary.bySector.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <h2 className="text-sm font-semibold mb-1">業種別の平均成績</h2>
          <p className="text-[11px] text-slate-500 mb-3">
            AIがどの業種を当てやすいか／苦手か、を検証しています。
          </p>
          <SectorBars data={summary.bySector.slice(0, 10)} />
        </section>
      )}

      {/* 短期 vs 中長期 */}
      {summary && (summary.shortVsLong.short.count > 0 || summary.shortVsLong.long.count > 0) && (
        <section className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-[11px] text-slate-500 mb-1">
              <Term>短期</Term> 予想
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {summary.shortVsLong.short.hitRate != null ? `${summary.shortVsLong.short.hitRate}%` : "—"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">勝率 ({summary.shortVsLong.short.count}件)</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-[11px] text-slate-500 mb-1">
              <Term>中長期</Term> 予想
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {summary.shortVsLong.long.hitRate != null ? `${summary.shortVsLong.long.hitRate}%` : "—"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">勝率 ({summary.shortVsLong.long.count}件)</p>
          </div>
        </section>
      )}

      {/* 月別 */}
      {summary && summary.monthly.length > 1 && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <h2 className="text-sm font-semibold mb-1">月別の平均成績</h2>
          <p className="text-[11px] text-slate-500 mb-3">月ごとの平均変化率（％）</p>
          <MonthlyBars data={summary.monthly} />
        </section>
      )}

      {/* フィルター */}
      <div className="flex items-center gap-2 sticky top-14 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur py-2 -mx-3 px-3 sm:-mx-4 sm:px-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <span className="text-xs text-slate-500">表示:</span>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="すべて" />
        <FilterChip active={filter === "short"} onClick={() => setFilter("short")} label="短期" />
        <FilterChip active={filter === "long"} onClick={() => setFilter("long")} label="中長期" />
        <span className="text-xs text-slate-500 ml-auto">{filteredPicks.length}件</span>
      </div>

      <div className="grid gap-2">
        {filteredPicks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-6 py-10 text-center text-sm text-slate-500">
            まだ予想がありません。ホームから「今日の注目銘柄を計算する」を押してみてください。
          </div>
        ) : (
          filteredPicks.map((p) => <PickCard key={p.id} pick={p} />)
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function HitRateBars({ data }: { data: PicksSummary["byHorizon"] }) {
  const formatted = data.map((d) => ({
    label: d.horizonDays === 1 ? "1日後" : d.horizonDays === 3 ? "3日後" : d.horizonDays === 7 ? "1週間後" : "1か月後",
    hitRate: d.hitRate ?? 0,
    count: d.count,
    avg: d.avgChangePct ?? 0,
  }));
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} width={32} tickFormatter={(v) => `${v}%`} />
          <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="3 3" />
          <Tooltip
            formatter={(_v, _n, p) => {
              const d = (p?.payload ?? {}) as { hitRate: number; count: number; avg: number };
              return [`${d.hitRate}% (${d.count}件・平均 ${d.avg >= 0 ? "+" : ""}${d.avg}%)`, "勝率"];
            }}
            contentStyle={{ background: "rgba(15,23,42,0.92)", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }}
          />
          <Bar dataKey="hitRate" radius={[8, 8, 0, 0]}>
            {formatted.map((d, i) => (
              <Cell key={i} fill={d.hitRate >= 50 ? "#6366f1" : "#cbd5e1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ConfidenceBandBars({ data }: { data: PicksSummary["byConfidenceBand"] }) {
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <XAxis dataKey="band" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
          <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
          <Tooltip
            formatter={(_v, _n, p) => {
              const d = (p?.payload ?? {}) as { avgChangePct: number; count: number; hitRate: number };
              return [`${d.avgChangePct >= 0 ? "+" : ""}${d.avgChangePct}% (勝率${d.hitRate}%・${d.count}件)`, "平均"];
            }}
            contentStyle={{ background: "rgba(15,23,42,0.92)", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }}
          />
          <Bar dataKey="avgChangePct" radius={[8, 8, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.avgChangePct != null && d.avgChangePct >= 0 ? "#e11d48" : "#10b981"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectorBars({ data }: { data: PicksSummary["bySector"] }) {
  return (
    <div style={{ height: Math.max(160, data.length * 28) + "px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <XAxis type="number" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <YAxis dataKey="sector" type="category" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} width={70} />
          <ReferenceLine x={0} stroke="#cbd5e1" strokeDasharray="3 3" />
          <Tooltip
            formatter={(_v, _n, p) => {
              const d = (p?.payload ?? {}) as { avgChangePct: number; count: number };
              return [`${d.avgChangePct >= 0 ? "+" : ""}${d.avgChangePct}% (${d.count}件)`, "平均"];
            }}
            contentStyle={{ background: "rgba(15,23,42,0.92)", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }}
          />
          <Bar dataKey="avgChangePct" radius={[0, 6, 6, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.avgChangePct != null && d.avgChangePct >= 0 ? "#e11d48" : "#10b981"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyBars({ data }: { data: PicksSummary["monthly"] }) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
          <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
          <Tooltip
            formatter={(_v, _n, p) => {
              const d = (p?.payload ?? {}) as { avgChangePct: number; count: number };
              return [`${d.avgChangePct >= 0 ? "+" : ""}${d.avgChangePct}% (${d.count}件)`, "平均"];
            }}
            contentStyle={{ background: "rgba(15,23,42,0.92)", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }}
          />
          <Bar dataKey="avgChangePct" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.avgChangePct != null && d.avgChangePct >= 0 ? "#e11d48" : "#10b981"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
