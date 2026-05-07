# かぶウォッチ (kabu-watch) — プロジェクト固有メモ

このファイルは Claude Code が自動で読み込みます。**プロジェクトに関する重要事項はここに集約**してください（会話メモではなく）。

---

## 進捗（いまここ）

- ✅ **直近で済んだこと**
  - Next.js + Tailwind + Supabase でアプリ初期構築完了
  - 銘柄一覧 / 検索追加 / グループ分け / 銘柄詳細 / チャート / メモ / 価格アラート / 関連ニュースを実装
  - 合言葉ログイン（`APP_PASSWORD`）+ Cookie ベース middleware で全ルート保護
  - 共有 Supabase に `kabu_watch` スキーマを作成、Exposed schemas に追加済み
  - GitHub repo を作成し、Vercel にデプロイ済み

- 🟡 **進行中**
  - なし（はじめさんが起きるのを待っている）

- 🔜 **次の一歩**（起きたあと一緒にやること）
  1. 本番 URL をスマホで開いて動作確認（合言葉は `kabu2026`）
  2. お気に入りの銘柄を 5〜10 個追加してみる
  3. もし「ここがイマイチ」と思ったら教えてもらって改善

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

## 技術構成

- **フロント / API**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **株価データ**: `yahoo-finance2`（無料、API キー不要）
  - 日本株は Yahoo の `XXXX.T` 形式（例: `7203.T` = トヨタ）
  - 米国株は `AAPL` のようなティッカー
- **DB**: 共有 Supabase の `kabu_watch` スキーマ
  - テーブル: `groups`, `watchlist`
  - RLS 有効、ポリシー無し → 必ず service_role でサーバー側からアクセス
- **認証**: 合言葉方式（家族・知り合い全員で 1 つの `APP_PASSWORD` を共有）
  - HMAC-SHA256 で署名された Cookie をブラウザに保存（30 日間有効）
  - middleware ですべての `/` 以下を保護（`/login` と `/api/auth/login` のみ通過）
  - `AUTH_COOKIE_SECRET` は Cookie 署名用のランダム値（誰にも教えない）
- **デプロイ**: Vercel（GitHub `main` push 自動デプロイ）

## 主要ファイル

| 場所 | 役割 |
|---|---|
| `src/middleware.ts` | 合言葉 Cookie で全ルート保護 |
| `src/lib/auth.ts` | Cookie 署名・検証 |
| `src/lib/supabase/server.ts` | service_role を使うサーバー専用クライアント（schema=kabu_watch） |
| `src/lib/yahoo.ts` | yahoo-finance2 のインスタンス共有 |
| `src/app/api/quotes` | 複数銘柄の現在値・前日比 |
| `src/app/api/search` | 銘柄検索（コードや会社名から） |
| `src/app/api/chart` | チャート用の時系列データ |
| `src/app/api/news` | 銘柄に関連するニュース |
| `src/app/api/watchlist`, `groups` | DB 読み書き（CRUD） |
| `src/components/WatchlistView.tsx` | ホーム画面（一覧・グループタブ・追加ボタン） |
| `src/components/StockDetail.tsx` | 銘柄詳細（チャート・メモ・アラート・ニュース） |
| `supabase/migrations/0001_init.sql` | スキーマ定義 |

## 検証コマンド

```powershell
# ローカルで動かす（開発モード）
cd C:\Users\shoug\kabu-watch
npm run dev
# → ブラウザで http://localhost:3000 を開く

# 型チェック・ビルド検証
npm run build

# ライブラリの追加
npm install <パッケージ名>
```

## 環境変数

`.env.local`（git には載らない）:

```
NEXT_PUBLIC_SUPABASE_URL=https://eqkaaohdbqefuszxwqzr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   ← 絶対 git に入れない
APP_PASSWORD=kabu2026                           ← 合言葉
AUTH_COOKIE_SECRET=<ランダム値>                 ← Cookie 署名用
```

Vercel にも同じ 4 つを登録してください（`NEXT_PUBLIC_*` は Production/Preview/Development すべて、それ以外も同様）。

---

## 改善アイディア（やる気があったら）

- メールでアラート通知（Resend などを使う）
- ポートフォリオ機能（保有株の損益）
- 各ユーザーに別ウォッチリスト（合言葉方式から Supabase Auth に移行）
- PWA 対応（ホーム画面に追加）
- 並べ替え（ドラッグで順序変更）
- CSV ダウンロード

---

## トラブルシューティング

- **ログインできない**: `APP_PASSWORD` がローカルと Vercel で一致しているか確認
- **株価が「—」のまま**: yahoo-finance2 が一時的に Yahoo Finance から取れていない。リロードで直る場合が多い
- **「サーバー設定エラー」と出る**: `.env.local` または Vercel の環境変数が抜けている
- **DB エラー**: Supabase ダッシュボードで `kabu_watch` スキーマが Exposed schemas に入っているか確認
