-- ============================================
-- Lift Log Pro - データベース設計（共有Supabase環境対応）
-- 接頭辞: lift_ を使用して他アプリと区別
-- ============================================

-- 1. ユーザープロファイルテーブル
CREATE TABLE IF NOT EXISTS public.lift_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    display_name TEXT, -- 表示名（任意）
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 種目マスタテーブル
CREATE TABLE IF NOT EXISTS public.lift_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_type TEXT NOT NULL CHECK (category_type IN ('WL', 'Training')),
    major_category TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_type, major_category, exercise_name)
);

-- 3. 自己ベスト記録テーブル
CREATE TABLE IF NOT EXISTS public.lift_personal_bests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.lift_profiles(id) ON DELETE CASCADE,
    grade TEXT NOT NULL CHECK (grade IN ('中1', '中2', '中3', '高1', '高2', '高3', '大1', '大2', '大3', '大4', '社会人')),
    body_weight DECIMAL(5,2), -- 階級(kg)
    records JSONB DEFAULT '{}'::jsonb, -- 各種目のベスト重量を保存 { "S": 100, "C&J": 120, "BSq": 180, ... }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, grade)
);

-- 4. 練習ログテーブル
CREATE TABLE IF NOT EXISTS public.lift_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.lift_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_zone TEXT CHECK (time_zone IN ('早朝', '午前', '午後', '夜')),
    total_tonnage DECIMAL(10,2) DEFAULT 0, -- 総挙上重量
    sleep_hours DECIMAL(4,1), -- 睡眠時間（任意）
    nutrition_summary TEXT, -- AIによる食事分析結果
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 5. 練習セット詳細テーブル
CREATE TABLE IF NOT EXISTS public.lift_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES public.lift_logs(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    weight DECIMAL(6,2) NOT NULL, -- kg
    reps INTEGER NOT NULL, -- 回数
    sets INTEGER NOT NULL, -- セット数
    tonnage DECIMAL(10,2) NOT NULL, -- weight * reps * sets
    target_body_part TEXT, -- 分析用：背中、脚など
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- インデックス作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_lift_profiles_email ON public.lift_profiles(email);
CREATE INDEX IF NOT EXISTS idx_lift_profiles_role ON public.lift_profiles(role);
CREATE INDEX IF NOT EXISTS idx_lift_personal_bests_user_id ON public.lift_personal_bests(user_id);
CREATE INDEX IF NOT EXISTS idx_lift_logs_user_id ON public.lift_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_lift_logs_date ON public.lift_logs(date);
CREATE INDEX IF NOT EXISTS idx_lift_sets_log_id ON public.lift_sets(log_id);
CREATE INDEX IF NOT EXISTS idx_lift_sets_exercise_name ON public.lift_sets(exercise_name);
CREATE INDEX IF NOT EXISTS idx_lift_exercises_category ON public.lift_exercises(category_type, major_category);

-- ============================================
-- ヘルパー関数: アプリ名チェック
-- ============================================

-- 現在のユーザーがこのアプリ（lift-log-pro）のユーザーかどうかを判定
-- 注意: lift_profilesテーブルを参照しない（無限再帰を回避）
CREATE OR REPLACE FUNCTION public.is_lift_log_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- メタデータからapp_nameを確認（lift_profilesを参照しない）
    RETURN (
        (auth.jwt() ->> 'user_metadata')::jsonb->>'app_name' = 'lift-log-pro'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 管理者チェック関数（lift_profilesを参照しない）
CREATE OR REPLACE FUNCTION public.is_lift_log_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- メールアドレスで直接チェック（lift_profilesを参照しない）
    RETURN (
        (auth.jwt() ->> 'email')::text = 'mitamuraka@haguroko.ed.jp'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- RLS (Row Level Security) 設定
-- ============================================

-- RLSを有効化
ALTER TABLE public.lift_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lift_personal_bests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lift_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lift_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lift_exercises ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（再作成時用）
DROP POLICY IF EXISTS "lift_users_can_view_own_profile" ON public.lift_profiles;
DROP POLICY IF EXISTS "lift_users_can_update_own_profile" ON public.lift_profiles;
DROP POLICY IF EXISTS "lift_admins_can_view_all_profiles" ON public.lift_profiles;
DROP POLICY IF EXISTS "lift_users_can_view_own_personal_bests" ON public.lift_personal_bests;
DROP POLICY IF EXISTS "lift_users_can_insert_own_personal_bests" ON public.lift_personal_bests;
DROP POLICY IF EXISTS "lift_users_can_update_own_personal_bests" ON public.lift_personal_bests;
DROP POLICY IF EXISTS "lift_admins_can_view_all_personal_bests" ON public.lift_personal_bests;
DROP POLICY IF EXISTS "lift_users_can_view_own_logs" ON public.lift_logs;
DROP POLICY IF EXISTS "lift_users_can_insert_own_logs" ON public.lift_logs;
DROP POLICY IF EXISTS "lift_users_can_update_own_logs" ON public.lift_logs;
DROP POLICY IF EXISTS "lift_users_can_delete_own_logs" ON public.lift_logs;
DROP POLICY IF EXISTS "lift_admins_can_view_all_logs" ON public.lift_logs;
DROP POLICY IF EXISTS "lift_users_can_view_own_sets" ON public.lift_sets;
DROP POLICY IF EXISTS "lift_users_can_insert_own_sets" ON public.lift_sets;
DROP POLICY IF EXISTS "lift_users_can_update_own_sets" ON public.lift_sets;
DROP POLICY IF EXISTS "lift_users_can_delete_own_sets" ON public.lift_sets;
DROP POLICY IF EXISTS "lift_anyone_can_view_exercises" ON public.lift_exercises;

-- lift_profiles テーブルのポリシー
-- このアプリのユーザーかつ自分のプロファイルのみ閲覧可能
CREATE POLICY "lift_users_can_view_own_profile"
    ON public.lift_profiles FOR SELECT
    USING (
        auth.uid() = id 
        AND public.is_lift_log_user()
    );

CREATE POLICY "lift_users_can_update_own_profile"
    ON public.lift_profiles FOR UPDATE
    USING (
        auth.uid() = id 
        AND public.is_lift_log_user()
    );

CREATE POLICY "lift_admins_can_view_all_profiles"
    ON public.lift_profiles FOR SELECT
    USING (
        public.is_lift_log_user()
        AND (
            -- 管理者チェック（メールアドレスで直接チェック、lift_profilesを参照しない）
            public.is_lift_log_admin()
            OR id = auth.uid()
        )
    );

-- lift_personal_bests テーブルのポリシー
CREATE POLICY "lift_users_can_view_own_personal_bests"
    ON public.lift_personal_bests FOR SELECT
    USING (
        auth.uid() = user_id 
        AND public.is_lift_log_user()
    );

CREATE POLICY "lift_users_can_insert_own_personal_bests"
    ON public.lift_personal_bests FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND public.is_lift_log_user()
    );

CREATE POLICY "lift_users_can_update_own_personal_bests"
    ON public.lift_personal_bests FOR UPDATE
    USING (
        auth.uid() = user_id 
        AND public.is_lift_log_user()
    );

CREATE POLICY "lift_admins_can_view_all_personal_bests"
    ON public.lift_personal_bests FOR SELECT
    USING (
        public.is_lift_log_user()
        AND (
            -- 管理者チェック（メールアドレスで直接チェック、lift_profilesを参照しない）
            public.is_lift_log_admin()
            OR user_id = auth.uid()
        )
    );

-- lift_logs テーブルのポリシー
CREATE POLICY "lift_users_can_view_own_logs"
    ON public.lift_logs FOR SELECT
    USING (
        auth.uid() = user_id 
        AND public.is_lift_log_user()
    );

CREATE POLICY "lift_users_can_insert_own_logs"
    ON public.lift_logs FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND public.is_lift_log_user()
    );

CREATE POLICY "lift_users_can_update_own_logs"
    ON public.lift_logs FOR UPDATE
    USING (
        auth.uid() = user_id 
        AND public.is_lift_log_user()
    );

CREATE POLICY "lift_users_can_delete_own_logs"
    ON public.lift_logs FOR DELETE
    USING (
        auth.uid() = user_id 
        AND public.is_lift_log_user()
    );

CREATE POLICY "lift_admins_can_view_all_logs"
    ON public.lift_logs FOR SELECT
    USING (
        public.is_lift_log_user()
        AND (
            -- 管理者チェック（メールアドレスで直接チェック、lift_profilesを参照しない）
            public.is_lift_log_admin()
            OR user_id = auth.uid()
        )
    );

-- lift_sets テーブルのポリシー
CREATE POLICY "lift_users_can_view_own_sets"
    ON public.lift_sets FOR SELECT
    USING (
        public.is_lift_log_user()
        AND EXISTS (
            SELECT 1 FROM public.lift_logs
            WHERE id = lift_sets.log_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "lift_users_can_insert_own_sets"
    ON public.lift_sets FOR INSERT
    WITH CHECK (
        public.is_lift_log_user()
        AND EXISTS (
            SELECT 1 FROM public.lift_logs
            WHERE id = lift_sets.log_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "lift_users_can_update_own_sets"
    ON public.lift_sets FOR UPDATE
    USING (
        public.is_lift_log_user()
        AND EXISTS (
            SELECT 1 FROM public.lift_logs
            WHERE id = lift_sets.log_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "lift_users_can_delete_own_sets"
    ON public.lift_sets FOR DELETE
    USING (
        public.is_lift_log_user()
        AND EXISTS (
            SELECT 1 FROM public.lift_logs
            WHERE id = lift_sets.log_id AND user_id = auth.uid()
        )
    );

-- lift_exercises テーブルのポリシー（このアプリのユーザーは全員閲覧可能）
CREATE POLICY "lift_anyone_can_view_exercises"
    ON public.lift_exercises FOR SELECT
    USING (public.is_lift_log_user());

-- ============================================
-- 関数・トリガー
-- ============================================

-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION public.handle_lift_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at トリガーを設定
DROP TRIGGER IF EXISTS set_updated_at_lift_profiles ON public.lift_profiles;
CREATE TRIGGER set_updated_at_lift_profiles
    BEFORE UPDATE ON public.lift_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_lift_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_lift_personal_bests ON public.lift_personal_bests;
CREATE TRIGGER set_updated_at_lift_personal_bests
    BEFORE UPDATE ON public.lift_personal_bests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_lift_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_lift_logs ON public.lift_logs;
CREATE TRIGGER set_updated_at_lift_logs
    BEFORE UPDATE ON public.lift_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_lift_updated_at();

-- 新規ユーザー登録時にlift_profilesレコードを自動生成する関数
-- 注意: app_name が 'lift-log-pro' の場合のみ作成
CREATE OR REPLACE FUNCTION public.handle_lift_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- app_name が 'lift-log-pro' の場合のみプロファイルを作成
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
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- トリガー設定（Supabase Dashboardでも設定可能）
-- ============================================
-- 注意: 複数アプリで共用している場合、既存のトリガーがある可能性があります
-- その場合は、既存のトリガー関数内で条件分岐するか、または
-- Supabase Dashboardで手動設定してください
-- 
-- CREATE TRIGGER on_auth_user_created_lift
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_lift_new_user();
