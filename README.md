# Lift Log Pro

ウエイトリフティング特化型 自己管理＆AI分析アプリ

## 技術スタック

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL, Auth)
- **UI Library**: Shadcn/UI, Tailwind CSS, Lucide React
- **Charts**: Recharts
- **Excel**: SheetJS (xlsx-js)
- **AI**: OpenAI API (GPT-4o)

## セットアップ

詳細なセットアップ手順は **[SETUP.md](./SETUP.md)** を参照してください。

### クイックスタート

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **環境変数の設定**
   `.env.local` ファイルを作成し、SupabaseとOpenAIのAPIキーを設定：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Supabaseデータベースの設定**
   - `supabase/schema.sql` をSupabase SQL Editorで実行
   - `supabase/seed.sql` を実行
   - 認証設定を確認（メール確認を無効化）

4. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

詳細は [SETUP.md](./SETUP.md) を参照してください。

## プロジェクト構造

```
lift-log-pro/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── dashboard/         # ダッシュボード
│   ├── onboarding/        # オンボーディング
│   ├── analysis/          # データ分析
│   └── layout.tsx
├── components/            # Reactコンポーネント
│   └── ui/               # Shadcn/UIコンポーネント
├── lib/                   # ユーティリティ関数
├── supabase/             # データベーススキーマ
└── public/               # 静的ファイル
```

## 機能

- ✅ ユーザー認証（登録・ログイン・パスワードリセット）
- ✅ 自己ベスト記録管理
- ✅ 練習ログ記録
- ✅ カレンダー表示
- ✅ AI食事分析
- ✅ データ分析・Excel出力

## ライセンス

MIT
