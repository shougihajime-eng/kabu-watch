import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { detectMarket, normalizeTicker, yahooFinance } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("watchlist")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[GET /api/watchlist] DB error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rawTicker = typeof body?.ticker === "string" ? body.ticker : null;
  const market = body?.market === "jp" || body?.market === "us" ? body.market : undefined;
  const groupId: string | null = typeof body?.groupId === "string" ? body.groupId : null;

  if (!rawTicker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  const ticker = normalizeTicker(rawTicker, market);
  let name = body?.name && typeof body.name === "string" ? body.name : ticker;

  // Try to fetch the name from Yahoo if not provided
  if (!body?.name) {
    try {
      const q = await yahooFinance.quote(ticker);
      const single = Array.isArray(q) ? q[0] : q;
      if (single) name = single.shortName || single.longName || ticker;
    } catch (err) {
      console.warn("[POST /api/watchlist] quote lookup failed", err);
    }
  }

  const { data, error } = await supabaseAdmin
    .from("watchlist")
    .insert({
      ticker,
      market: detectMarket(ticker),
      name,
      group_id: groupId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "この銘柄はすでに追加されています" },
        { status: 409 },
      );
    }
    console.error("[POST /api/watchlist] DB error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}
