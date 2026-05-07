import { NextRequest, NextResponse } from "next/server";
import { yahooFinance } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Range = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y";

const RANGE_TO_DAYS: Record<Range, number> = {
  "1d": 1,
  "5d": 5,
  "1mo": 31,
  "3mo": 93,
  "6mo": 186,
  "1y": 365,
};

const RANGE_TO_INTERVAL: Record<Range, "5m" | "15m" | "1h" | "1d"> = {
  "1d": "5m",
  "5d": "15m",
  "1mo": "1d",
  "3mo": "1d",
  "6mo": "1d",
  "1y": "1d",
};

function parseRange(input: string | null): Range {
  if (!input) return "1mo";
  if (["1d", "5d", "1mo", "3mo", "6mo", "1y"].includes(input)) return input as Range;
  return "1mo";
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const range = parseRange(req.nextUrl.searchParams.get("range"));

  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  const period2 = new Date();
  const period1 = new Date(period2.getTime() - RANGE_TO_DAYS[range] * 24 * 60 * 60 * 1000);

  try {
    const data = (await yahooFinance.chart(ticker, {
      period1,
      period2,
      interval: RANGE_TO_INTERVAL[range],
    })) as { quotes?: Array<{ date: Date | string; close: number | null }> };
    const points = (data.quotes ?? [])
      .filter((q) => q.close != null)
      .map((q) => ({
        date: q.date instanceof Date ? q.date.toISOString() : q.date,
        close: q.close,
      }));
    return NextResponse.json({ ticker, range, points });
  } catch (err) {
    console.error("[/api/chart] failed", err);
    return NextResponse.json(
      { error: "チャートの取得に失敗しました", points: [] },
      { status: 502 },
    );
  }
}
