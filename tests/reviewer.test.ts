import { LLMReviewer } from '../src';
import { getPullRequestInfo, getChangedFiles, getRepositoryStructure, getFileContent, createReviewComments, createIssueComment } from '../src/github/client';
import { createLLMClient } from '../src/llm/client';
import { AnthropicLLMClient } from '../src/llm/anthropic';
import { GitHubConfig, LLMConfig, ReviewConfig } from '../src/types';

// GitHubClientとLLMClientをモック
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    pulls: {
      get: jest.fn(),
      listFiles: jest.fn(),
      createReview: jest.fn(),
    },
    repos: {
      getContent: jest.fn(),
    },
    issues: {
      createComment: jest.fn(),
    },
  })),
}));
jest.mock('../src/github/client', () => ({
  getPullRequestInfo: jest.fn(),
  getChangedFiles: jest.fn(),
  getRepositoryStructure: jest.fn(),
  getFileContent: jest.fn(),
  createReviewComments: jest.fn(),
  createIssueComment: jest.fn(),
}));
jest.mock('../src/llm/anthropic');
jest.mock('../src/llm/client', () => ({
  createLLMClient: jest.fn((config) => {
    const mockClient = new AnthropicLLMClient(config);
    return mockClient;
  })
}));

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

  const generateFromTemplateMock = jest.fn();

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // 各GitHubクライアント関数のモック実装を設定
    (getPullRequestInfo as jest.Mock).mockResolvedValue({
      number: 123,
      title: 'Test PR',
      body: 'Test PR description',
      user: { login: 'test-user' },
      head: { ref: 'feature-branch' },
      base: { ref: 'main' },
    });
    (getChangedFiles as jest.Mock).mockResolvedValue([
      {
        filename: 'test-file.ts',
        status: 'modified',
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: '@@ -1,5 +1,10 @@\n Test patch',
      },
    ]);
    (getRepositoryStructure as jest.Mock).mockResolvedValue([
      'src/index.ts',
      'src/types/index.ts',
      'README.md',
    ]);
    (getFileContent as jest.Mock).mockResolvedValue('Test file content');
    (createReviewComments as jest.Mock).mockResolvedValue(undefined);
    (createIssueComment as jest.Mock).mockResolvedValue(undefined);

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
    (AnthropicLLMClient as jest.Mock).mockImplementation(() => ({
      generateFromTemplate: generateFromTemplateMock,
    }));
  });

  test('reviewPullRequest should complete the review process', async () => {
    // LLMReviewerのインスタンスを作成
    const reviewer = new LLMReviewer(githubConfig, llmConfig, reviewConfig);

    // レビューを実行
    const result = await reviewer.reviewPullRequest();

    // 各GitHubクライアント関数が呼び出されたことを確認
    expect(getPullRequestInfo).toHaveBeenCalledWith(expect.any(Object), githubConfig);
    expect(getChangedFiles).toHaveBeenCalledWith(expect.any(Object), githubConfig);
    expect(getRepositoryStructure).toHaveBeenCalledWith(expect.any(Object), githubConfig, '', 'main');
    expect(createIssueComment).toHaveBeenCalledWith(expect.any(Object), githubConfig, expect.any(String));

    // createLLMClientのメソッドが呼び出されたことを確認
    expect(createLLMClient).toHaveBeenCalledWith(llmConfig);
    expect(generateFromTemplateMock).toHaveBeenCalled();

    // 結果を確認
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('comments');
    expect(result).toHaveProperty('overallAssessment');
    expect(result).toHaveProperty('suggestedImprovements');
  });
});
