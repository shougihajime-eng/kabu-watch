import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yahooFinance } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH: エア売却（{ action: "sell", sellPrice?: number }）
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "sell") {
    return NextResponse.json({ error: "action must be 'sell'" }, { status: 400 });
  }

  const { data: trade, error: getErr } = await supabaseAdmin
    .from("paper_trades")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (getErr) {
    return NextResponse.json({ error: getErr.message }, { status: 500 });
  }
  if (!trade) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }
  if (trade.status === "closed") {
    return NextResponse.json({ error: "すでに売却済みです" }, { status: 400 });
  }

  let sellPrice = body?.sellPrice != null ? Number(body.sellPrice) : null;
  if (sellPrice == null) {
    try {
      const q = await yahooFinance.quote(trade.ticker);
      const single = Array.isArray(q) ? q[0] : q;
      sellPrice = single?.regularMarketPrice ?? single?.regularMarketPreviousClose ?? null;
    } catch (err) {
      console.warn("[PATCH /api/paper] quote failed", err);
    }
  }
  if (sellPrice == null || !Number.isFinite(sellPrice) || sellPrice <= 0) {
    return NextResponse.json({ error: "売却時の株価が取得できませんでした" }, { status: 502 });
  }

  const { data, error } = await supabaseAdmin
    .from("paper_trades")
    .update({
      sell_price: sellPrice,
      sell_at: new Date().toISOString(),
      status: "closed",
    })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("[PATCH /api/paper] DB error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ trade: data });
}

// DELETE: 取引を削除（操作ミスの取り消し用）
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("paper_trades").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
