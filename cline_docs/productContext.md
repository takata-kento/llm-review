# プロダクトコンテキスト

## プロジェクトの目的

このプロジェクト「llm-review」は、GitHub上のプルリクエストに対して自動的にLLM（Claude 3.7 Sonnet）を使用してレビューを行い、コメントを投稿するGitHub Actionsの再利用可能なワークフローを提供します。

## 解決する問題

- 開発チームでは多くのプルリクエストが発生し、レビュアーの負担が大きい
- 人間のレビュアーの時間を節約するために、LLMを活用して初期レビューを自動化する
- コードの品質向上と一貫したレビュー基準の適用を目指す

## 想定ユースケース

- 主にTypeScript/JavaScriptプロジェクトでの使用を想定（Java/TerraForm/Pulumiなども対象）
- 小〜中規模のプルリクエスト（数百行程度の変更）に対して使用
- チーム内の全てのリポジトリで再利用できるようにする

## レビュー内容

- コードの品質（可読性、保守性）
- ベストプラクティスの適用
- 潜在的なバグやエッジケースの指摘
- セキュリティの問題点
- パフォーマンスの改善点
- オブジェクト指向の原則への準拠

## 期待される動作

1. プルリクエストが作成または更新されたときに、ワークフローが呼び出される
2. LLM（Claude 3.7 Sonnet）がプルリクエストの内容を分析
3. リポジトリの構造と変更点を理解
4. レビューコメントを生成し、プルリクエストに投稿
5. 人間のレビュアーは、LLMによる初期レビューを参考にして、より深いレビューを行う
