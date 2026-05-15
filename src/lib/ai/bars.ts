import { yahooFinance } from "@/lib/yahoo";
import type { Bar } from "./scorer";

// 過去 ~6 ヶ月の日足を取得（AIスコア計算用）
export async function fetchDailyBars(ticker: string, days = 180): Promise<Bar[]> {
  const period2 = new Date();
  const period1 = new Date(period2.getTime() - days * 24 * 60 * 60 * 1000);
  try {
    const data = (await yahooFinance.chart(ticker, {
      period1,
      period2,
      interval: "1d",
    })) as {
      quotes?: Array<{
        date: Date | string;
        close: number | null;
        volume: number | null;
      }>;
    };
    const bars: Bar[] = (data.quotes ?? [])
      .filter((q) => q.close != null)
      .map((q) => ({
        date: q.date instanceof Date ? q.date.toISOString() : String(q.date),
        close: q.close as number,
        volume: q.volume ?? 0,
      }));
    return bars;
  } catch (err) {
    console.warn(`[fetchDailyBars] ${ticker} failed`, err);
    return [];
  }
}

// 単一銘柄の最新終値だけ知りたい時用
export async function fetchLatestClose(ticker: string): Promise<number | null> {
  try {
    const q = await yahooFinance.quote(ticker);
    const single = Array.isArray(q) ? q[0] : q;
    if (single?.regularMarketPrice != null) return single.regularMarketPrice;
    if (single?.regularMarketPreviousClose != null) return single.regularMarketPreviousClose;
    return null;
  } catch (err) {
    console.warn(`[fetchLatestClose] ${ticker} failed`, err);
    return null;
  }
}

// 指定日の終値（その日が休場なら直近の取引日）
export async function fetchCloseOnOrBefore(
  ticker: string,
  target: Date,
): Promise<{ price: number; date: string } | null> {
  // 7日分くらい余裕を持って取得
  const period1 = new Date(target.getTime() - 10 * 24 * 60 * 60 * 1000);
  const period2 = new Date(target.getTime() + 24 * 60 * 60 * 1000); // 当日含む
  try {
    const data = (await yahooFinance.chart(ticker, {
      period1,
      period2,
      interval: "1d",
    })) as {
      quotes?: Array<{ date: Date | string; close: number | null }>;
    };
    const bars = (data.quotes ?? []).filter((q) => q.close != null);
    if (bars.length === 0) return null;
    // target 以下で一番新しいバー
    const targetMs = target.getTime();
    let best: { price: number; date: string } | null = null;
    for (const b of bars) {
      const d = b.date instanceof Date ? b.date : new Date(b.date);
      if (d.getTime() <= targetMs && b.close != null) {
        best = { price: b.close, date: d.toISOString() };
      }
    }
    // target 以下が無い場合は最古を返す（理論上ありえないが安全策）
    if (!best && bars[0]?.close != null) {
      const d = bars[0].date instanceof Date ? bars[0].date : new Date(bars[0].date);
      best = { price: bars[0].close, date: d.toISOString() };
    }
    return best;
  } catch (err) {
    console.warn(`[fetchCloseOnOrBefore] ${ticker} failed`, err);
    return null;
  }
}

// 軽い rate-limit 回避用ヘルパー
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
