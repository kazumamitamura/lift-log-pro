# AWS Amplify デプロイ設定ガイド

## 📋 概要

このガイドでは、Lift Log ProアプリをAWS Amplifyにデプロイする手順を説明します。

## 🚀 デプロイ手順

### 1. Amplify.ymlの確認

プロジェクトルートに `amplify.yml` ファイルが作成されていることを確認してください。
このファイルはAmplifyのビルド設定を定義します。

### 2. 環境変数の設定（重要）

AWS Amplifyコンソールで環境変数を設定する必要があります：

1. AWS Amplifyコンソールでアプリを開く
2. 左サイドバーから「アプリケーションの設定」→「環境変数」を選択
3. 以下の環境変数を追加：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

**重要**: 
- `NEXT_PUBLIC_` で始まる変数はクライアント側でも使用可能
- 他の変数はサーバー側のみで使用されます
- 環境変数を追加した後、**再デプロイが必要**です

### 3. ビルド設定の確認

Amplifyコンソールで以下を確認：

1. 「アプリケーションの設定」→「ビルド設定」を開く
2. 以下の設定になっていることを確認：

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

### 4. Node.jsバージョンの設定

1. 「アプリケーションの設定」→「ビルド設定」を開く
2. 「環境」セクションでNode.jsバージョンを確認
3. Node.js 18以上を推奨（Next.js 15の要件）

### 5. 再デプロイ

環境変数を設定した後、必ず再デプロイを実行：

1. Amplifyコンソールで「デプロイ」タブを開く
2. 「再デプロイ」ボタンをクリック
3. ビルドログを確認してエラーがないか確認

## 🔍 トラブルシューティング

### 問題: ビルドは成功するが、ページが表示されない

**原因**: 環境変数が設定されていない、またはNext.jsの設定が不適切

**解決策**:
1. 環境変数が正しく設定されているか確認
2. `next.config.ts` に `output: 'standalone'` が設定されているか確認
3. ビルドログでエラーがないか確認

### 問題: ビルドエラーが発生する

**原因**: 依存関係の問題、またはTypeScriptエラー

**解決策**:
1. ビルドログを確認
2. ローカルで `npm run build` を実行してエラーを確認
3. TypeScriptエラーがあれば修正

### 問題: 環境変数が読み込まれない

**原因**: 環境変数の設定方法が間違っている

**解決策**:
1. Amplifyコンソールで環境変数が正しく設定されているか確認
2. `NEXT_PUBLIC_` プレフィックスが必要な変数に付いているか確認
3. 再デプロイを実行

### 問題: APIルートが動作しない

**原因**: Next.jsのAPIルートの設定が不適切

**解決策**:
1. `next.config.ts` の設定を確認
2. APIルートが `app/api/` ディレクトリに正しく配置されているか確認
3. ビルドログでAPIルートが正しくビルドされているか確認

## 📝 確認チェックリスト

- [ ] `amplify.yml` ファイルがプロジェクトルートにある
- [ ] `next.config.ts` に `output: 'standalone'` が設定されている
- [ ] 環境変数がAmplifyコンソールで設定されている
- [ ] Node.jsバージョンが18以上に設定されている
- [ ] ビルドログにエラーがない
- [ ] 再デプロイを実行した

## 🔗 参考リンク

- [AWS Amplify Next.js ドキュメント](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html)
- [Next.js デプロイメント](https://nextjs.org/docs/deployment)
