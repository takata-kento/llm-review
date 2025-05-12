import { Octokit } from '@octokit/rest';
import { GitHubConfig, ChangedFile, ReviewComment } from '../types';

/**
 * GitHub APIクライアントの型定義
 */
export type GitHubClientType = {
  getPullRequestInfo: () => Promise<any>;
  getChangedFiles: () => Promise<ChangedFile[]>;
  getFileContent: (filePath: string, ref: string) => Promise<string>;
  getRepositoryStructure: (path: string, ref: string) => Promise<string[]>;
  createReviewComments: (comments: ReviewComment[]) => Promise<void>;
  createIssueComment: (body: string) => Promise<void>;
};

/**
 * Octokitインスタンスを作成する
 * @param token GitHub APIトークン
 * @returns Octokitインスタンス
 */
const createOctokit = (token: string): Octokit => {
  return new Octokit({
    auth: token,
  });
};

/**
 * プルリクエスト情報を取得する
 * @param config GitHub API設定
 * @returns プルリクエスト情報を取得する関数
 */
export const getPullRequestInfo = async (config: GitHubConfig) => {
  const { token, owner, repo, pullRequestNumber } = config;
  const octokit = createOctokit(token);

  try {
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullRequestNumber,
    });

    return pullRequest;
  } catch (error) {
    console.error('Failed to get pull request info:', error);
    throw new Error('Failed to get pull request info');
  }
};

/**
 * プルリクエストの変更ファイル一覧を取得する
 * @param config GitHub API設定
 * @returns 変更ファイル一覧
 */
export const getChangedFiles = async (config: GitHubConfig): Promise<ChangedFile[]> => {
  const { token, owner, repo, pullRequestNumber } = config;
  const octokit = createOctokit(token);

  try {
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullRequestNumber,
      per_page: 100, // 最大100件まで取得
    });

    return files as ChangedFile[];
  } catch (error) {
    console.error('Failed to get changed files:', error);
    return [];
  }
};

/**
 * ファイルの内容をデコードする
 * @param content Base64エンコードされたコンテンツ
 * @param encoding エンコーディング
 * @returns デコードされたコンテンツ
 */
const decodeFileContent = (content: string, encoding: string): string => {
  if (encoding === 'base64') {
    return Buffer.from(content, 'base64').toString('utf-8');
  }
  throw new Error(`Unsupported encoding: ${encoding}`);
};

/**
 * プルリクエストのコンテンツを取得する
 * @param config GitHub API設定
 * @param filePath ファイルパス
 * @param ref ブランチ名またはコミットハッシュ
 * @returns ファイルの内容
 */
export const getFileContent = async (
  config: GitHubConfig,
  filePath: string,
  ref: string
): Promise<string> => {
  const { token, owner, repo } = config;
  const octokit = createOctokit(token);

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref,
    });

    // ファイルの内容をデコード
    if ('content' in data && 'encoding' in data) {
      return decodeFileContent(data.content, data.encoding);
    }

    throw new Error('Unexpected response format');
  } catch (error) {
    console.error(`Failed to get content for ${filePath}:`, error);
    return '';
  }
};

/**
 * リポジトリの構造を再帰的に取得する
 * @param config GitHub API設定
 * @param octokit Octokitインスタンス
 * @param path ディレクトリパス
 * @param ref ブランチ名またはコミットハッシュ
 * @returns ディレクトリ内のファイル一覧
 */
const getRepositoryStructureRecursive = async (
  config: GitHubConfig,
  octokit: Octokit,
  path: string,
  ref: string
): Promise<string[]> => {
  const { owner, repo } = config;

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(data)) {
      // 非同期処理を並列実行するためのPromiseの配列
      const filePromises = data.map(async (item) => {
        if (item.type === 'file') {
          return [item.path];
        } else if (item.type === 'dir') {
          // 再帰的にディレクトリ内のファイルを取得
          const subFiles = await getRepositoryStructureRecursive(config, octokit, item.path, ref);
          return subFiles;
        }
        return [];
      });

      // すべてのPromiseが解決するのを待つ
      const nestedResults = await Promise.all(filePromises);
      
      // 結果を平坦化
      return nestedResults.flat();
    }

    return [];
  } catch (error) {
    console.error(`Failed to get repository structure for ${path}:`, error);
    return [];
  }
};

/**
 * リポジトリの構造を取得する
 * @param config GitHub API設定
 * @param path ディレクトリパス
 * @param ref ブランチ名またはコミットハッシュ
 * @returns ディレクトリ内のファイル一覧
 */
export const getRepositoryStructure = async (
  config: GitHubConfig,
  path: string = '',
  ref: string
): Promise<string[]> => {
  const octokit = createOctokit(config.token);
  return getRepositoryStructureRecursive(config, octokit, path, ref);
};

/**
 * レビューコメントを準備する
 * @param comment レビューコメント
 * @returns GitHub API用のコメント形式
 */
const prepareReviewComment = (comment: ReviewComment) => ({
  path: comment.path,
  position: comment.position,
  body: comment.body,
  line: comment.line,
  side: comment.side,
});

/**
 * プルリクエストにレビューコメントを投稿する
 * @param config GitHub API設定
 * @param comments コメント一覧
 * @returns 投稿結果
 */
export const createReviewComments = async (
  config: GitHubConfig,
  comments: ReviewComment[]
): Promise<void> => {
  const { token, owner, repo, pullRequestNumber } = config;
  const octokit = createOctokit(token);

  try {
    // コメントを変換
    const formattedComments = comments.map(prepareReviewComment);

    // レビューコメントを作成
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullRequestNumber,
      event: 'COMMENT',
      comments: formattedComments,
    });
  } catch (error) {
    console.error('Failed to create review comments:', error);
    throw new Error('Failed to create review comments');
  }
};

/**
 * プルリクエストに総評コメントを投稿する
 * @param config GitHub API設定
 * @param body コメント本文
 * @returns 投稿結果
 */
export const createIssueComment = async (
  config: GitHubConfig,
  body: string
): Promise<void> => {
  const { token, owner, repo, pullRequestNumber } = config;
  const octokit = createOctokit(token);

  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequestNumber,
      body,
    });
  } catch (error) {
    console.error('Failed to create issue comment:', error);
    throw new Error('Failed to create issue comment');
  }
};

/**
 * GitHub APIクライアント関数をまとめたオブジェクト
 * 既存のコードとの互換性のために提供
 */
export const createGitHubClient = (config: GitHubConfig) => ({
  getPullRequestInfo: () => getPullRequestInfo(config),
  getChangedFiles: () => getChangedFiles(config),
  getFileContent: (filePath: string, ref: string) => getFileContent(config, filePath, ref),
  getRepositoryStructure: (path: string = '', ref: string) => getRepositoryStructure(config, path, ref),
  createReviewComments: (comments: ReviewComment[]) => createReviewComments(config, comments),
  createIssueComment: (body: string) => createIssueComment(config, body),
});
