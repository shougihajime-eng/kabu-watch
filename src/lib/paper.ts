// エア取引に関する型と集計ヘルパー

export type PaperTrade = {
  id: string;
  ticker: string;
  market: "jp" | "us";
  name: string;
  shares: number;
  buy_price: number;
  buy_at: string;
  sell_price: number | null;
  sell_at: string | null;
  pick_id: string | null;
  note: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
};

export type PaperTradeWithLive = PaperTrade & {
  current_price: number | null;
  unrealized_pnl: number | null; // 含み損益（open のみ）
  unrealized_pct: number | null;
  realized_pnl: number | null; // 確定損益（closed のみ）
  realized_pct: number | null;
  hold_days: number; // 保有日数
};

export type PaperSummary = {
  openCount: number;
  closedCount: number;
  totalRealizedPnl: { jp: number; us: number };
  totalUnrealizedPnl: { jp: number; us: number };
  winCount: number;
  loseCount: number;
  winRate: number | null; // closed の勝率 0-100
  avgWinPct: number | null;
  avgLosePct: number | null;
  maxDrawPct: number | null; // closed の中で最大の下落率（マイナス値）
  avgHoldDays: number | null;
  bestTrade: { ticker: string; name: string; pct: number } | null;
  worstTrade: { ticker: string; name: string; pct: number } | null;
  // 累計損益の時系列（closed の sell_at 順）
  realizedTimeline: Array<{ date: string; cumulative: number }>;
};

export function computeSummary(
  trades: PaperTradeWithLive[],
): PaperSummary {
  const open = trades.filter((t) => t.status === "open");
  const closed = trades.filter((t) => t.status === "closed");

  const totalRealizedPnl = { jp: 0, us: 0 };
  for (const t of closed) {
    if (t.realized_pnl != null) totalRealizedPnl[t.market] += t.realized_pnl;
  }

  const totalUnrealizedPnl = { jp: 0, us: 0 };
  for (const t of open) {
    if (t.unrealized_pnl != null) totalUnrealizedPnl[t.market] += t.unrealized_pnl;
  }

  const winPcts: number[] = [];
  const losePcts: number[] = [];
  for (const t of closed) {
    if (t.realized_pct == null) continue;
    if (t.realized_pct > 0) winPcts.push(t.realized_pct);
    else if (t.realized_pct < 0) losePcts.push(t.realized_pct);
  }

  const closedWithPct = closed.filter((t) => t.realized_pct != null);
  const winRate =
    closedWithPct.length > 0
      ? (winPcts.length / closedWithPct.length) * 100
      : null;

  const avgWinPct =
    winPcts.length > 0
      ? winPcts.reduce((a, b) => a + b, 0) / winPcts.length
      : null;
  const avgLosePct =
    losePcts.length > 0
      ? losePcts.reduce((a, b) => a + b, 0) / losePcts.length
      : null;

  const maxDrawPct =
    losePcts.length > 0 ? Math.min(...losePcts) : null;

  const avgHoldDays =
    closed.length > 0
      ? closed.reduce((a, b) => a + b.hold_days, 0) / closed.length
      : null;

  let bestTrade: PaperSummary["bestTrade"] = null;
  let worstTrade: PaperSummary["worstTrade"] = null;
  for (const t of closed) {
    if (t.realized_pct == null) continue;
    if (!bestTrade || t.realized_pct > bestTrade.pct) {
      bestTrade = { ticker: t.ticker, name: t.name, pct: t.realized_pct };
    }
    if (!worstTrade || t.realized_pct < worstTrade.pct) {
      worstTrade = { ticker: t.ticker, name: t.name, pct: t.realized_pct };
    }
  }

  // 累計損益の推移（JPY 銘柄のみ、closed を sell_at 順）
  const closedJp = closed
    .filter((t) => t.market === "jp" && t.sell_at && t.realized_pnl != null)
    .sort((a, b) => (a.sell_at! < b.sell_at! ? -1 : 1));
  const realizedTimeline: PaperSummary["realizedTimeline"] = [];
  let cum = 0;
  for (const t of closedJp) {
    cum += t.realized_pnl ?? 0;
    realizedTimeline.push({ date: t.sell_at!.slice(0, 10), cumulative: cum });
  }

  return {
    openCount: open.length,
    closedCount: closed.length,
    totalRealizedPnl,
    totalUnrealizedPnl,
    winCount: winPcts.length,
    loseCount: losePcts.length,
    winRate: winRate == null ? null : Number(winRate.toFixed(1)),
    avgWinPct: avgWinPct == null ? null : Number(avgWinPct.toFixed(2)),
    avgLosePct: avgLosePct == null ? null : Number(avgLosePct.toFixed(2)),
    maxDrawPct: maxDrawPct == null ? null : Number(maxDrawPct.toFixed(2)),
    avgHoldDays: avgHoldDays == null ? null : Number(avgHoldDays.toFixed(1)),
    bestTrade,
    worstTrade,
    realizedTimeline,
  };
}

export function enrichTrade(trade: PaperTrade, currentPrice: number | null): PaperTradeWithLive {
  const buyAt = new Date(trade.buy_at);
  const refDate = trade.sell_at ? new Date(trade.sell_at) : new Date();
  const hold_days = Math.max(0, Math.round((refDate.getTime() - buyAt.getTime()) / (24 * 60 * 60 * 1000)));

  if (trade.status === "closed" && trade.sell_price != null) {
    const realized_pnl = (trade.sell_price - trade.buy_price) * trade.shares;
    const realized_pct = trade.buy_price > 0 ? ((trade.sell_price - trade.buy_price) / trade.buy_price) * 100 : null;
    return {
      ...trade,
      current_price: currentPrice,
      unrealized_pnl: null,
      unrealized_pct: null,
      realized_pnl: Number(realized_pnl.toFixed(2)),
      realized_pct: realized_pct == null ? null : Number(realized_pct.toFixed(2)),
      hold_days,
    };
  }

  // open
  if (currentPrice == null) {
    return {
      ...trade,
      current_price: null,
      unrealized_pnl: null,
      unrealized_pct: null,
      realized_pnl: null,
      realized_pct: null,
      hold_days,
    };
  }
  const unrealized_pnl = (currentPrice - trade.buy_price) * trade.shares;
  const unrealized_pct = trade.buy_price > 0 ? ((currentPrice - trade.buy_price) / trade.buy_price) * 100 : null;
  return {
    ...trade,
    current_price: currentPrice,
    unrealized_pnl: Number(unrealized_pnl.toFixed(2)),
    unrealized_pct: unrealized_pct == null ? null : Number(unrealized_pct.toFixed(2)),
    realized_pnl: null,
    realized_pct: null,
    hold_days,
  };
}
