// 指標ベースのAI判定エンジン（ルールv1）
//
// インプット: 日足の終値・出来高の時系列（直近 ~120 営業日）
// アウトプット: 0-100 の自信度、リスク、短期/中長期、初心者にも読める注目理由
//
// 設計思想:
//   - 「絶対に上がる」と言わない。確率ではなく "注目度" を出す。
//   - 1つの指標で判断しない。複数の指標が同じ方向を向いた時だけ高得点。
//   - 根拠は必ず日本語で出す。「移動平均線」など専門用語は短い補足付き。

export type Bar = {
  date: string; // ISO
  close: number;
  volume: number;
};

export type ScoreSignals = {
  trend: number; // 0-100
  momentum: number;
  volume: number;
  rsi: number;
  pullback: number;
  volatility: number; // 日次リターンの標準偏差 (%)
  rsiValue: number;
  ma5: number;
  ma20: number;
  ma50: number;
  return1d: number;
  return5d: number;
  return20d: number;
  volumeRatio: number; // 直近5日平均 / 直近20日平均
};

export type Verdict = {
  confidence: number; // 0-100
  riskLevel: "low" | "medium" | "high";
  horizon: "short" | "long";
  rationale: string; // 日本語で2-4文
  reasons: string[]; // 短い箇条書き
  signals: ScoreSignals;
};

function avg(arr: number[]): number {
  if (arr.length === 0) return NaN;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  let s = 0;
  for (const v of arr) s += (v - m) ** 2;
  return Math.sqrt(s / (arr.length - 1));
}

function clip(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// 単純移動平均（最後の n 本）
function smaTail(closes: number[], n: number): number {
  if (closes.length < n) return NaN;
  return avg(closes.slice(-n));
}

// RSI(14) を Wilder の平滑化で
function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return NaN;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d;
    else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// メイン: バー列をスコア化
export function scoreBars(bars: Bar[]): Verdict | null {
  // 最低限のデータ量チェック
  if (bars.length < 30) return null;

  const closes = bars.map((b) => b.close).filter((v) => v != null && v > 0);
  const volumes = bars.map((b) => b.volume ?? 0);
  if (closes.length < 30) return null;

  const last = closes[closes.length - 1];
  const ma5 = smaTail(closes, 5);
  const ma20 = smaTail(closes, 20);
  const ma50 = smaTail(closes, Math.min(50, closes.length));
  const rsiVal = rsi(closes, 14);

  // 直近リターン
  const return1d = closes.length >= 2 ? ((last - closes[closes.length - 2]) / closes[closes.length - 2]) * 100 : 0;
  const return5d = closes.length >= 6 ? ((last - closes[closes.length - 6]) / closes[closes.length - 6]) * 100 : 0;
  const return20d = closes.length >= 21 ? ((last - closes[closes.length - 21]) / closes[closes.length - 21]) * 100 : 0;

  // 出来高
  const recentVol = avg(volumes.slice(-5));
  const longVol = avg(volumes.slice(-20));
  const volumeRatio = longVol > 0 ? recentVol / longVol : 1;

  // 日次リターンの標準偏差（直近 20 日）
  const dailyReturns: number[] = [];
  for (let i = Math.max(1, closes.length - 20); i < closes.length; i++) {
    dailyReturns.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
  }
  const vol = stddev(dailyReturns);

  // --- ここからスコアリング ---

  // 1) トレンドスコア: 現値 > MA20 > MA50 が理想
  let trend = 50;
  if (!Number.isNaN(ma20)) trend += last > ma20 ? 15 : -15;
  if (!Number.isNaN(ma50)) trend += last > ma50 ? 15 : -15;
  if (!Number.isNaN(ma20) && !Number.isNaN(ma50)) trend += ma20 > ma50 ? 10 : -10;
  // 過熱（MA20 から +15% 以上乖離）はマイナス
  if (!Number.isNaN(ma20)) {
    const dev = ((last - ma20) / ma20) * 100;
    if (dev > 15) trend -= 15;
    if (dev > 25) trend -= 10;
  }
  trend = clip(trend, 0, 100);

  // 2) モメンタムスコア: 20日リターンが穏やかに上昇 (+3〜+15%) が理想
  let momentum = 50;
  if (return20d > 0 && return20d <= 15) momentum += 25;
  else if (return20d > 15 && return20d <= 30) momentum += 10;
  else if (return20d > 30) momentum -= 15; // 行きすぎ
  else if (return20d > -5) momentum += 5;
  else momentum -= 15;
  // 直近5日も加点
  if (return5d > 0 && return5d <= 8) momentum += 10;
  if (return5d > 8) momentum -= 5;
  momentum = clip(momentum, 0, 100);

  // 3) 出来高スコア: 平常の 1.3 倍〜2.5 倍が「注目されている」
  let volScore = 50;
  if (volumeRatio >= 1.3 && volumeRatio <= 2.5) volScore += 30;
  else if (volumeRatio > 2.5 && volumeRatio <= 4) volScore += 15;
  else if (volumeRatio > 4) volScore -= 10; // 急騰急落の警戒
  else if (volumeRatio < 0.7) volScore -= 15;
  volScore = clip(volScore, 0, 100);

  // 4) RSI スコア: 35-65 が健全。70 超は過熱、30 未満は売られすぎ反発期待
  let rsiScore = 50;
  if (!Number.isNaN(rsiVal)) {
    if (rsiVal >= 35 && rsiVal <= 65) rsiScore = 75;
    else if (rsiVal > 65 && rsiVal <= 75) rsiScore = 55;
    else if (rsiVal > 75) rsiScore = 30; // 過熱
    else if (rsiVal >= 25 && rsiVal < 35) rsiScore = 70; // 反発期待
    else if (rsiVal < 25) rsiScore = 55;
  }

  // 5) 押し目スコア: 中期は上向きだが直近 5 日は調整、という形を高評価
  let pullback = 50;
  if (return20d > 5 && return5d <= -1 && return5d >= -7) pullback = 80;
  else if (return20d > 3 && return5d >= 0 && return5d <= 2) pullback = 65;
  pullback = clip(pullback, 0, 100);

  // 総合スコア（重み付き）
  const confidence = clip(
    Math.round(trend * 0.3 + momentum * 0.25 + volScore * 0.15 + rsiScore * 0.15 + pullback * 0.15),
    0,
    100,
  );

  // リスク（ボラティリティ）
  // 日次標準偏差 1.5% 以下 = low, 3.0% 以下 = medium, それ以上 = high
  const riskLevel: Verdict["riskLevel"] = vol < 1.5 ? "low" : vol < 3.0 ? "medium" : "high";

  // 時間軸: 出来高急増 or 短期モメンタム強なら短期、トレンド主導なら中長期
  const horizon: Verdict["horizon"] =
    volumeRatio > 1.5 || Math.abs(return5d) > 4 ? "short" : "long";

  // 根拠（日本語で短文・最大4つ）
  const reasons: string[] = [];

  if (!Number.isNaN(ma20) && !Number.isNaN(ma50) && last > ma20 && ma20 > ma50) {
    reasons.push("中期の流れが上向き（株価＞20日平均＞50日平均）");
  } else if (!Number.isNaN(ma20) && last > ma20) {
    reasons.push("短期の流れが上向き（株価＞20日平均）");
  } else if (!Number.isNaN(ma20) && last < ma20) {
    reasons.push("短期は調整気味（株価＜20日平均）— 反発を見るならここから");
  }

  if (return20d > 0 && return20d <= 15) {
    reasons.push(`1か月で約${return20d.toFixed(1)}%上昇。行き過ぎず、ちょうど良いペース`);
  } else if (return20d > 15 && return20d <= 30) {
    reasons.push(`1か月で${return20d.toFixed(1)}%上昇。やや上げすぎに注意`);
  } else if (return20d > 30) {
    reasons.push(`1か月で${return20d.toFixed(1)}%上昇。過熱気味のため利確売りに注意`);
  } else if (return20d < -10) {
    reasons.push(`1か月で${return20d.toFixed(1)}%下落。下げ止まりを確認したい局面`);
  }

  if (volumeRatio >= 1.3 && volumeRatio <= 2.5) {
    reasons.push(`出来高（売買のにぎわい）が平常の${volumeRatio.toFixed(1)}倍。注目が集まっている`);
  } else if (volumeRatio > 2.5) {
    reasons.push(`出来高が平常の${volumeRatio.toFixed(1)}倍。急騰急落のリスクあり`);
  }

  if (!Number.isNaN(rsiVal)) {
    if (rsiVal >= 35 && rsiVal <= 65) {
      reasons.push(`RSI(買われすぎ／売られすぎを示す指標) ${rsiVal.toFixed(0)} — 健全な水準`);
    } else if (rsiVal > 70) {
      reasons.push(`RSI ${rsiVal.toFixed(0)} — 短期的に買われすぎ。押し目を待ちたい`);
    } else if (rsiVal < 30) {
      reasons.push(`RSI ${rsiVal.toFixed(0)} — 売られすぎ。反発の可能性`);
    }
  }

  if (return20d > 5 && return5d <= -1 && return5d >= -7) {
    reasons.push("中期は上昇基調なのに、直近5日は調整中 — 押し目のチャンスかも");
  }

  if (vol > 3) {
    reasons.push(`値動きが荒い（日次標準偏差 ${vol.toFixed(1)}%）— 少額から検証が無難`);
  }

  if (reasons.length === 0) {
    reasons.push("複数指標が中立。新しいニュースか決算待ちの局面");
  }

  const rationale = reasons.slice(0, 3).join("。") + "。";

  return {
    confidence,
    riskLevel,
    horizon,
    rationale,
    reasons,
    signals: {
      trend: Math.round(trend),
      momentum: Math.round(momentum),
      volume: Math.round(volScore),
      rsi: Math.round(rsiScore),
      pullback: Math.round(pullback),
      volatility: Number(vol.toFixed(2)),
      rsiValue: Number(Number.isNaN(rsiVal) ? 0 : rsiVal.toFixed(1)),
      ma5: Number(Number.isNaN(ma5) ? 0 : ma5.toFixed(2)),
      ma20: Number(Number.isNaN(ma20) ? 0 : ma20.toFixed(2)),
      ma50: Number(Number.isNaN(ma50) ? 0 : ma50.toFixed(2)),
      return1d: Number(return1d.toFixed(2)),
      return5d: Number(return5d.toFixed(2)),
      return20d: Number(return20d.toFixed(2)),
      volumeRatio: Number(volumeRatio.toFixed(2)),
    },
  };
}
