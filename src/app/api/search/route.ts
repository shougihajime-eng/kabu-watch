import { NextRequest, NextResponse } from "next/server";
import { yahooFinance, detectMarket } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchOut = {
  ticker: string;
  name: string;
  exchange: string | null;
  market: "jp" | "us";
};

type YahooSearchQuote = {
  symbol?: string;
  quoteType?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  try {
    const r = await yahooFinance.search(q, { quotesCount: 12, newsCount: 0 });
    const quotes = ((r as { quotes?: YahooSearchQuote[] }).quotes ?? []) as YahooSearchQuote[];
    const results: SearchOut[] = quotes
      .filter((it) => {
        if (!it.symbol) return false;
        if (it.quoteType && !["EQUITY", "ETF"].includes(it.quoteType)) return false;
        const sym = it.symbol;
        return /^\d{4}\.T$/.test(sym) || /^[A-Z]+(\.[A-Z]+)?$/.test(sym);
      })
      .map((it) => {
        const sym = it.symbol as string;
        return {
          ticker: sym,
          name: it.shortname || it.longname || sym,
          exchange: it.exchange ?? null,
          market: detectMarket(sym),
        };
      })
      .filter((it) => {
        // Drop non-JP/US exchanges if they slipped through
        if (it.market === "jp") return true;
        if (it.exchange && /^(NYQ|NMS|NGM|NCM|NYS|NAS|PCX|ASE|BATS)/i.test(it.exchange)) {
          return true;
        }
        return /^[A-Z.]+$/.test(it.ticker) && !it.ticker.includes(".");
      });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[/api/search] failed", err);
    return NextResponse.json(
      { error: "検索に失敗しました", results: [] },
      { status: 502 },
    );
  }
}
