# かぶウォッチ (kabu-watch) — プロジェクト固有メモ

このファイルは Claude Code が自動で読み込みます。**プロジェクトに関する重要事項はここに集約**してください（会話メモではなく）。

> **ローカルフォルダ名と GitHub repo 名のずれについて**
> ローカルは `C:\Users\shoug\株`、GitHub / Vercel は `kabu-watch` という名前です。
> はじめさんが見やすいように手元は「株」、ネット上は英語の `kabu-watch` で揃えています。
> 中身は同じです。

---

## 進捗（いまここ）

- ✅ **直近で済んだこと**
  - **信号機（🚦 青／黄／赤）と「最悪いくら損するか」を全画面に追加**
    - ホームのヒーロー・銘柄カード・銘柄詳細ページに信号機表示
    - 過去90日の最大ドローダウンから「○万円買ったら最悪いくらまで損するか」を金額で表示（投資額は 1/5/10/30万円から切替）
    - 詳細ページは任意の銘柄について `/api/stock/insight` で AI 判定を返す新エンドポイント追加
  - **AI注目銘柄＋エア取引＋成績検証ループ**の土台を実装完了（段階1）
    - 毎朝 AI が指標ベースで注目銘柄を選び、注目時点の株価・自信度・根拠を保存
    - 1日後／3日後／1週間後／1か月後の値動きを自動で記録
    - エア取引（仮想売買）、含み損益、累計成績、勝率を管理
    - 透明性のために「当たった予想も外した予想も全部」履歴表示
  - DB スキーマ（`ai_picks`, `pick_snapshots`, `paper_trades`）を Supabase に適用済み
  - Vercel cron 設定済み（平日朝 9:30 JST に予想生成、毎日 16:00 JST に値動き記録）

- 🟡 **進行中**
  - 本番デプロイへの反映待ち（git push と Vercel 環境変数 `CRON_SECRET` の登録が必要）

- 🔜 **次の一歩**（はじめさんが起きたあと）
  1. ローカルで `npm run dev` を起動して新しい信号機＋最悪損失カードを目で確認
  2. 良ければ git commit & push（自動で Vercel が本番デプロイ）
  3. Vercel に環境変数 `CRON_SECRET` を登録（後述。まだ未登録なら）
  4. スマホで本番（https://kabu-watch.vercel.app）の動作確認

---

## 本番 URL

- **本番（Vercel）**: https://kabu-watch.vercel.app
- **GitHub repo**: https://github.com/shougihajime-eng/kabu-watch
- **Vercel ダッシュボード**: https://vercel.com/shougihajime-3368s-projects/kabu-watch

## 合言葉（共有パスワード）

- 現在の合言葉: `kabu2026`
- 変更方法:
  1. ローカルの `.env.local` の `APP_PASSWORD` を書き換える
  2. Vercel の Project Settings → Environment Variables → `APP_PASSWORD` を書き換える
  3. Vercel で再デプロイ（Settings → Deployments → 最新のデプロイの「⋯」→ Redeploy）

---

## 画面構成（下タブで切替）

- **/** （注目）: 今日の AI 注目銘柄ヒーロー＋他の注目・エア取引保有中サマリー
- **/picks** （予想）: AI 予想の全履歴・的中率グラフ・業種別／自信度別／月別の成績
- **/paper** （エア取引）: 保有中・売却済み・累計成績の折れ線
- **/watchlist** （銘柄）: 既存のウォッチリスト
- **/stock/[ticker]** （詳細）: チャート・メモ・アラート・ニュース・エア取引ボタン

## 技術構成

- **フロント / API**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + recharts
- **株価データ**: `yahoo-finance2`（無料、API キー不要）
- **DB**: 共有 Supabase の `kabu_watch` スキーマ
  - 既存テーブル: `groups`, `watchlist`
  - 新テーブル: `ai_picks`（AI注目銘柄）, `pick_snapshots`（成績スナップショット）, `paper_trades`（エア取引）
  - RLS 有効、ポリシー無し → 必ず service_role でサーバー側からアクセス
- **AI 判定エンジン**: 指標ベース（`src/lib/ai/scorer.ts`）
  - 移動平均線・出来高・RSI・モメンタム・ボラティリティを総合してスコア化
  - 自信度 60 以上の上位 3 銘柄を毎朝選ぶ
  - 将来的に Claude / GPT への差し替え可能な構造
- **Cron**: Vercel cron（`vercel.json`）
  - 平日 9:30 JST: `/api/cron/generate-picks` で注目銘柄生成
  - 毎日 16:00 JST: `/api/cron/verify-picks` で 1d/3d/7d/30d の値動き記録
- **認証**: 合言葉方式（家族・知り合い全員で 1 つの `APP_PASSWORD` を共有）
- **デプロイ**: Vercel（GitHub `main` push 自動デプロイ）

## 主要ファイル

| 場所 | 役割 |
|---|---|
| `src/lib/ai/scorer.ts` | **AI判定の頭脳**。指標から 0-100 のスコアと根拠を生成 |
| `src/lib/ai/universe.ts` | AIが毎日チェックする銘柄リスト（日経主要 60 銘柄＋ウォッチリスト） |
| `src/lib/ai/bars.ts` | Yahoo から日足を取得するヘルパー |
| `src/lib/picks.ts`, `src/lib/paper.ts` | 集計ロジック（的中率・勝率・累計成績） |
| `src/app/api/cron/generate-picks` | 毎朝の AI 予想生成（手動も叩ける） |
| `src/app/api/cron/verify-picks` | 値動きスナップショット記録 |
| `src/app/api/picks`, `picks/summary` | 予想一覧と集計 API |
| `src/app/api/paper`, `paper/[id]` | エア取引 CRUD |
| `src/components/Dashboard.tsx` | ホーム（ヒーローカード＋成績） |
| `src/components/HeroPick.tsx` | 今日の注目銘柄カード |
| `src/components/PicksView.tsx` | 予想履歴・グラフ |
| `src/components/PaperView.tsx` | エア取引画面 |
| `src/components/Term.tsx` | 用語解説ツールチップ（PER, RSI, 自信度 など） |
| `src/components/Disclaimer.tsx` | リスク表示 |
| `src/components/BottomNav.tsx` | スマホ用の下タブ |
| `supabase/migrations/0001_init.sql` | 既存スキーマ |
| `supabase/migrations/0002_ai_paper.sql` | AI / エア取引テーブル定義 |
| `vercel.json` | Vercel cron スケジュール |

## 検証コマンド

```powershell
# ローカルで動かす（開発モード）
cd C:\Users\shoug\株
npm run dev
# → ブラウザで http://localhost:3000 を開く

# 型チェック・ビルド検証
npm run build

# AI 注目銘柄を手動で生成（ローカル）
curl -X POST http://localhost:3000/api/cron/generate-picks

# 成績スナップショットを手動で記録
curl -X POST http://localhost:3000/api/cron/verify-picks
```

## 環境変数

`.env.local`（git には載らない）:

```
NEXT_PUBLIC_SUPABASE_URL=https://eqkaaohdbqefuszxwqzr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   ← 絶対 git に入れない
APP_PASSWORD=kabu2026                           ← 合言葉
AUTH_COOKIE_SECRET=<ランダム値>                 ← Cookie 署名用
CRON_SECRET=<ランダム値>                        ← Vercel cron 用（追加）
```

Vercel にも同じ 6 つを登録してください（`NEXT_PUBLIC_*` は Production/Preview/Development すべて、それ以外も同様）。
**`CRON_SECRET` を Vercel に登録しないと cron が 401 で動きません。**

### Vercel への CRON_SECRET 追加手順（はじめさん向け）

1. [Vercel ダッシュボード](https://vercel.com/shougihajime-3368s-projects/kabu-watch) を開く
2. Settings → Environment Variables
3. 「Add New」をクリック
4. Name: `CRON_SECRET`、Value: ローカルの `.env.local` にある `CRON_SECRET` の値をコピペ、Environment: 全部にチェック
5. Save
6. Deployments → 最新のデプロイの「⋯」→ Redeploy で反映

---

## 改善アイディア（やる気があったら）

### 段階 2（次にやりたい）
- AIの頭脳を本物の Claude / GPT に差し替え（今は指標ベース）
- ニュース・決算予定を判定に反映
- 自己学習（過去成績を見て弱点に重み付けし直す）
- 用語解説をもっと充実

### 段階 3（その先）
- メールでアラート通知（Resend などを使う）
- 実取引機能（証券会社 API 連携）
- 各ユーザーに別ウォッチリスト（合言葉方式から Supabase Auth に移行）
- PWA 対応（ホーム画面に追加）

---

## トラブルシューティング

- **ログインできない**: `APP_PASSWORD` がローカルと Vercel で一致しているか確認
- **AI 予想が出ない**: 「今日の注目銘柄を計算する」ボタンを押す。または `CRON_SECRET` が Vercel に登録されているか確認
- **株価が「—」のまま**: yahoo-finance2 が一時的に Yahoo Finance から取れていない。リロードで直る
- **「サーバー設定エラー」と出る**: `.env.local` または Vercel の環境変数が抜けている
- **DB エラー**: Supabase ダッシュボードで `kabu_watch` スキーマが Exposed schemas に入っているか確認。テーブルが無ければ `supabase/migrations/0002_ai_paper.sql` を SQL Editor に貼って実行
