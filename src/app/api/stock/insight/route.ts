import { NextRequest, NextResponse } from "next/server";
import { fetchDailyBars } from "@/lib/ai/bars";
import { scoreBars } from "@/lib/ai/scorer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/stock/insight?ticker=7203.T
// 任意の銘柄について、信号機・自信度・最悪損失の見積もりを返す。
// （詳細ページや任意の銘柄カードで使う用）
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }
  try {
    const bars = await fetchDailyBars(ticker);
    const v = scoreBars(bars);
    if (!v) {
      return NextResponse.json({ ok: false, message: "データ不足のため判定できませんでした" });
    }
    return NextResponse.json({
      ok: true,
      ticker,
      signal: v.signal,
      signalReason: v.signalReason,
      confidence: v.confidence,
      riskLevel: v.riskLevel,
      horizon: v.horizon,
      rationale: v.rationale,
      reasons: v.reasons,
      maxDrawdownPct: v.signals.maxDrawdownPct,
      worst20DayDropPct: v.signals.worst20DayDropPct,
      worstSingleDayDropPct: v.signals.worstSingleDayDropPct,
    });
  } catch (err) {
    console.warn("[GET /api/stock/insight] failed", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
