# lift_profiles作成エラーの修正ガイド

## 🔴 エラー: "violates foreign key constraint lift_personal_bests_user_id_fkey"

このエラーは、`lift_personal_bests`テーブルにデータを挿入しようとした際に、`user_id`が`lift_profiles`テーブルに存在しない場合に発生します。

---

## ✅ 解決方法

### ステップ1: トリガーの確認と再作成

1. **Supabase Dashboard** → **Database** → **Triggers** を開く
2. `on_auth_user_created_lift` トリガーが存在するか確認
3. 存在しない、または無効な場合は、以下のSQLを実行：

```sql
-- トリガーを再作成
DROP TRIGGER IF EXISTS on_auth_user_created_lift ON auth.users;

CREATE TRIGGER on_auth_user_created_lift
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_lift_new_user();
```

### ステップ2: 既存ユーザーのプロファイルを手動で作成

新規登録したユーザーのプロファイルが作成されていない場合、以下のSQLを実行して手動で作成します：

```sql
-- 既存ユーザーのプロファイルを作成する関数
CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS TABLE(created_count INTEGER) AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- app_nameが'lift-log-pro'のユーザーで、lift_profilesに存在しないユーザーを探す
    INSERT INTO public.lift_profiles (id, email, last_name, first_name, display_name, role)
    SELECT 
        u.id,
        u.email,
        COALESCE((u.raw_user_meta_data->>'last_name')::text, ''),
        COALESCE((u.raw_user_meta_data->>'first_name')::text, ''),
        COALESCE((u.raw_user_meta_data->>'display_name')::text, NULL),
        CASE 
            WHEN u.email = 'mitamuraka@haguroko.ed.jp' THEN 'admin'
            ELSE 'user'
        END
    FROM auth.users u
    WHERE 
        (u.raw_user_meta_data->>'app_name')::text = 'lift-log-pro'
        AND NOT EXISTS (
            SELECT 1 FROM public.lift_profiles p
            WHERE p.id = u.id
        );
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数を実行してプロファイルを作成
SELECT * FROM public.create_missing_profiles();
```

### ステップ3: INSERTポリシーの追加（念のため）

`SECURITY DEFINER`関数は通常RLSをバイパスしますが、念のためINSERTポリシーを追加します：

```sql
-- lift_profilesテーブルにINSERTポリシーを追加
DROP POLICY IF EXISTS "lift_trigger_can_insert_profile" ON public.lift_profiles;

CREATE POLICY "lift_trigger_can_insert_profile"
    ON public.lift_profiles FOR INSERT
    WITH CHECK (true);
```

---

## 🔍 確認方法

### 1. プロファイルが作成されているか確認

```sql
-- 現在ログインしているユーザーのプロファイルを確認
SELECT * FROM public.lift_profiles 
WHERE id = auth.uid();
```

### 2. すべてのユーザーのプロファイルを確認

```sql
-- app_nameが'lift-log-pro'のユーザーとプロファイルの対応を確認
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'app_name' as app_name,
    p.id as profile_id,
    p.role
FROM auth.users u
LEFT JOIN public.lift_profiles p ON u.id = p.id
WHERE (u.raw_user_meta_data->>'app_name')::text = 'lift-log-pro';
```

---

## 📋 完全な修正SQL

`supabase/fix-profile-creation.sql`ファイルに完全な修正SQLが含まれています。Supabase DashboardのSQL Editorで実行してください。

---

## 🧪 動作確認

修正後：

1. **既存ユーザーのプロファイルを作成**
   - `create_missing_profiles()`関数を実行
   - 作成されたプロファイル数を確認

2. **新規ユーザーでテスト**
   - 新しいメールアドレスで新規登録
   - `lift_profiles`テーブルにプロファイルが作成されるか確認
   - 自己ベスト入力画面で保存が成功するか確認

---

## ⚠️ 注意事項

- `SECURITY DEFINER`関数はRLSをバイパスするため、通常はINSERTポリシーは不要です
- ただし、念のため追加しておくと安全です
- トリガーが正しく動作しているか、Supabase Dashboardの**Logs** → **Database Logs**で確認できます

---

## 🚨 トラブルシューティング

### トリガーが実行されない

1. **トリガーが存在するか確認**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created_lift';
   ```

2. **関数が存在するか確認**
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_lift_new_user';
   ```

3. **ログを確認**
   - Supabase Dashboard → **Logs** → **Database Logs**
   - エラーメッセージを確認

### プロファイルが作成されない

1. **メタデータを確認**
   ```sql
   SELECT id, email, raw_user_meta_data 
   FROM auth.users 
   WHERE id = auth.uid();
   ```
   - `app_name`が`'lift-log-pro'`になっているか確認

2. **手動でプロファイルを作成**
   - `create_missing_profiles()`関数を実行
