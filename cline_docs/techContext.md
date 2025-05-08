# 技術コンテキスト

## 使用技術

### 言語とランタイム

- **TypeScript**: 静的型付けによる安全性と開発効率の向上
- **Node.js**: JavaScript実行環境（node20を使用）

### フレームワークとライブラリ

- **LangChain.js**: LLMとの連携を簡素化するフレームワーク
  - Anthropicインテグレーションを使用してClaude 3.7 Sonnetに接続
  - プロンプトテンプレート管理機能を活用
  
- **Octokit**: GitHub APIクライアント
  - プルリクエスト情報の取得
  - コメントの投稿
  
- **Jest**: テストフレームワーク
  - 単体テスト
  - 統合テスト
  - モックを使用した外部依存のテスト

### インフラストラクチャ

- **GitHub Actions**: CI/CDプラットフォーム
  - 再利用可能なワークフローの実行環境
  - node20環境を使用

## 開発環境

### ビルドツール

- **TypeScript Compiler (tsc)**: TypeScriptからJavaScriptへのコンパイル
- **npm**: パッケージ管理

### 開発ワークフロー

1. TypeScriptコードの開発
2. Jestを使用したテスト
3. tscを使用したビルド（`dist`ディレクトリに出力）
4. GitHub Actionsワークフローの定義

## 技術的制約

- GitHub APIのレート制限
- Anthropic APIの利用制限とコスト
- GitHub Actionsの実行時間制限

## 依存関係

主要な依存関係：

```json
{
  "dependencies": {
    "langchain": "最新バージョン",
    "@anthropic-ai/sdk": "最新バージョン",
    "octokit": "最新バージョン"
  },
  "devDependencies": {
    "typescript": "最新バージョン",
    "jest": "最新バージョン",
    "@types/jest": "最新バージョン",
    "ts-jest": "最新バージョン"
  }
}
```

## 環境変数

- `GITHUB_TOKEN`: GitHub APIへのアクセストークン
- `ANTHROPIC_API_KEY`: Anthropic APIへのアクセスキー
- その他のワークフロー設定パラメータ
