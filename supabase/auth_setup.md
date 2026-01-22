# 認証セットアップガイド（共有環境対応）

## 📝 概要

このアプリは共有Supabase環境を使用するため、認証時に**アプリ名をメタデータに含める**必要があります。

## 🔑 必須実装

### 1. 新規ユーザー登録

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ユーザー登録
const signUp = async (email: string, password: string, lastName: string, firstName: string, displayName?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        // ⚠️ 必須: アプリ名をメタデータに含める
        app_name: 'lift-log-pro',
        last_name: lastName,
        first_name: firstName,
        display_name: displayName || null,
      },
      // メール確認を無効化
      emailRedirectTo: undefined,
    },
  })

  if (error) {
    console.error('Sign up error:', error)
    return { error }
  }

  return { data }
}
```

### 2. ログイン

```typescript
// ログイン
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Sign in error:', error)
    return { error }
  }

  return { data }
}
```

### 3. パスワードリセット

```typescript
// パスワードリセット
const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) {
    console.error('Reset password error:', error)
    return { error }
  }

  return { data }
}

// パスワード更新（リセット画面で実行）
const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    console.error('Update password error:', error)
    return { error }
  }

  return { data }
}
```

## 🔍 メタデータの確認

Supabase Dashboard でユーザーのメタデータを確認する方法：

1. 「Authentication」→ 「Users」を開く
2. 対象ユーザーをクリック
3. 「Raw User Meta Data」欄を確認

正しく設定されていれば、以下のように表示されます：

```json
{
  "app_name": "lift-log-pro",
  "last_name": "山田",
  "first_name": "太郎",
  "display_name": "やまだ"
}
```

## ⚠️ 重要な注意事項

### アプリ名のスペル

- ✅ 正しい: `'lift-log-pro'`
- ❌ 間違い: `'lift_log_pro'` (アンダースコア)
- ❌ 間違い: `'lift-logpro'` (ハイフンなし)
- ❌ 間違い: `'Lift-Log-Pro'` (大文字)

### 登録後のリダイレクト

ユーザー登録完了後、自動的に `/onboarding/pb` (自己ベスト入力画面) へリダイレクトしてください。

```typescript
const { data, error } = await signUp(...)

if (data?.user && !error) {
  router.push('/onboarding/pb')
}
```

### 既存ユーザーの対応

既存のユーザー（アプリ名メタデータがない）も `lift_profiles` テーブルにレコードがあればアクセス可能です。`is_lift_log_user()` 関数が両方をチェックします。

## 🧪 テスト方法

1. 新規ユーザー登録を実行
2. Supabase Dashboard で `auth.users` テーブルを確認
3. `raw_user_meta_data` に `app_name: 'lift-log-pro'` が含まれているか確認
4. `lift_profiles` テーブルにレコードが自動生成されているか確認
5. ログインしてRLSが正しく動作するか確認
