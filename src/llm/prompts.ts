/**
 * リポジトリ構造分析用のプロンプトテンプレート
 */
export const REPOSITORY_STRUCTURE_PROMPT = `
あなたはコードレビューを行う優秀なソフトウェアエンジニアです。
以下のリポジトリ構造を分析し、このプロジェクトの概要を理解してください。

# リポジトリ構造
{repositoryStructure}

この情報を基に、プロジェクトの主要なコンポーネント、アーキテクチャ、設計パターンを特定し、簡潔に説明してください。
この理解は、後ほどプルリクエストの変更内容をレビューする際に役立ちます。
`;

/**
 * コードレビュー用のプロンプトテンプレート
 */
export const CODE_REVIEW_PROMPT = `
あなたはコードレビューを行う優秀なソフトウェアエンジニアです。
以下のプルリクエストの変更内容を分析し、詳細なレビューを提供してください。

# リポジトリ情報
{repositoryInfo}

# プルリクエスト情報
タイトル: {prTitle}
説明: {prDescription}
作成者: {prAuthor}
ブランチ: {prBranch}

# 変更ファイル一覧
{changedFiles}

# 変更内容の詳細
{diffDetails}

以下の観点からレビューを行ってください：
{reviewFocus}

レビューは以下の形式で提供してください：

## 概要
(変更内容の全体的な評価と主要なポイント)

## 良い点
(コードの良い部分、適切な実装、ベストプラクティスの適用など)

## 改善点
(潜在的な問題、バグ、セキュリティリスク、パフォーマンス問題など)

## 提案
(コードの改善方法、代替アプローチ、リファクタリングの提案など)

## 質問
(明確にすべき点、設計の意図に関する質問など)

## ファイル別コメント
各ファイルに対するコメントを以下の形式で提供してください。必ず行番号を指定してください。

### [ファイル名]
- **行番号**: [コメント]
- **行番号**: [コメント]

例：
### src/index.ts
- **15行目**: この関数名はもっと具体的にすべきです。例えば \`processData\` ではなく \`validateUserInput\` のように。
- **42-45行目**: このループは O(n²) の計算量があります。配列のサイズが大きい場合、パフォーマンスの問題が発生する可能性があります。

各コメントは具体的で建設的であり、可能な限りコード例を含めてください。また、必ず行番号を指定してください。行番号はdiffの情報から特定できます。複数行にまたがる場合は範囲（例：42-45行目）で指定してください。
`;

/**
 * レビュー焦点の設定に基づいてレビュー観点を生成する
 * @param config レビュー設定
 * @returns レビュー観点の文字列
 */
export function generateReviewFocus(config: {
  depth?: 'basic' | 'detailed' | 'comprehensive';
  includePositiveFeedback?: boolean;
  codeQuality?: boolean;
  bestPractices?: boolean;
  security?: boolean;
  performance?: boolean;
  focusAreas?: string[];
}): string {
  const focusPoints: string[] = [];

  // レビューの深さに基づく観点
  if (config.depth === 'basic' || !config.depth) {
    focusPoints.push('- 基本的なコード品質（可読性、命名規則、コメント）');
    focusPoints.push('- 明らかなバグや問題点');
  } else if (config.depth === 'detailed') {
    focusPoints.push('- コード品質（可読性、命名規則、コメント、構造）');
    focusPoints.push('- バグや問題点');
    focusPoints.push('- エッジケースの考慮');
    focusPoints.push('- テストの適切さ');
  } else if (config.depth === 'comprehensive') {
    focusPoints.push('- コード品質（可読性、命名規則、コメント、構造、一貫性）');
    focusPoints.push('- バグや問題点');
    focusPoints.push('- エッジケースの考慮');
    focusPoints.push('- テストの適切さと網羅性');
    focusPoints.push('- アーキテクチャの整合性');
    focusPoints.push('- 将来的な拡張性と保守性');
  }

  // 特定の観点
  if (config.codeQuality) {
    focusPoints.push('- コードの可読性と保守性');
    focusPoints.push('- 適切な抽象化と責務の分離');
    focusPoints.push('- 一貫した命名規則とスタイル');
  }

  if (config.bestPractices) {
    focusPoints.push('- 言語やフレームワークのベストプラクティス');
    focusPoints.push('- デザインパターンの適切な使用');
    focusPoints.push('- コーディング標準への準拠');
  }

  if (config.security) {
    focusPoints.push('- セキュリティの脆弱性');
    focusPoints.push('- 入力検証と出力エスケープ');
    focusPoints.push('- 認証と認可の問題');
    focusPoints.push('- 機密情報の取り扱い');
  }

  if (config.performance) {
    focusPoints.push('- パフォーマンスの問題');
    focusPoints.push('- リソース使用の効率性');
    focusPoints.push('- アルゴリズムの複雑性');
    focusPoints.push('- データベースクエリの最適化');
  }

  // 特定の焦点領域
  if (config.focusAreas && config.focusAreas.length > 0) {
    focusPoints.push(`- 特定の焦点領域: ${config.focusAreas.join(', ')}`);
  }

  // ポジティブなフィードバックを含める
  if (config.includePositiveFeedback) {
    focusPoints.push('- 良い実装や改善点も積極的に指摘してください');
  }

  return focusPoints.join('\n');
}

/**
 * サマリーコメント用のプロンプトテンプレート
 */
export const SUMMARY_COMMENT_PROMPT = `
あなたはコードレビューを行う優秀なソフトウェアエンジニアです。
以下のプルリクエストの詳細レビューに基づいて、簡潔なサマリーコメントを作成してください。

# プルリクエスト情報
タイトル: {prTitle}
説明: {prDescription}
作成者: {prAuthor}

# 詳細レビュー
{detailedReview}

このサマリーコメントは、プルリクエストの全体的な評価を提供し、主要な改善点と良い点をハイライトするものです。
コメントは簡潔で建設的であり、具体的な改善提案を含めてください。

以下の形式でサマリーコメントを作成してください：

## プルリクエストレビュー: {prTitle}

### 全体評価
(変更内容の全体的な評価と主要なポイント)

### 主な良い点
- (箇条書きで良い点を列挙)

### 主な改善点
- (箇条書きで改善点を列挙)

### 次のステップ
(推奨される次のアクション)

---
*このレビューはClaude 3.7 Sonnetによって自動生成されました。詳細なコメントは各ファイルを参照してください。*
`;
