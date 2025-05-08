import { GitHubClient } from './github/client';
import { LLMClient } from './llm/client';
import { 
  REPOSITORY_STRUCTURE_PROMPT, 
  CODE_REVIEW_PROMPT, 
  SUMMARY_COMMENT_PROMPT,
  generateReviewFocus 
} from './llm/prompts';
import { GitHubConfig, LLMConfig, ReviewConfig, ReviewResult } from './types';

/**
 * LLMを使用してプルリクエストをレビューするクラス
 */
export class LLMReviewer {
  private githubClient: GitHubClient;
  private llmClient: LLMClient;
  private reviewConfig: ReviewConfig;

  /**
   * コンストラクタ
   * @param githubConfig GitHub API設定
   * @param llmConfig LLM設定
   * @param reviewConfig レビュー設定
   */
  constructor(
    githubConfig: GitHubConfig,
    llmConfig: LLMConfig,
    reviewConfig: ReviewConfig = {}
  ) {
    this.githubClient = new GitHubClient(githubConfig);
    this.llmClient = new LLMClient(llmConfig);
    this.reviewConfig = reviewConfig;
  }

  /**
   * プルリクエストをレビューする
   * @returns レビュー結果
   */
  async reviewPullRequest(): Promise<ReviewResult> {
    console.log('プルリクエストのレビューを開始します...');

    // プルリクエスト情報を取得
    const pullRequest = await this.githubClient.getPullRequestInfo();
    console.log(`プルリクエスト #${pullRequest.number} の情報を取得しました`);

    // 変更ファイル一覧を取得
    const changedFiles = await this.githubClient.getChangedFiles();
    console.log(`変更ファイル数: ${changedFiles.length}`);

    // リポジトリ構造を分析
    const baseRef = pullRequest.base.ref;
    const repositoryStructure = await this.githubClient.getRepositoryStructure('', baseRef);
    console.log('リポジトリ構造を取得しました');

    // リポジトリ構造をLLMに分析させる
    const repositoryInfo = await this.analyzeRepositoryStructure(repositoryStructure);
    console.log('リポジトリ構造の分析が完了しました');

    // 変更内容の詳細を取得
    const diffDetails = this.formatChangedFiles(changedFiles);
    console.log('変更内容の詳細を取得しました');

    // レビュー観点を生成
    const reviewFocus = generateReviewFocus(this.reviewConfig);

    // コードレビューを実行
    const detailedReview = await this.performCodeReview(
      repositoryInfo,
      pullRequest,
      changedFiles,
      diffDetails,
      reviewFocus
    );
    console.log('コードレビューが完了しました');

    // サマリーコメントを生成
    const summary = await this.generateSummaryComment(pullRequest, detailedReview);
    console.log('サマリーコメントを生成しました');

    // レビュー結果を作成
    const reviewResult: ReviewResult = {
      summary,
      comments: this.extractComments(detailedReview, changedFiles),
      overallAssessment: this.extractOverallAssessment(detailedReview),
      suggestedImprovements: this.extractSuggestedImprovements(detailedReview),
    };

    // レビューコメントを投稿
    if (reviewResult.comments.length > 0) {
      await this.githubClient.createReviewComments(reviewResult.comments);
      console.log(`${reviewResult.comments.length} 件のレビューコメントを投稿しました`);
    }

    // サマリーコメントを投稿
    await this.githubClient.createIssueComment(reviewResult.summary);
    console.log('サマリーコメントを投稿しました');

    return reviewResult;
  }

  /**
   * リポジトリ構造を分析する
   * @param repositoryStructure リポジトリ構造
   * @returns リポジトリ情報
   */
  private async analyzeRepositoryStructure(repositoryStructure: string[]): Promise<string> {
    const formattedStructure = repositoryStructure.join('\n');
    
    return await this.llmClient.generateFromTemplate(
      REPOSITORY_STRUCTURE_PROMPT,
      { repositoryStructure: formattedStructure }
    );
  }

  /**
   * 変更ファイル一覧をフォーマットする
   * @param changedFiles 変更ファイル一覧
   * @returns フォーマットされた変更内容
   */
  private formatChangedFiles(changedFiles: any[]): string {
    return changedFiles.map(file => {
      return `ファイル: ${file.filename}
状態: ${file.status}
追加行数: ${file.additions}
削除行数: ${file.deletions}
変更行数: ${file.changes}
${file.patch ? `差分:\n\`\`\`\n${file.patch}\n\`\`\`` : ''}
`;
    }).join('\n---\n\n');
  }

  /**
   * コードレビューを実行する
   * @param repositoryInfo リポジトリ情報
   * @param pullRequest プルリクエスト情報
   * @param changedFiles 変更ファイル一覧
   * @param diffDetails 変更内容の詳細
   * @param reviewFocus レビュー観点
   * @returns 詳細なレビュー結果
   */
  private async performCodeReview(
    repositoryInfo: string,
    pullRequest: any,
    changedFiles: any[],
    diffDetails: string,
    reviewFocus: string
  ): Promise<string> {
    const changedFilesList = changedFiles.map(file => `- ${file.filename} (${file.status}, +${file.additions}, -${file.deletions})`).join('\n');

    return await this.llmClient.generateFromTemplate(
      CODE_REVIEW_PROMPT,
      {
        repositoryInfo,
        prTitle: pullRequest.title,
        prDescription: pullRequest.body || '(説明なし)',
        prAuthor: pullRequest.user.login,
        prBranch: pullRequest.head.ref,
        changedFiles: changedFilesList,
        diffDetails,
        reviewFocus,
      }
    );
  }

  /**
   * サマリーコメントを生成する
   * @param pullRequest プルリクエスト情報
   * @param detailedReview 詳細なレビュー結果
   * @returns サマリーコメント
   */
  private async generateSummaryComment(pullRequest: any, detailedReview: string): Promise<string> {
    return await this.llmClient.generateFromTemplate(
      SUMMARY_COMMENT_PROMPT,
      {
        prTitle: pullRequest.title,
        prDescription: pullRequest.body || '(説明なし)',
        prAuthor: pullRequest.user.login,
        detailedReview,
      }
    );
  }

  /**
   * レビューコメントを抽出する
   * @param detailedReview 詳細なレビュー結果
   * @param changedFiles 変更ファイル一覧
   * @returns レビューコメント一覧
   */
  private extractComments(detailedReview: string, changedFiles: any[]): any[] {
    // 実際の実装では、LLMの出力からコメントを抽出する処理を実装する
    // 簡略化のため、ここでは空の配列を返す
    return [];
  }

  /**
   * 全体評価を抽出する
   * @param detailedReview 詳細なレビュー結果
   * @returns 全体評価
   */
  private extractOverallAssessment(detailedReview: string): string {
    // 実際の実装では、LLMの出力から全体評価を抽出する処理を実装する
    // 簡略化のため、ここでは空の文字列を返す
    return '';
  }

  /**
   * 改善提案を抽出する
   * @param detailedReview 詳細なレビュー結果
   * @returns 改善提案一覧
   */
  private extractSuggestedImprovements(detailedReview: string): string[] {
    // 実際の実装では、LLMの出力から改善提案を抽出する処理を実装する
    // 簡略化のため、ここでは空の配列を返す
    return [];
  }
}

/**
 * メイン関数
 * 環境変数から設定を読み込み、プルリクエストをレビューする
 */
export async function main() {
  // 環境変数から設定を読み込む
  const githubConfig: GitHubConfig = {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_REPOSITORY_OWNER || '',
    repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || '',
    pullRequestNumber: parseInt(process.env.PULL_REQUEST_NUMBER || '0', 10),
  };

  const llmConfig: LLMConfig = {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.LLM_MODEL || 'claude-3-sonnet-20240229',
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000', 10),
  };

  const reviewConfig: ReviewConfig = {
    depth: (process.env.REVIEW_DEPTH || 'detailed') as 'basic' | 'detailed' | 'comprehensive',
    includePositiveFeedback: process.env.INCLUDE_POSITIVE_FEEDBACK === 'true',
    codeQuality: process.env.REVIEW_CODE_QUALITY === 'true',
    bestPractices: process.env.REVIEW_BEST_PRACTICES === 'true',
    security: process.env.REVIEW_SECURITY === 'true',
    performance: process.env.REVIEW_PERFORMANCE === 'true',
    focusAreas: process.env.REVIEW_FOCUS_AREAS?.split(','),
  };

  // 設定の検証
  if (!githubConfig.token) {
    throw new Error('GITHUB_TOKEN is required');
  }

  if (!githubConfig.owner || !githubConfig.repo) {
    throw new Error('GITHUB_REPOSITORY is required');
  }

  if (!githubConfig.pullRequestNumber) {
    throw new Error('PULL_REQUEST_NUMBER is required');
  }

  if (!llmConfig.apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  // レビューを実行
  const reviewer = new LLMReviewer(githubConfig, llmConfig, reviewConfig);
  await reviewer.reviewPullRequest();
}

// スクリプトとして実行された場合、main関数を実行
if (require.main === module) {
  main().catch(error => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
}
