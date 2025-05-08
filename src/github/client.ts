import { Octokit } from '@octokit/rest';
import { GitHubConfig, ChangedFile, ReviewComment } from '../types';

/**
 * GitHub APIクライアントクラス
 * プルリクエスト情報の取得やコメントの投稿を行う
 */
export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;

  /**
   * コンストラクタ
   * @param config GitHub API設定
   */
  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  /**
   * プルリクエスト情報を取得する
   * @returns プルリクエスト情報
   */
  async getPullRequestInfo() {
    const { owner, repo, pullRequestNumber } = this.config;

    const { data: pullRequest } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: pullRequestNumber,
    });

    return pullRequest;
  }

  /**
   * プルリクエストの変更ファイル一覧を取得する
   * @returns 変更ファイル一覧
   */
  async getChangedFiles(): Promise<ChangedFile[]> {
    const { owner, repo, pullRequestNumber } = this.config;

    const { data: files } = await this.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullRequestNumber,
      per_page: 100, // 最大100件まで取得
    });

    return files as ChangedFile[];
  }

  /**
   * プルリクエストのコンテンツを取得する
   * @param filePath ファイルパス
   * @param ref ブランチ名またはコミットハッシュ
   * @returns ファイルの内容
   */
  async getFileContent(filePath: string, ref: string): Promise<string> {
    const { owner, repo } = this.config;

    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref,
      });

      // ファイルの内容をデコード
      if ('content' in data && 'encoding' in data) {
        if (data.encoding === 'base64') {
          return Buffer.from(data.content, 'base64').toString('utf-8');
        }
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      console.error(`Failed to get content for ${filePath}:`, error);
      return '';
    }
  }

  /**
   * リポジトリの構造を取得する
   * @param path ディレクトリパス
   * @param ref ブランチ名またはコミットハッシュ
   * @returns ディレクトリ内のファイル一覧
   */
  async getRepositoryStructure(path: string = '', ref: string): Promise<string[]> {
    const { owner, repo } = this.config;

    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if (Array.isArray(data)) {
        const result: string[] = [];

        // ファイルとディレクトリを処理
        for (const item of data) {
          if (item.type === 'file') {
            result.push(item.path);
          } else if (item.type === 'dir') {
            // 再帰的にディレクトリ内のファイルを取得
            const subFiles = await this.getRepositoryStructure(item.path, ref);
            result.push(...subFiles);
          }
        }

        return result;
      }

      return [];
    } catch (error) {
      console.error(`Failed to get repository structure for ${path}:`, error);
      return [];
    }
  }

  /**
   * プルリクエストにレビューコメントを投稿する
   * @param comments コメント一覧
   */
  async createReviewComments(comments: ReviewComment[]) {
    const { owner, repo, pullRequestNumber } = this.config;

    // レビューコメントを作成
    await this.octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullRequestNumber,
      event: 'COMMENT',
      comments: comments.map(comment => ({
        path: comment.path,
        position: comment.position,
        body: comment.body,
        line: comment.line,
        side: comment.side,
      })),
    });
  }

  /**
   * プルリクエストに総評コメントを投稿する
   * @param body コメント本文
   */
  async createIssueComment(body: string) {
    const { owner, repo, pullRequestNumber } = this.config;

    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequestNumber,
      body,
    });
  }
}
