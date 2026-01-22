# GitHubとAWS Amplify連携ガイド

## 📋 概要

このガイドでは、GitHubリポジトリとAWS Amplifyを連携させる手順を説明します。

## 🔗 連携手順

### 1. GitHubリポジトリの確認

まず、GitHubリポジトリが正しく設定されているか確認：

```bash
# リモートリポジトリの確認
git remote -v

# 現在のブランチを確認
git branch

# 変更をコミット・プッシュ
git add .
git commit -m "Add Amplify configuration"
git push origin main
```

### 2. AWS AmplifyでGitHub連携を設定

#### 方法A: 新規アプリとして作成

1. **AWS Amplifyコンソールにアクセス**
   - https://console.aws.amazon.com/amplify/ にアクセス
   - 「アプリケーションを作成」をクリック

2. **GitHubを選択**
   - 「GitHub」を選択
   - 「認証を許可」をクリックしてGitHubアカウントを連携

3. **リポジトリを選択**
   - 「リポジトリを選択」で `kazumamitamura/lift-log-pro` を選択
   - 「ブランチを選択」で `main` を選択
   - 「次へ」をクリック

4. **ビルド設定を確認**
   - 「ビルド設定」画面で `amplify.yml` が自動検出されることを確認
   - もし検出されない場合は、以下の設定を手動で入力：

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

5. **環境変数を設定**
   - 「環境変数を追加」をクリック
   - 以下の変数を追加：
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     OPENAI_API_KEY=your_openai_api_key
     ```

6. **アプリを作成**
   - 「アプリを作成」をクリック
   - デプロイが開始されます

#### 方法B: 既存のアプリに接続

1. **Amplifyコンソールでアプリを開く**
2. **「アプリケーションの設定」→「一般」を開く**
3. **「ソースコードの接続」セクションで「編集」をクリック**
4. **GitHubを選択してリポジトリを接続**

### 3. デプロイの確認

1. **デプロイタブを開く**
   - Amplifyコンソールで「デプロイ」タブを開く
   - 最新のデプロイの状態を確認

2. **ビルドログを確認**
   - デプロイをクリックして「ビルドログ」を開く
   - エラーがないか確認

3. **URLを確認**
   - デプロイが成功したら、URLが表示されます
   - 例: `https://main.xxxxxxxxxx.amplifyapp.com`

## 🔍 トラブルシューティング

### 問題1: GitHubリポジトリが表示されない

**原因**: GitHubアカウントが連携されていない

**解決策**:
1. Amplifyコンソールで「認証を許可」をクリック
2. GitHubで認証を許可
3. リポジトリを再選択

### 問題2: ビルドが失敗する

**原因**: 
- `amplify.yml` が正しくない
- 環境変数が設定されていない
- 依存関係の問題

**解決策**:
1. ビルドログを確認
2. `amplify.yml` の内容を確認
3. 環境変数が設定されているか確認
4. ローカルで `npm run build` が成功するか確認

### 問題3: デプロイは成功するが404エラー

**原因**: 
- Next.jsのルーティング設定の問題
- 環境変数が読み込まれていない

**解決策**:
1. 環境変数が正しく設定されているか確認
2. `next.config.ts` の設定を確認
3. ビルドログでエラーがないか確認
4. ブラウザのコンソールでエラーを確認

### 問題4: GitHubへのプッシュが反映されない

**原因**: 
- ブランチが正しく接続されていない
- 自動デプロイが無効になっている

**解決策**:
1. Amplifyコンソール → 「アプリケーションの設定」→「一般」
2. 「ブランチ」セクションで接続されているブランチを確認
3. 「自動デプロイ」が有効になっているか確認

## 📝 確認チェックリスト

- [ ] GitHubリポジトリが存在する
- [ ] `amplify.yml` がプロジェクトルートにある
- [ ] コードがGitHubにプッシュされている
- [ ] AmplifyでGitHubアカウントが連携されている
- [ ] リポジトリとブランチが正しく選択されている
- [ ] 環境変数が設定されている
- [ ] ビルドが成功している
- [ ] デプロイされたURLが表示されている

## 🔄 再デプロイ手順

コードを変更した後：

1. **変更をコミット・プッシュ**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Amplifyで自動デプロイ**
   - GitHubにプッシュすると、自動的にデプロイが開始されます
   - 「デプロイ」タブで進行状況を確認

3. **手動で再デプロイする場合**
   - Amplifyコンソール → 「デプロイ」タブ
   - 「再デプロイ」ボタンをクリック

## 💡 ヒント

- GitHubにプッシュすると自動的にデプロイが開始されます
- ビルドログを必ず確認してください
- 環境変数を変更した後は再デプロイが必要です
- ブランチごとに異なる環境変数を設定できます
