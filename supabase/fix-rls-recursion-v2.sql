-- ============================================
-- RLS無限再帰エラーの修正（完全版）
-- ============================================
-- エラー: "infinite recursion detected in policy for relation \"lift_profiles\""
-- 
-- 原因: 管理者ポリシーでlift_profilesテーブルを参照しているため、無限再帰が発生
-- 
-- 解決方法: 管理者チェックをメールアドレスで直接行う（lift_profilesを参照しない）
-- ============================================

-- 1. is_lift_log_user()関数を修正（lift_profilesを参照しない）
CREATE OR REPLACE FUNCTION public.is_lift_log_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- メタデータからapp_nameを確認（lift_profilesを参照しない）
    RETURN (
        (auth.jwt() ->> 'user_metadata')::jsonb->>'app_name' = 'lift-log-pro'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. 管理者チェック関数（lift_profilesを参照しない）
CREATE OR REPLACE FUNCTION public.is_lift_log_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- メールアドレスで直接チェック（lift_profilesを参照しない）
    RETURN (
        (auth.jwt() ->> 'email')::text = 'mitamuraka@haguroko.ed.jp'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. lift_profilesテーブルのポリシーを再作成
DROP POLICY IF EXISTS "lift_users_can_view_own_profile" ON public.lift_profiles;
DROP POLICY IF EXISTS "lift_users_can_update_own_profile" ON public.lift_profiles;
DROP POLICY IF EXISTS "lift_admins_can_view_all_profiles" ON public.lift_profiles;

-- 自分のプロファイルのみ閲覧可能
CREATE POLICY "lift_users_can_view_own_profile"
    ON public.lift_profiles FOR SELECT
    USING (
        auth.uid() = id 
        AND public.is_lift_log_user()
    );

-- 自分のプロファイルのみ更新可能
CREATE POLICY "lift_users_can_update_own_profile"
    ON public.lift_profiles FOR UPDATE
    USING (
        auth.uid() = id 
        AND public.is_lift_log_user()
    );

-- 管理者は全プロファイルを閲覧可能（メールアドレスで直接チェック）
CREATE POLICY "lift_admins_can_view_all_profiles"
    ON public.lift_profiles FOR SELECT
    USING (
        public.is_lift_log_user()
        AND (
            public.is_lift_log_admin()
            OR id = auth.uid()
        )
    );

-- 4. lift_personal_bestsテーブルの管理者ポリシーを修正
DROP POLICY IF EXISTS "lift_admins_can_view_all_personal_bests" ON public.lift_personal_bests;

CREATE POLICY "lift_admins_can_view_all_personal_bests"
    ON public.lift_personal_bests FOR SELECT
    USING (
        public.is_lift_log_user()
        AND (
            public.is_lift_log_admin()
            OR user_id = auth.uid()
        )
    );

-- 5. lift_logsテーブルの管理者ポリシーを修正
DROP POLICY IF EXISTS "lift_admins_can_view_all_logs" ON public.lift_logs;

CREATE POLICY "lift_admins_can_view_all_logs"
    ON public.lift_logs FOR SELECT
    USING (
        public.is_lift_log_user()
        AND (
            public.is_lift_log_admin()
            OR user_id = auth.uid()
        )
    );
