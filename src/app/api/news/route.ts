import { NextRequest, NextResponse } from "next/server";
import { yahooFinance } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewsItem = {
  title: string;
  url: string;
  publisher: string | null;
  publishedAt: string | null;
};

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  try {
    const r = (await yahooFinance.search(ticker, {
      quotesCount: 0,
      newsCount: 8,
    })) as {
      news?: Array<{
        title: string;
        link: string;
        publisher?: string;
        providerPublishTime?: number | Date;
      }>;
    };
    const items: NewsItem[] = (r.news ?? []).map((n) => ({
      title: n.title,
      url: n.link,
      publisher: n.publisher ?? null,
      publishedAt: n.providerPublishTime
        ? new Date(n.providerPublishTime).toISOString()
        : null,
    }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[/api/news] failed", err);
    return NextResponse.json(
      { error: "ニュース取得に失敗しました", items: [] },
      { status: 502 },
    );
  }
}
