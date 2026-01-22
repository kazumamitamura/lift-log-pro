# Lift Log Pro - セットアップガイド

このガイドでは、Lift Log Proアプリの環境変数設定とSupabaseデータベースのセットアップ手順を説明します。

## 📋 目次

1. [環境変数の設定](#1-環境変数の設定)
2. [Supabaseプロジェクトの作成](#2-supabaseプロジェクトの作成)
3. [データベーススキーマの実行](#3-データベーススキーマの実行)
4. [Seedデータの投入](#4-seedデータの投入)
5. [認証設定の確認](#5-認証設定の確認)
6. [開発サーバーの起動](#6-開発サーバーの起動)

---

## 1. 環境変数の設定

### 1-1. `.env.local` ファイルの作成

プロジェクトルートに `.env.local` ファイルを作成します。

```bash
# Windows (PowerShell)
New-Item -Path .env.local -ItemType File

# Mac/Linux
touch .env.local
```

### 1-2. 環境変数の記入

`.env.local` ファイルに以下の内容を記入します（後でSupabaseの値を取得して埋めます）：

```env
# Supabase設定（共有プロジェクト）
NEXT_PUBLIC_SUPABASE_URL=your_shared_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_shared_supabase_anon_key

# サービスロールキー（サーバーサイドのみ、秘密にする）
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI APIキー（食事画像解析用）
OPENAI_API_KEY=your_openai_api_key
```

**注意**: `.env.local` は `.gitignore` に含まれているため、Gitにコミットされません。

---

## 2. Supabaseプロジェクトの作成

### 2-1. Supabaseアカウントの作成

1. [Supabase](https://supabase.com) にアクセス
2. 「Sign Up」または「Sign In」でアカウントを作成/ログイン

### 2-2. プロジェクトの作成または選択

#### 新規プロジェクトを作成する場合

1. 「New Project」をクリック
2. プロジェクト名を入力（例: `Master-Portfolio-DB`）
3. データベースパスワードを設定
4. リージョンを選択（日本なら `Northeast Asia (Tokyo)` 推奨）
5. 「Create new project」をクリック

#### 既存の共有プロジェクトを使用する場合

1. 既存のプロジェクトを選択
2. プロジェクトのダッシュボードを開く

### 2-3. APIキーの取得

1. プロジェクトダッシュボードの左サイドバーから「Settings」→「API」を開く
2. 以下の値をコピー：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** キー → `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 秘密にする）

3. `.env.local` ファイルに値を貼り付け：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. データベーススキーマの実行

### 3-1. SQL Editorを開く

1. Supabaseダッシュボードの左サイドバーから「SQL Editor」をクリック
2. 「New query」をクリック

### 3-2. スキーマSQLを実行

1. `supabase/schema.sql` ファイルを開く
2. ファイルの内容をすべてコピー
3. Supabase SQL Editorに貼り付け
4. 「Run」ボタンをクリック（または `Ctrl+Enter` / `Cmd+Enter`）

**実行結果の確認**:
- エラーが表示されないことを確認
- 左サイドバーの「Table Editor」で以下のテーブルが作成されていることを確認：
  - `lift_profiles`
  - `lift_exercises`
  - `lift_personal_bests`
  - `lift_logs`
  - `lift_sets`

---

## 4. Seedデータの投入

### 4-1. Seed SQLを実行

1. `supabase/seed.sql` ファイルを開く
2. ファイルの内容をすべてコピー
3. Supabase SQL Editorの新しいクエリに貼り付け
4. 「Run」ボタンをクリック

**実行結果の確認**:
- エラーが表示されないことを確認
- 「Table Editor」→「lift_exercises」で種目データが投入されていることを確認

---

## 5. 認証設定の確認

### 5-1. メール確認の無効化

1. Supabaseダッシュボードの「Authentication」→「Settings」を開く
2. 「Enable email confirmations」のトグルを **オフ** にする
3. 「Save」をクリック

### 5-2. 新規ユーザー登録トリガーの設定

**重要**: 共有Supabase環境を使用している場合、既存のトリガーがある可能性があります。

#### パターンA: 新規トリガーを作成する場合

1. Supabaseダッシュボードの「Database」→「Triggers」を開く
2. 「Create a new trigger」をクリック
3. 以下の設定を入力：
   - **Name**: `on_auth_user_created_lift`
   - **Table**: `auth.users`
   - **Events**: `INSERT` にチェック
   - **Function**: `handle_lift_new_user`
4. 「Save」をクリック

#### パターンB: 既存のトリガー関数を更新する場合

既存の `handle_new_user()` 関数がある場合、SQL Editorで以下を実行：

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Lift Log Pro アプリ
    IF (NEW.raw_user_meta_data->>'app_name' = 'lift-log-pro') THEN
        INSERT INTO public.lift_profiles (id, email, last_name, first_name, display_name, role)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'display_name', NULL),
            CASE 
                WHEN NEW.email = 'mitamuraka@haguroko.ed.jp' THEN 'admin'
                ELSE 'user'
            END
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    -- 他のアプリの処理があればここに追加
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. OpenAI APIキーの取得（食事分析機能用）

### 6-1. OpenAIアカウントの作成

1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. アカウントを作成またはログイン

### 6-2. APIキーの作成

1. 「API keys」ページを開く
2. 「Create new secret key」をクリック
3. キー名を入力（例: `lift-log-pro`）
4. キーをコピー（⚠️ この画面でしか表示されません）

### 6-3. 環境変数に追加

`.env.local` ファイルに追加：

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 7. 開発サーバーの起動

### 7-1. 依存関係のインストール

```bash
npm install
```

### 7-2. 開発サーバーの起動

```bash
npm run dev
```

### 7-3. ブラウザで確認

ブラウザで [http://localhost:3000](http://localhost:3000) を開く

---

## ✅ セットアップ確認チェックリスト

- [ ] `.env.local` ファイルが作成されている
- [ ] SupabaseのURLとキーが設定されている
- [ ] OpenAI APIキーが設定されている
- [ ] データベーススキーマが実行されている（5つのテーブルが作成されている）
- [ ] Seedデータが投入されている（`lift_exercises` にデータがある）
- [ ] メール確認が無効化されている
- [ ] 新規ユーザー登録トリガーが設定されている
- [ ] 開発サーバーが起動している
- [ ] ブラウザでアプリが表示される

---

## 🐛 トラブルシューティング

### エラー: "Invalid API key"

- `.env.local` ファイルのAPIキーが正しいか確認
- サーバーを再起動（環境変数の変更は再起動が必要）

### エラー: "relation does not exist"

- データベーススキーマが実行されていない可能性
- `supabase/schema.sql` を再実行

### エラー: "permission denied"

- RLSポリシーが正しく設定されているか確認
- ユーザー登録時に `app_name: 'lift-log-pro'` が設定されているか確認

### ユーザー登録後、プロファイルが作成されない

- トリガーが正しく設定されているか確認
- `auth.users` テーブルの `raw_user_meta_data` に `app_name: 'lift-log-pro'` が含まれているか確認

### OpenAI APIエラー

- APIキーが正しいか確認
- アカウントにクレジットが残っているか確認
- APIレート制限に達していないか確認

---

## 📚 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Next.js環境変数](https://nextjs.org/docs/basic-features/environment-variables)
- [OpenAI APIドキュメント](https://platform.openai.com/docs)

---

## 🎉 セットアップ完了！

これでアプリのセットアップが完了しました。新規登録して練習記録を入力してみてください！
