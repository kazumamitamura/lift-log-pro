-- ============================================
-- 新規ユーザー登録トリガーの設定
-- ============================================
-- 
-- 注意: 共有Supabase環境を使用している場合、
-- 既存のトリガー関数がある可能性があります。
-- その場合は、既存の関数を更新してください。
--

-- トリガー関数が既に存在する場合は削除
DROP TRIGGER IF EXISTS on_auth_user_created_lift ON auth.users;

-- トリガーを作成
CREATE TRIGGER on_auth_user_created_lift
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_lift_new_user();

-- 確認用: トリガーが作成されたか確認
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created_lift';
