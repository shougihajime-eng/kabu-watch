import YahooFinance from "yahoo-finance2";

type YahooFinanceLoose = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quote: (symbols: string | string[], opts?: unknown) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  search: (q: string, opts?: unknown) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chart: (symbol: string, opts: unknown) => Promise<any>;
};

// yahoo-finance2 v3+: must instantiate. The default export IS the
// constructor (despite some confusing TS types). Reuse one instance.
const Ctor = YahooFinance as unknown as new (opts?: {
  suppressNotices?: string[];
}) => YahooFinanceLoose;

export const yahooFinance = new Ctor({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

export type Market = "jp" | "us";

// Convert a user-typed code into a Yahoo Finance symbol.
// e.g. "7203" -> "7203.T", "aapl" -> "AAPL"
export function normalizeTicker(input: string, market?: Market): string {
  const t = input.trim().toUpperCase();
  if (market === "jp" || /^\d{4}$/.test(t)) {
    return t.endsWith(".T") ? t : `${t}.T`;
  }
  return t;
}

export function detectMarket(symbol: string): Market {
  return symbol.endsWith(".T") ? "jp" : "us";
}

export function currencyForMarket(market: Market): string {
  return market === "jp" ? "JPY" : "USD";
}
