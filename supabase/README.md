# Supabase データベース設定ガイド（共有環境対応版）

## 📋 概要

このアプリは**共有Supabase環境**を使用します。1つのSupabaseプロジェクトを複数のアプリで共用するため、以下の設計を採用しています：

- **接頭辞**: すべてのテーブル名に `lift_` プレフィックスを付与
- **アプリ識別**: `auth.users.raw_user_meta_data.app_name = 'lift-log-pro'` で識別
- **RLS**: アプリ名チェック + ユーザーIDチェックの二段階セキュリティ

## 🚀 セットアップ手順

### 1. Supabaseプロジェクトの準備

1. [Supabase](https://supabase.com) にログイン
2. 共有プロジェクト（Master-Portfolio-DBなど）を開く、または新規作成
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

**重要**: 複数アプリで共用している場合、既存のトリガーがある可能性があります。

#### パターンA: 既存のトリガー関数を更新する場合

既存の `handle_new_user()` 関数がある場合、その関数内でアプリ名をチェックして条件分岐してください。

#### パターンB: 新規トリガーを作成する場合

SQL Editorで以下を実行：

```sql
-- 注意: 既存のトリガーと競合しないか確認してください
CREATE TRIGGER on_auth_user_created_lift
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_lift_new_user();
```

#### パターンC: Supabase Dashboardで設定

1. Supabase Dashboard → 「Database」→ 「Triggers」
2. 新規トリガーを作成
   - **Name**: `on_auth_user_created_lift`
   - **Table**: `auth.users`
   - **Events**: `INSERT`
   - **Function**: `handle_lift_new_user()`

### 5. メール確認の無効化

Supabase Dashboard の「Authentication」→「Settings」で：
- 「Enable email confirmations」を **オフ** にする

### 6. 環境変数の設定

プロジェクトルートに `.env.local` を作成し、以下を設定：

```env
# 共有SupabaseプロジェクトのURL（他アプリと同じ）
NEXT_PUBLIC_SUPABASE_URL=your_shared_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_shared_supabase_anon_key

# サービスロールキー（サーバーサイドのみ、秘密にする）
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI APIキー（食事画像解析用）
OPENAI_API_KEY=your_openai_api_key
```

## 📊 テーブル構造

### lift_profiles
ユーザー基本情報。`auth.users` と1対1で紐づく。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | auth.users.id と同一 |
| last_name | text | 姓 |
| first_name | text | 名 |
| display_name | text | 表示名（任意） |
| role | text | 'admin' \| 'user' |
| email | text | メールアドレス |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### lift_exercises
種目マスタ。ウエイトリフティング（WL）と筋トレ（Training）の2カテゴリ。

### lift_personal_bests
自己ベスト記録。学年ごとに記録を保存。`records` はJSONB形式で柔軟に種目を追加可能。

### lift_logs
練習ログ（日次）。1日1レコード。総重量、睡眠時間、AI分析結果を保存。

### lift_sets
練習セット詳細。1つのログに対して複数セットを記録。

## 🔒 RLS (Row Level Security)

すべてのテーブルでRLSが有効化されています：

### セキュリティルール

1. **アプリ識別**: `is_lift_log_user()` 関数で、`app_name = 'lift-log-pro'` のユーザーのみアクセス可能
2. **ユーザー分離**: ユーザーは自分のデータのみ閲覧・編集可能
3. **管理者権限**: 管理者（`mitamuraka@haguroko.ed.jp`）は全ユーザーのデータを閲覧可能
4. **マスタデータ**: `lift_exercises` はこのアプリのユーザーなら全員閲覧可能

## 🔐 認証時の実装要件

### ユーザー登録時

Next.js側で `auth.signUp` を実行する際、**必ず** `app_name: 'lift-log-pro'` をメタデータに含めてください：

```typescript
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      app_name: 'lift-log-pro',  // ⚠️ 必須
      last_name: lastName,
      first_name: firstName,
      display_name: displayName, // 任意
    },
    emailRedirectTo: undefined, // メール確認なし
  },
});
```

これにより、`handle_lift_new_user()` 関数が `lift_profiles` テーブルにレコードを自動生成します。

### ログイン時

通常の `auth.signInWithPassword()` を使用します。RLSポリシーが自動的にアプリ名をチェックします。

## ⚠️ 注意事項

### テーブル名の変更

- ❌ `profiles` → ✅ `lift_profiles`
- ❌ `exercise_master` → ✅ `lift_exercises`
- ❌ `workout_logs` → ✅ `lift_logs`
- ❌ `workout_sets` → ✅ `lift_sets`
- ❌ `personal_bests` → ✅ `lift_personal_bests`

### 既存データの移行

既存のテーブルがある場合：

```sql
-- テーブル名を変更
ALTER TABLE public.profiles RENAME TO lift_profiles;
-- 同様に他のテーブルも変更

-- インデックス名も変更
ALTER INDEX idx_profiles_email RENAME TO idx_lift_profiles_email;
-- 同様に他のインデックスも変更
```

### 複数アプリでのトリガー管理

複数アプリで共用する場合、`auth.users` へのINSERTトリガーは**1つだけ**存在します。既存のトリガー関数内で条件分岐することを推奨します。

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Lift Log Pro アプリ
    IF (NEW.raw_user_meta_data->>'app_name' = 'lift-log-pro') THEN
        -- lift_profiles に挿入
        ...
    END IF;
    
    -- 他のアプリ
    IF (NEW.raw_user_meta_data->>'app_name' = 'other-app') THEN
        -- 他のアプリの処理
        ...
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔍 トラブルシューティング

### RLSエラー: "permission denied"

- `auth.signUp` 時に `app_name: 'lift-log-pro'` が設定されているか確認
- `is_lift_log_user()` 関数が正しく動作しているか確認
- Supabase Dashboardでユーザーの `raw_user_meta_data` を確認

### プロファイルが作成されない

- トリガーが正しく設定されているか確認
- `handle_lift_new_user()` 関数が実行されているか確認
- `app_name` が正確に `'lift-log-pro'` になっているか確認（スペルミス注意）

### 管理者権限が効かない

- メールアドレスが正確に `mitamuraka@haguroko.ed.jp` になっているか確認
- `lift_profiles.role` が `'admin'` になっているか確認
