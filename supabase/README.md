# Supabase データベース設定ガイド

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にログイン
2. 新しいプロジェクトを作成
3. プロジェクトの「SQL Editor」を開く

### 2. スキーマの実行

1. `schema.sql` の内容をコピー
2. Supabase SQL Editorに貼り付け
3. 「Run」をクリックして実行

### 3. Seedデータの投入

1. `seed.sql` の内容をコピー
2. Supabase SQL Editorに貼り付け
3. 「Run」をクリックして実行

### 4. 新規ユーザー登録トリガーの設定

Supabase Dashboard の「Database」→「Triggers」で、以下のトリガーを手動で作成する必要がある場合があります：

**トリガー名**: `on_auth_user_created`
**テーブル**: `auth.users`
**イベント**: `INSERT`
**関数**: `handle_new_user()`

または、SQL Editorで以下を実行：

```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

### 5. 環境変数の設定

プロジェクトルートに `.env.local` を作成し、以下を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### 6. メール確認の無効化

Supabase Dashboard の「Authentication」→「Settings」で：
- 「Enable email confirmations」を **オフ** にする

または SQL で：

```sql
-- auth.config を更新（必要に応じて）
-- 通常はDashboard設定で対応可能
```

## テーブル構造の説明

### profiles
ユーザー基本情報。`auth.users` と1対1で紐づく。

### exercise_master
種目マスタ。ウエイトリフティング（WL）と筋トレ（Training）の2カテゴリ。

### personal_bests
自己ベスト記録。学年ごとに記録を保存。`records` はJSONB形式で柔軟に種目を追加可能。

### workout_logs
練習ログ（日次）。1日1レコード。総重量、睡眠時間、AI分析結果を保存。

### workout_sets
練習セット詳細。1つのログに対して複数セットを記録。

## RLS (Row Level Security)

すべてのテーブルでRLSが有効化されています：

- ユーザーは自分のデータのみ閲覧・編集可能
- 管理者（`mitamuraka@haguroko.ed.jp`）は全ユーザーのデータを閲覧可能
- `exercise_master` は全員閲覧可能（参照のみ）

## 注意事項

- 初回実行時は `schema.sql` → `seed.sql` の順で実行してください
- 既存データがある場合は、実行前にバックアップを取ってください
- 管理者権限は登録時のメールアドレスで自動判定されます
