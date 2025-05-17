import { LLMReviewer } from '../src';
import { createGitHubClient, GitHubClientType } from '../src/github/client';
import { LLMClient } from '../src/llm/client';
import { GitHubConfig, LLMConfig, ReviewConfig } from '../src/types';

// GitHubClientとLLMClientをモック
jest.mock('../src/github/client', () => ({
  createGitHubClient: jest.fn(),
  GitHubClientType: jest.fn(),
}));
jest.mock('../src/llm/client');

describe('LLMReviewer', () => {
  // テスト用の設定
  const githubConfig: GitHubConfig = {
    token: 'test-token',
    owner: 'test-owner',
    repo: 'test-repo',
    pullRequestNumber: 123,
  };

  const llmConfig: LLMConfig = {
    apiKey: 'test-api-key',
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 4000,
  };

  const reviewConfig: ReviewConfig = {
    depth: 'detailed',
    includePositiveFeedback: true,
    codeQuality: true,
    bestPractices: true,
    security: true,
    performance: true,
  };

  // LLMClientのモック関数をdescribeスコープで定義
  const generateFromTemplateMock = jest.fn();

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // createGitHubClientのモック実装を設定
    (createGitHubClient as jest.Mock).mockImplementation(() => ({
      getPullRequestInfo: jest.fn().mockResolvedValue({
        number: 123,
        title: 'Test PR',
        body: 'Test PR description',
        user: { login: 'test-user' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
      }),
      getChangedFiles: jest.fn().mockResolvedValue([
        {
          filename: 'test-file.ts',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: '@@ -1,5 +1,10 @@\n Test patch',
        },
      ]),
      getRepositoryStructure: jest.fn().mockResolvedValue([
        'src/index.ts',
        'src/types/index.ts',
        'README.md',
      ]),
      getFileContent: jest.fn().mockResolvedValue('Test file content'),
      createReviewComments: jest.fn().mockResolvedValue(undefined),
      createIssueComment: jest.fn().mockResolvedValue(undefined),
    }));

    // LLMClientのモック関数の実装を設定
    generateFromTemplateMock.mockImplementation((template, variables) => {
      if (template.includes('REPOSITORY_STRUCTURE_PROMPT')) {
        return Promise.resolve('Repository structure analysis');
      } else if (template.includes('CODE_REVIEW_PROMPT')) {
        return Promise.resolve('Code review result');
      } else if (template.includes('SUMMARY_COMMENT_PROMPT')) {
        return Promise.resolve('Summary comment');
      }
      return Promise.resolve('Default response');
    });
    
    // LLMClientのモック実装を設定
    (LLMClient as jest.Mock).mockImplementation(() => ({
      generateFromTemplate: generateFromTemplateMock,
    }));
  });

  test('reviewPullRequest should complete the review process', async () => {
    // LLMReviewerのインスタンスを作成
    const reviewer = new LLMReviewer(githubConfig, llmConfig, reviewConfig);

    // レビューを実行
    const result = await reviewer.reviewPullRequest();

    // createGitHubClientが呼び出されたことを確認
    expect(createGitHubClient).toHaveBeenCalledWith(githubConfig);
    const mockGitHubClient = (createGitHubClient as jest.Mock).mock.results[0].value;
    expect(mockGitHubClient.getPullRequestInfo).toHaveBeenCalled();
    expect(mockGitHubClient.getChangedFiles).toHaveBeenCalled();
    expect(mockGitHubClient.getRepositoryStructure).toHaveBeenCalledWith('', 'main');
    expect(mockGitHubClient.createIssueComment).toHaveBeenCalled();

    // LLMClientのメソッドが呼び出されたことを確認
    expect(LLMClient).toHaveBeenCalledWith(llmConfig);
    expect(generateFromTemplateMock).toHaveBeenCalled();

    // 結果を確認
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('comments');
    expect(result).toHaveProperty('overallAssessment');
    expect(result).toHaveProperty('suggestedImprovements');
  });
});
