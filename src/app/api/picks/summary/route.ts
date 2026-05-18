import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yahooFinance } from "@/lib/yahoo";
import { buildSummary, deriveSignalAndRisk, type AiPick, type AiPickWithSnapshots, type PickSnapshot } from "@/lib/picks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 過去全期間の AI 予想に対する集計サマリー
export async function GET(req: NextRequest) {
  const days = Math.min(720, Number(req.nextUrl.searchParams.get("days") ?? 365));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { data: picksRaw, error } = await supabaseAdmin
    .from("ai_picks")
    .select("*")
    .gte("picked_at", since.toISOString())
    .order("picked_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const picks = (picksRaw ?? []) as AiPick[];

  let snapshots: PickSnapshot[] = [];
  if (picks.length > 0) {
    const { data: snapsRaw } = await supabaseAdmin
      .from("pick_snapshots")
      .select("*")
      .in("pick_id", picks.map((p) => p.id));
    snapshots = (snapsRaw ?? []) as PickSnapshot[];
  }

  const snapMap = new Map<string, Record<number, PickSnapshot>>();
  for (const s of snapshots) {
    const bucket = snapMap.get(s.pick_id) ?? {};
    bucket[s.horizon_days] = s;
    snapMap.set(s.pick_id, bucket);
  }

  // ライブ価格は集計には任意（30 件超なら省略してパフォーマンス優先）
  const priceMap = new Map<string, number | null>();
  if (picks.length > 0 && picks.length <= 60) {
    try {
      const tickers = [...new Set(picks.map((p) => p.ticker))];
      const raw = await yahooFinance.quote(tickers);
      const arr = Array.isArray(raw) ? raw : [raw];
      for (const q of arr) {
        if (q?.symbol) priceMap.set(q.symbol, q.regularMarketPrice ?? q.regularMarketPreviousClose ?? null);
      }
    } catch (err) {
      console.warn("[GET /api/picks/summary] quote failed", err);
    }
  }

  const enriched: AiPickWithSnapshots[] = picks.map((p) => {
    const live = priceMap.get(p.ticker) ?? null;
    const liveChangePct =
      live != null && p.price_at_pick && p.price_at_pick > 0
        ? Number((((live - p.price_at_pick) / p.price_at_pick) * 100).toFixed(2))
        : null;
    const derived = deriveSignalAndRisk(p.signals ?? {}, p.confidence);
    return {
      ...p,
      snapshots: snapMap.get(p.id) ?? {},
      livePrice: live,
      liveChangePct,
      signal: derived.signal,
      signalReason: derived.signalReason,
      maxDrawdownPct: derived.maxDrawdownPct,
    };
  });

  const summary = buildSummary(enriched);
  return NextResponse.json({ summary });
}
