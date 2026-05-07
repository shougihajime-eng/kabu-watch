export type Market = "jp" | "us";

export type Group = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type WatchlistItem = {
  id: string;
  ticker: string;
  market: Market;
  name: string;
  group_id: string | null;
  memo: string;
  alert_low: number | null;
  alert_high: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  ticker: string;
  name: string | null;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  marketState: string | null;
};

export type SearchResult = {
  ticker: string;
  name: string;
  exchange: string | null;
  market: Market;
};

export type ChartPoint = {
  date: string;
  close: number;
};

export type NewsItem = {
  title: string;
  url: string;
  publisher: string | null;
  publishedAt: string | null;
};
