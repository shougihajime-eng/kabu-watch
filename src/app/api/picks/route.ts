import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yahooFinance } from "@/lib/yahoo";
import type { AiPick, AiPickWithSnapshots, PickSnapshot } from "@/lib/picks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/picks?limit=20&days=90
export async function GET(req: NextRequest) {
  const limit = Math.min(200, Number(req.nextUrl.searchParams.get("limit") ?? 50));
  const days = Math.min(365, Number(req.nextUrl.searchParams.get("days") ?? 120));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { data: picksRaw, error } = await supabaseAdmin
    .from("ai_picks")
    .select("*")
    .gte("picked_at", since.toISOString())
    .order("picked_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[GET /api/picks] DB error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const picks = (picksRaw ?? []) as AiPick[];
  if (picks.length === 0) {
    return NextResponse.json({ picks: [] });
  }

  const pickIds = picks.map((p) => p.id);
  const { data: snapsRaw } = await supabaseAdmin
    .from("pick_snapshots")
    .select("*")
    .in("pick_id", pickIds);

  const snapMap = new Map<string, Record<number, PickSnapshot>>();
  for (const s of (snapsRaw ?? []) as PickSnapshot[]) {
    const bucket = snapMap.get(s.pick_id) ?? {};
    bucket[s.horizon_days] = s;
    snapMap.set(s.pick_id, bucket);
  }

  // ライブ価格
  const uniqueTickers = [...new Set(picks.map((p) => p.ticker))];
  const priceMap = new Map<string, number | null>();
  if (uniqueTickers.length > 0) {
    try {
      const raw = await yahooFinance.quote(uniqueTickers);
      const arr = Array.isArray(raw) ? raw : [raw];
      for (const q of arr) {
        if (q?.symbol) {
          priceMap.set(q.symbol, q.regularMarketPrice ?? q.regularMarketPreviousClose ?? null);
        }
      }
    } catch (err) {
      console.warn("[GET /api/picks] live quote failed", err);
    }
  }

  const enriched: AiPickWithSnapshots[] = picks.map((p) => {
    const live = priceMap.get(p.ticker) ?? null;
    const liveChangePct =
      live != null && p.price_at_pick && p.price_at_pick > 0
        ? Number((((live - p.price_at_pick) / p.price_at_pick) * 100).toFixed(2))
        : null;
    return {
      ...p,
      snapshots: snapMap.get(p.id) ?? {},
      livePrice: live,
      liveChangePct,
    };
  });

  return NextResponse.json({ picks: enriched });
}
