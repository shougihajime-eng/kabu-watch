import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { detectMarket, normalizeTicker, yahooFinance } from "@/lib/yahoo";
import { computeSummary, enrichTrade, type PaperTrade } from "@/lib/paper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: エア取引の一覧 + 集計サマリー
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("paper_trades")
    .select("*")
    .order("buy_at", { ascending: false });
  if (error) {
    console.error("[GET /api/paper] DB error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const trades = (data ?? []) as PaperTrade[];

  // open の現在値を取得
  const openTickers = [...new Set(trades.filter((t) => t.status === "open").map((t) => t.ticker))];
  const priceMap = new Map<string, number | null>();
  if (openTickers.length > 0) {
    try {
      const raw = await yahooFinance.quote(openTickers);
      const arr = Array.isArray(raw) ? raw : [raw];
      for (const q of arr) {
        if (q?.symbol) priceMap.set(q.symbol, q.regularMarketPrice ?? q.regularMarketPreviousClose ?? null);
      }
    } catch (err) {
      console.warn("[GET /api/paper] quote failed", err);
    }
  }

  const enriched = trades.map((t) =>
    enrichTrade(t, t.status === "open" ? priceMap.get(t.ticker) ?? null : null),
  );

  const summary = computeSummary(enriched);
  return NextResponse.json({ trades: enriched, summary });
}

// POST: エア買い（仮想的に買う）
// body: { ticker, shares?, buyPrice?, pickId?, note? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rawTicker = typeof body?.ticker === "string" ? body.ticker : null;
  const shares = Number(body?.shares ?? 100);
  const inputPrice = body?.buyPrice != null ? Number(body.buyPrice) : null;
  const pickId: string | null = typeof body?.pickId === "string" ? body.pickId : null;
  const note: string = typeof body?.note === "string" ? body.note : "";

  if (!rawTicker || !Number.isFinite(shares) || shares <= 0) {
    return NextResponse.json({ error: "ticker と shares (正の数) が必要です" }, { status: 400 });
  }

  const ticker = normalizeTicker(rawTicker);
  const market = detectMarket(ticker);

  // 現在値と銘柄名を取得
  let name = ticker;
  let buyPrice = inputPrice;
  try {
    const q = await yahooFinance.quote(ticker);
    const single = Array.isArray(q) ? q[0] : q;
    if (single) {
      name = single.shortName || single.longName || ticker;
      if (buyPrice == null) buyPrice = single.regularMarketPrice ?? single.regularMarketPreviousClose ?? null;
    }
  } catch (err) {
    console.warn("[POST /api/paper] quote failed", err);
  }

  if (buyPrice == null || !Number.isFinite(buyPrice) || buyPrice <= 0) {
    return NextResponse.json({ error: "現在の株価が取得できませんでした。少し後でもう一度お試しください" }, { status: 502 });
  }

  // pickId が渡されていれば、その pick の名前を優先
  if (pickId) {
    const { data: pick } = await supabaseAdmin
      .from("ai_picks")
      .select("name")
      .eq("id", pickId)
      .maybeSingle();
    if (pick?.name) name = pick.name;
  }

  const { data, error } = await supabaseAdmin
    .from("paper_trades")
    .insert({
      ticker,
      market,
      name,
      shares,
      buy_price: buyPrice,
      pick_id: pickId,
      note,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/paper] DB error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ trade: data });
}
