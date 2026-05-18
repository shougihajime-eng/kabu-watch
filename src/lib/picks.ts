// AI 注目銘柄の集計用ヘルパー
import { classifySignal, type SignalKind, type ScoreSignals } from "@/lib/ai/scorer";

export type PickSnapshot = {
  pick_id: string;
  horizon_days: number;
  price: number | null;
  change_pct: number | null;
  recorded_at: string;
};

export type AiPick = {
  id: string;
  ticker: string;
  market: "jp" | "us";
  name: string;
  picked_at: string;
  price_at_pick: number | null;
  confidence: number;
  risk_level: "low" | "medium" | "high";
  horizon: "short" | "long";
  rationale: string;
  signals: Record<string, number>;
  rank: number;
  sector: string | null;
  engine_version: string;
  created_at: string;
};

export type AiPickWithSnapshots = AiPick & {
  snapshots: Record<number, PickSnapshot>; // horizon_days -> snapshot
  livePrice: number | null;
  liveChangePct: number | null; // 現時点の値動き
  signal: SignalKind; // 信号機（保存時のスコアから導出）
  signalReason: string;
  maxDrawdownPct: number | null; // 過去観測の最大下落率（過去pickではnull）
};

// 保存時のスコア(JSONB)から信号機・最大ドローダウンを後付けで計算するヘルパー
export function deriveSignalAndRisk(
  signals: Record<string, number>,
  confidence: number,
): { signal: SignalKind; signalReason: string; maxDrawdownPct: number | null } {
  // 必須フィールドが無い旧データへの後方互換
  const sig: ScoreSignals = {
    trend: Number(signals.trend ?? 50),
    momentum: Number(signals.momentum ?? 50),
    volume: Number(signals.volume ?? 50),
    rsi: Number(signals.rsi ?? 50),
    pullback: Number(signals.pullback ?? 50),
    volatility: Number(signals.volatility ?? 0),
    rsiValue: Number(signals.rsiValue ?? 50),
    ma5: Number(signals.ma5 ?? 0),
    ma20: Number(signals.ma20 ?? 0),
    ma50: Number(signals.ma50 ?? 0),
    return1d: Number(signals.return1d ?? 0),
    return5d: Number(signals.return5d ?? 0),
    return20d: Number(signals.return20d ?? 0),
    volumeRatio: Number(signals.volumeRatio ?? 1),
    maxDrawdownPct: Number(signals.maxDrawdownPct ?? 0),
    worst20DayDropPct: Number(signals.worst20DayDropPct ?? 0),
    worstSingleDayDropPct: Number(signals.worstSingleDayDropPct ?? 0),
  };
  const { signal, reason } = classifySignal(sig, confidence);
  const dd = signals.maxDrawdownPct;
  return {
    signal,
    signalReason: reason,
    maxDrawdownPct: typeof dd === "number" && Number.isFinite(dd) ? dd : null,
  };
}

export type HorizonStats = {
  horizonDays: number;
  count: number;
  winCount: number;
  hitRate: number | null;
  avgChangePct: number | null;
  maxGainPct: number | null;
  maxLossPct: number | null;
};

export type PicksSummary = {
  totalPicks: number;
  byHorizon: HorizonStats[];
  bySector: Array<{ sector: string; count: number; avgChangePct: number | null; hitRate: number | null }>;
  byRiskLevel: Array<{ risk: string; count: number; avgChangePct: number | null }>;
  shortVsLong: {
    short: { count: number; avgChangePct: number | null; hitRate: number | null };
    long: { count: number; avgChangePct: number | null; hitRate: number | null };
  };
  byConfidenceBand: Array<{ band: string; count: number; avgChangePct: number | null; hitRate: number | null }>;
  monthly: Array<{ month: string; count: number; avgChangePct: number | null; hitRate: number | null }>;
};

const HORIZONS = [1, 3, 7, 30];

function summarizeChanges(values: number[]) {
  if (values.length === 0) return { count: 0, winCount: 0, hitRate: null, avgChangePct: null, maxGainPct: null, maxLossPct: null };
  const winCount = values.filter((v) => v > 0).length;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    winCount,
    hitRate: Number(((winCount / values.length) * 100).toFixed(1)),
    avgChangePct: Number((sum / values.length).toFixed(2)),
    maxGainPct: Number(Math.max(...values).toFixed(2)),
    maxLossPct: Number(Math.min(...values).toFixed(2)),
  };
}

export function buildSummary(picksWithSnapshots: AiPickWithSnapshots[]): PicksSummary {
  // 1) 各 horizon の統計（snapshot 基準）
  const byHorizon: HorizonStats[] = HORIZONS.map((h) => {
    const vals: number[] = [];
    for (const p of picksWithSnapshots) {
      const s = p.snapshots[h];
      if (s?.change_pct != null) vals.push(s.change_pct);
    }
    const s = summarizeChanges(vals);
    return { horizonDays: h, ...s };
  });

  // 2) 業種別（30日後成績を基準。無ければ 7日、それも無ければ live）
  const sectorMap = new Map<string, number[]>();
  for (const p of picksWithSnapshots) {
    const sec = p.sector ?? "その他";
    const change =
      p.snapshots[30]?.change_pct ??
      p.snapshots[7]?.change_pct ??
      p.snapshots[3]?.change_pct ??
      p.snapshots[1]?.change_pct ??
      p.liveChangePct ??
      null;
    if (change == null) continue;
    const arr = sectorMap.get(sec) ?? [];
    arr.push(change);
    sectorMap.set(sec, arr);
  }
  const bySector = [...sectorMap.entries()]
    .map(([sector, vals]) => {
      const s = summarizeChanges(vals);
      return { sector, count: vals.length, avgChangePct: s.avgChangePct, hitRate: s.hitRate };
    })
    .sort((a, b) => (b.avgChangePct ?? -Infinity) - (a.avgChangePct ?? -Infinity));

  // 3) リスク別
  const riskMap = new Map<string, number[]>();
  for (const p of picksWithSnapshots) {
    const change =
      p.snapshots[7]?.change_pct ?? p.snapshots[3]?.change_pct ?? p.snapshots[1]?.change_pct ?? p.liveChangePct ?? null;
    if (change == null) continue;
    const arr = riskMap.get(p.risk_level) ?? [];
    arr.push(change);
    riskMap.set(p.risk_level, arr);
  }
  const byRiskLevel = ["low", "medium", "high"]
    .filter((r) => riskMap.has(r))
    .map((r) => {
      const vals = riskMap.get(r)!;
      const s = summarizeChanges(vals);
      return { risk: r, count: vals.length, avgChangePct: s.avgChangePct };
    });

  // 4) 短期 vs 中長期
  function bucketByHorizon(horizon: "short" | "long") {
    const vals: number[] = [];
    for (const p of picksWithSnapshots) {
      if (p.horizon !== horizon) continue;
      const change = horizon === "short"
        ? (p.snapshots[3]?.change_pct ?? p.snapshots[1]?.change_pct ?? p.liveChangePct)
        : (p.snapshots[30]?.change_pct ?? p.snapshots[7]?.change_pct ?? p.liveChangePct);
      if (change != null) vals.push(change);
    }
    const s = summarizeChanges(vals);
    return { count: vals.length, avgChangePct: s.avgChangePct, hitRate: s.hitRate };
  }
  const shortVsLong = { short: bucketByHorizon("short"), long: bucketByHorizon("long") };

  // 5) 自信度バンド
  const bands = [
    { label: "60〜69", lo: 60, hi: 69 },
    { label: "70〜79", lo: 70, hi: 79 },
    { label: "80〜89", lo: 80, hi: 89 },
    { label: "90〜100", lo: 90, hi: 100 },
  ];
  const byConfidenceBand = bands
    .map((b) => {
      const vals: number[] = [];
      for (const p of picksWithSnapshots) {
        if (p.confidence < b.lo || p.confidence > b.hi) continue;
        const change = p.snapshots[7]?.change_pct ?? p.snapshots[3]?.change_pct ?? p.snapshots[1]?.change_pct ?? p.liveChangePct;
        if (change != null) vals.push(change);
      }
      const s = summarizeChanges(vals);
      return { band: b.label, count: vals.length, avgChangePct: s.avgChangePct, hitRate: s.hitRate };
    })
    .filter((b) => b.count > 0);

  // 6) 月別
  const monthMap = new Map<string, number[]>();
  for (const p of picksWithSnapshots) {
    const ym = p.picked_at.slice(0, 7); // YYYY-MM
    const change = p.snapshots[7]?.change_pct ?? p.snapshots[3]?.change_pct ?? p.snapshots[1]?.change_pct ?? p.liveChangePct;
    if (change == null) continue;
    const arr = monthMap.get(ym) ?? [];
    arr.push(change);
    monthMap.set(ym, arr);
  }
  const monthly = [...monthMap.entries()]
    .map(([month, vals]) => {
      const s = summarizeChanges(vals);
      return { month, count: vals.length, avgChangePct: s.avgChangePct, hitRate: s.hitRate };
    })
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  return {
    totalPicks: picksWithSnapshots.length,
    byHorizon,
    bySector,
    byRiskLevel,
    shortVsLong,
    byConfidenceBand,
    monthly,
  };
}
