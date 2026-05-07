# かぶウォッチ (kabu-watch)

気になる株を、いつでもチェック。日本株・米国株対応のスマホファーストなウォッチリストアプリ。

## 機能

- 銘柄検索（コード・会社名・英語名）→ 1 タップで追加
- 現在値 / 前日比をリアルタイム表示
- フォルダ（グループ）で整理
- 銘柄詳細：チャート（1日〜1年）、メモ、価格アラート（上限・下限）、関連ニュース
- 合言葉ベースのログイン（家族や知り合いと共有可）

## 技術スタック

- Next.js 16 (App Router) / TypeScript / Tailwind CSS v4
- Supabase（共有プロジェクト, スキーマ `kabu_watch`）
- yahoo-finance2（株価・チャート・ニュース）
- Recharts（チャート）
- Vercel デプロイ

## 開発

```bash
npm install
cp .env.local.example .env.local   # （存在しない場合は CLAUDE.md を見て作る）
npm run dev
```

詳細は [`CLAUDE.md`](./CLAUDE.md) を参照。
