import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { STOCK_UNIVERSE } from "@/lib/ai/universe";
import { fetchDailyBars, sleep } from "@/lib/ai/bars";
import { scoreBars, type Verdict } from "@/lib/ai/scorer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 毎日の AI 注目銘柄を生成して ai_picks に保存する。
// Vercel cron から呼ばれる（vercel.json で設定）。手動でも叩ける（要 CRON_SECRET）。
//
// 流れ:
//   1) ユニバース（固定リスト + ウォッチリスト）の銘柄をすべて取得
//   2) 各銘柄の過去 6 ヶ月の日足を取得 → スコアリング
//   3) 自信度の高い上位 N 銘柄を ai_picks に挿入
//   4) その日にすでに同じ銘柄が picks 済みなら重複させない

const MAX_PICKS_PER_DAY = 3;
const MIN_CONFIDENCE = 60;
const CONCURRENCY = 4;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Vercel Cron は Authorization: Bearer ${CRON_SECRET} を送る
  const auth = req.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  // 開発環境では secret 未設定でも通す
  if (!secret && process.env.NODE_ENV !== "production") return true;
  return false;
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ウォッチリスト銘柄をユニバースに追加
  const { data: watchlist } = await supabaseAdmin
    .from("watchlist")
    .select("ticker, market, name");

  const universeMap = new Map<string, { ticker: string; name: string; sector: string | null; market: "jp" | "us" }>();
  for (const u of STOCK_UNIVERSE) {
    universeMap.set(u.ticker, { ticker: u.ticker, name: u.name, sector: u.sector, market: "jp" });
  }
  for (const w of watchlist ?? []) {
    if (!universeMap.has(w.ticker)) {
      universeMap.set(w.ticker, {
        ticker: w.ticker,
        name: w.name,
        sector: null,
        market: w.market as "jp" | "us",
      });
    }
  }
  const universe = [...universeMap.values()];

  // スコアリング
  type Scored = {
    ticker: string;
    name: string;
    sector: string | null;
    market: "jp" | "us";
    verdict: Verdict;
    price: number;
  };
  const scored: Scored[] = [];

  // 軽い並列化（concurrency = 4）
  let index = 0;
  async function worker() {
    while (index < universe.length) {
      const i = index++;
      const u = universe[i];
      const bars = await fetchDailyBars(u.ticker);
      const v = scoreBars(bars);
      if (v && bars.length > 0) {
        const last = bars[bars.length - 1];
        scored.push({
          ticker: u.ticker,
          name: u.name,
          sector: u.sector,
          market: u.market,
          verdict: v,
          price: last.close,
        });
      }
      // Yahoo の rate limit 回避
      await sleep(150);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // 自信度でソート、最低ライン以上だけ
  scored.sort((a, b) => b.verdict.confidence - a.verdict.confidence);
  const eligible = scored.filter((s) => s.verdict.confidence >= MIN_CONFIDENCE);

  // 当日（JST の今日）すでに picks 済みの銘柄は除外
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  // JST 基準で「同じ日」を判定。UTC で午前なら前日 JST。簡便のため JST 起算で today を計算
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const jstYmd = jstNow.toISOString().slice(0, 10); // YYYY-MM-DD
  const todayStart = new Date(`${jstYmd}T00:00:00+09:00`);

  const { data: existingPicks } = await supabaseAdmin
    .from("ai_picks")
    .select("ticker")
    .gte("picked_at", todayStart.toISOString());
  const existingSet = new Set((existingPicks ?? []).map((p) => p.ticker));

  const finalPicks = eligible
    .filter((p) => !existingSet.has(p.ticker))
    .slice(0, MAX_PICKS_PER_DAY);

  if (finalPicks.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "今日は基準を満たす銘柄が無かったか、すでに記録済みです",
      scoredCount: scored.length,
      eligibleCount: eligible.length,
    });
  }

  const rows = finalPicks.map((p, idx) => ({
    ticker: p.ticker,
    market: p.market,
    name: p.name,
    sector: p.sector,
    price_at_pick: p.price,
    confidence: p.verdict.confidence,
    risk_level: p.verdict.riskLevel,
    horizon: p.verdict.horizon,
    rationale: p.verdict.rationale,
    signals: p.verdict.signals as unknown as Record<string, unknown>,
    rank: idx + 1,
    engine_version: "rule-v1",
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from("ai_picks")
    .insert(rows)
    .select();

  if (error) {
    console.error("[generate-picks] insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: inserted?.length ?? 0,
    picks: finalPicks.map((p) => ({
      ticker: p.ticker,
      name: p.name,
      confidence: p.verdict.confidence,
      rationale: p.verdict.rationale,
    })),
    scoredCount: scored.length,
    eligibleCount: eligible.length,
  });
}
