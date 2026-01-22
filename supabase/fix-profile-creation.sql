-- ============================================
-- lift_profiles作成エラーの修正
-- ============================================
-- エラー: "violates foreign key constraint lift_personal_bests_user_id_fkey"
-- 
-- 原因: 新規登録時にlift_profilesテーブルにプロファイルが作成されていない
-- 
-- 解決方法:
-- 1. トリガーが正しく設定されているか確認
-- 2. 既存ユーザーのプロファイルを手動で作成
-- 3. INSERTポリシーを追加（念のため）
-- ============================================

-- 1. トリガーが存在するか確認（手動で実行）
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created_lift';

-- 2. トリガーを再作成（念のため）
DROP TRIGGER IF EXISTS on_auth_user_created_lift ON auth.users;

CREATE TRIGGER on_auth_user_created_lift
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_lift_new_user();

-- 3. lift_profilesテーブルにINSERTポリシーを追加（念のため）
-- 注意: SECURITY DEFINER関数はRLSをバイパスするので、通常は不要ですが
-- 念のため追加します
DROP POLICY IF EXISTS "lift_trigger_can_insert_profile" ON public.lift_profiles;

-- トリガー関数からのINSERTを許可（SECURITY DEFINERなので通常は不要）
-- ただし、念のため追加
CREATE POLICY "lift_trigger_can_insert_profile"
    ON public.lift_profiles FOR INSERT
    WITH CHECK (true);  -- トリガー関数はSECURITY DEFINERなので、このポリシーは実質的に不要

-- 4. 既存ユーザーのプロファイルを手動で作成する関数
-- 注意: この関数は管理者が手動で実行してください
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

-- 5. 既存ユーザーのプロファイルを作成（実行）
-- 注意: このクエリを実行すると、プロファイルが存在しないユーザーのプロファイルが作成されます
SELECT * FROM public.create_missing_profiles();
