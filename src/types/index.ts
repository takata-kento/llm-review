/**
 * GitHub関連の型定義
 */
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  pullRequestNumber: number;
}

/**
 * LLM関連の型定義
 */
export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * レビュー設定の型定義
 */
export interface ReviewConfig {
  focusAreas?: string[];
  depth?: 'basic' | 'detailed' | 'comprehensive';
  includePositiveFeedback?: boolean;
  codeQuality?: boolean;
  bestPractices?: boolean;
  security?: boolean;
  performance?: boolean;
}

/**
 * プルリクエストの変更ファイル情報
 */
export interface ChangedFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string;
}

/**
 * レビューコメントの型定義
 */
export interface ReviewComment {
  path: string;
  position?: number;
  body: string;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
}

/**
 * レビュー結果の型定義
 */
export interface ReviewResult {
  summary: string;
  comments: ReviewComment[];
  overallAssessment: string;
  suggestedImprovements: string[];
}
