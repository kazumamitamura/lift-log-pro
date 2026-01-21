-- ============================================
-- Lift Log Pro - データベース設計
-- ============================================

-- 1. ユーザープロファイルテーブル
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 種目マスタテーブル
CREATE TABLE IF NOT EXISTS public.exercise_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_type TEXT NOT NULL CHECK (category_type IN ('WL', 'Training')),
    major_category TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_type, major_category, exercise_name)
);

-- 3. 自己ベスト記録テーブル
CREATE TABLE IF NOT EXISTS public.personal_bests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    grade TEXT NOT NULL CHECK (grade IN ('中1', '中2', '中3', '高1', '高2', '高3', '大1', '大2', '大3', '大4', '社会人')),
    body_weight DECIMAL(5,2), -- 階級(kg)
    records JSONB DEFAULT '{}'::jsonb, -- 各種目のベスト重量を保存 { "S": 100, "C&J": 120, "BSq": 180, ... }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, grade)
);

-- 4. 練習ログテーブル
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_personal_bests_user_id ON public.personal_bests(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON public.workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON public.workout_logs(date);
CREATE INDEX IF NOT EXISTS idx_workout_sets_log_id ON public.workout_sets(log_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_name ON public.workout_sets(exercise_name);
CREATE INDEX IF NOT EXISTS idx_exercise_master_category ON public.exercise_master(category_type, major_category);

-- ============================================
-- RLS (Row Level Security) 設定
-- ============================================

-- RLSを有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_bests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_master ENABLE ROW LEVEL SECURITY;

-- profiles テーブルのポリシー
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- personal_bests テーブルのポリシー
CREATE POLICY "Users can view own personal bests"
    ON public.personal_bests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal bests"
    ON public.personal_bests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal bests"
    ON public.personal_bests FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all personal bests"
    ON public.personal_bests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- workout_logs テーブルのポリシー
CREATE POLICY "Users can view own workout logs"
    ON public.workout_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout logs"
    ON public.workout_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout logs"
    ON public.workout_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout logs"
    ON public.workout_logs FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all workout logs"
    ON public.workout_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- workout_sets テーブルのポリシー
CREATE POLICY "Users can view own workout sets"
    ON public.workout_sets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_logs
            WHERE id = workout_sets.log_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own workout sets"
    ON public.workout_sets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_logs
            WHERE id = workout_sets.log_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own workout sets"
    ON public.workout_sets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_logs
            WHERE id = workout_sets.log_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own workout sets"
    ON public.workout_sets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_logs
            WHERE id = workout_sets.log_id AND user_id = auth.uid()
        )
    );

-- exercise_master テーブルのポリシー（全員閲覧可能）
CREATE POLICY "Anyone can view exercise master"
    ON public.exercise_master FOR SELECT
    USING (true);

-- ============================================
-- 関数・トリガー
-- ============================================

-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at トリガーを設定
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_personal_bests
    BEFORE UPDATE ON public.personal_bests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_workout_logs
    BEFORE UPDATE ON public.workout_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 新規ユーザー登録時にprofilesレコードを自動生成する関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, last_name, first_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        CASE 
            WHEN NEW.email = 'mitamuraka@haguroko.ed.jp' THEN 'admin'
            ELSE 'user'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users にトリガーを設定（Supabase Dashboardで実行が必要な場合あり）
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_new_user();
