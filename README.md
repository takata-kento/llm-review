# LLM Review

GitHub上のプルリクエストをLLM（Claude 3.7 Sonnet）を使用して自動的にレビューするGitHub Actionsの再利用可能なワークフローです。

## 概要

このプロジェクトは、プルリクエストのレビュープロセスを効率化するためのものです。LLMを活用して初期レビューを自動化し、人間のレビュアーの時間を節約します。

主な機能：
- プルリクエストの変更内容を分析
- リポジトリ構造を理解
- コードの品質、ベストプラクティス、セキュリティ、パフォーマンスなどの観点からレビュー
- レビューコメントをプルリクエストに投稿

## 使用方法

### 前提条件

- GitHub Actionsが有効なGitHubリポジトリ
- Anthropic APIキー（Claude 3.7 Sonnetにアクセスするため）

### セットアップ

1. リポジトリのシークレットに以下を設定します：
   - `ANTHROPIC_API_KEY`: Anthropic APIキー

2. ワークフローファイルを作成します（例: `.github/workflows/pr-review.yml`）：

```yaml
name: PR Review

on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]

jobs:
  review:
    name: LLM Review
    uses: takata-kento/llm-review/.github/workflows/llm-review.yml@main
    with:
      pull_request_number: ${{ github.event.pull_request.number }}
      review_depth: 'detailed'  # 'basic', 'detailed', 'comprehensive'のいずれか
      include_positive_feedback: true
      review_code_quality: true
      review_best_practices: true
      review_security: true
      review_performance: true
      # review_focus_areas: 'エラーハンドリング,パフォーマンス'  # オプション
    secrets:
      github_token: ${{ secrets.GITHUB_TOKEN }}
      anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### 設定オプション

| パラメータ | 説明 | デフォルト値 |
|------------|------|-------------|
| `pull_request_number` | プルリクエスト番号 | 必須 |
| `review_depth` | レビューの深さ（`basic`, `detailed`, `comprehensive`） | `detailed` |
| `include_positive_feedback` | ポジティブなフィードバックを含めるかどうか | `true` |
| `review_code_quality` | コード品質をレビューするかどうか | `true` |
| `review_best_practices` | ベストプラクティスをレビューするかどうか | `true` |
| `review_security` | セキュリティをレビューするかどうか | `true` |
| `review_performance` | パフォーマンスをレビューするかどうか | `true` |
| `review_focus_areas` | レビューの焦点領域（カンマ区切り） | `''` |
| `llm_model` | LLMモデル | `claude-3-sonnet-20240229` |
| `llm_temperature` | LLM温度パラメータ | `0.7` |
| `llm_max_tokens` | LLM最大トークン数 | `4000` |

## 開発

### 環境構築

```bash
# リポジトリのクローン
git clone https://github.com/takata-kento/llm-review.git
cd llm-review

# 依存関係のインストール
npm install

# ビルド
npm run build

# テスト
npm test
```

### プロジェクト構造

```
llm-review/
├── .github/workflows/  # GitHub Actionsワークフロー
├── src/                # ソースコード
│   ├── github/         # GitHub API連携
│   ├── llm/            # LLM連携
│   ├── types/          # 型定義
│   └── index.ts        # エントリーポイント
├── tests/              # テスト
└── dist/               # ビルド出力
```

## ライセンス

Apache License 2.0
