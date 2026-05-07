import { NextRequest, NextResponse } from "next/server";
import { yahooFinance } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuoteOut = {
  ticker: string;
  name: string | null;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  marketState: string | null;
};

type YahooQuote = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  marketState?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tickers = (body?.tickers ?? []) as unknown[];
  const list = tickers.filter((t): t is string => typeof t === "string" && t.length > 0);
  if (list.length === 0) return NextResponse.json({ quotes: [] });

  try {
    const raw = await yahooFinance.quote(list);
    const arr = (Array.isArray(raw) ? raw : [raw]) as YahooQuote[];
    const quotes: QuoteOut[] = arr.map((q) => ({
      ticker: q.symbol,
      name: q.shortName ?? q.longName ?? null,
      price: q.regularMarketPrice ?? null,
      previousClose: q.regularMarketPreviousClose ?? null,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      currency: q.currency ?? null,
      marketState: q.marketState ?? null,
    }));
    return NextResponse.json({ quotes });
  } catch (err) {
    console.error("[/api/quotes] failed", err);
    return NextResponse.json(
      { error: "株価の取得に失敗しました", quotes: [] },
      { status: 502 },
    );
  }
}
