import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fetchCloseOnOrBefore, sleep } from "@/lib/ai/bars";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// AI注目銘柄の「その後の値動き」を記録する cron。
// 各 pick に対し、+1日 / +3日 / +1週間 / +1ヶ月 のスナップショットを保存する。

const HORIZONS = [1, 3, 7, 30] as const;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
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

  // 過去 35 日以内の picks を対象に検証
  const since = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
  const { data: picks, error: pErr } = await supabaseAdmin
    .from("ai_picks")
    .select("id, ticker, picked_at, price_at_pick")
    .gte("picked_at", since.toISOString())
    .order("picked_at", { ascending: false });

  if (pErr) {
    console.error("[verify-picks] picks query failed", pErr);
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }
  if (!picks || picks.length === 0) {
    return NextResponse.json({ ok: true, message: "対象の予想がありません", recorded: 0 });
  }

  const pickIds = picks.map((p) => p.id);
  const { data: existing, error: sErr } = await supabaseAdmin
    .from("pick_snapshots")
    .select("pick_id, horizon_days")
    .in("pick_id", pickIds);
  if (sErr) {
    console.error("[verify-picks] snapshots query failed", sErr);
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }
  const existingSet = new Set((existing ?? []).map((s) => `${s.pick_id}:${s.horizon_days}`));

  // 必要なジョブを列挙
  type Job = {
    pickId: string;
    ticker: string;
    pickedAt: Date;
    priceAtPick: number | null;
    horizonDays: number;
    targetDate: Date;
  };
  const now = new Date();
  const jobs: Job[] = [];
  for (const p of picks) {
    const pickedAt = new Date(p.picked_at);
    for (const h of HORIZONS) {
      const key = `${p.id}:${h}`;
      if (existingSet.has(key)) continue;
      const targetDate = new Date(pickedAt.getTime() + h * 24 * 60 * 60 * 1000);
      // 対象日が未来なら今回はスキップ（次回 cron で記録される）
      if (targetDate.getTime() > now.getTime()) continue;
      jobs.push({
        pickId: p.id,
        ticker: p.ticker,
        pickedAt,
        priceAtPick: p.price_at_pick,
        horizonDays: h,
        targetDate,
      });
    }
  }

  if (jobs.length === 0) {
    return NextResponse.json({ ok: true, message: "新しく記録する対象はありません", recorded: 0 });
  }

  // ticker ごとにバーをまとめて取りたいが、まずはシンプルに 1 job ずつ
  const inserts: Array<Record<string, unknown>> = [];
  for (const job of jobs) {
    const res = await fetchCloseOnOrBefore(job.ticker, job.targetDate);
    if (!res) {
      await sleep(100);
      continue;
    }
    const changePct =
      job.priceAtPick && job.priceAtPick > 0
        ? ((res.price - job.priceAtPick) / job.priceAtPick) * 100
        : null;
    inserts.push({
      pick_id: job.pickId,
      horizon_days: job.horizonDays,
      price: res.price,
      change_pct: changePct == null ? null : Number(changePct.toFixed(2)),
      recorded_at: new Date().toISOString(),
    });
    await sleep(100);
  }

  if (inserts.length === 0) {
    return NextResponse.json({ ok: true, recorded: 0, message: "値動きの取得に失敗しました" });
  }

  const { error: insErr } = await supabaseAdmin
    .from("pick_snapshots")
    .insert(inserts);
  if (insErr) {
    console.error("[verify-picks] insert error", insErr);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recorded: inserts.length, jobs: jobs.length });
}
