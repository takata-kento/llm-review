import { LLMReviewer } from '../src';
import { GitHubClient } from '../src/github/client';
import { LLMClient } from '../src/llm/client';
import { GitHubConfig, LLMConfig, ReviewConfig } from '../src/types';

// GitHubClientとLLMClientをモック
jest.mock('../src/github/client');
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

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // GitHubClientのモックメソッドを設定
    (GitHubClient as jest.Mock).mockImplementation(() => ({
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

    // LLMClientのモックメソッドを設定
    (LLMClient as jest.Mock).mockImplementation(() => ({
      generateFromTemplate: jest.fn().mockImplementation((template, variables) => {
        if (template.includes('REPOSITORY_STRUCTURE_PROMPT')) {
          return Promise.resolve('Repository structure analysis');
        } else if (template.includes('CODE_REVIEW_PROMPT')) {
          return Promise.resolve('Code review result');
        } else if (template.includes('SUMMARY_COMMENT_PROMPT')) {
          return Promise.resolve('Summary comment');
        }
        return Promise.resolve('Default response');
      }),
      generate: jest.fn().mockResolvedValue('Test LLM response'),
      generateWithSystemPrompt: jest.fn().mockResolvedValue('Test LLM response with system prompt'),
    }));
  });

  test('reviewPullRequest should complete the review process', async () => {
    // LLMReviewerのインスタンスを作成
    const reviewer = new LLMReviewer(githubConfig, llmConfig, reviewConfig);

    // レビューを実行
    const result = await reviewer.reviewPullRequest();

    // GitHubClientのメソッドが呼び出されたことを確認
    expect(GitHubClient).toHaveBeenCalledWith(githubConfig);
    const githubClientInstance = (GitHubClient as jest.Mock).mock.instances[0];
    expect(githubClientInstance.getPullRequestInfo).toHaveBeenCalled();
    expect(githubClientInstance.getChangedFiles).toHaveBeenCalled();
    expect(githubClientInstance.getRepositoryStructure).toHaveBeenCalledWith('', 'main');
    expect(githubClientInstance.createIssueComment).toHaveBeenCalled();

    // LLMClientのメソッドが呼び出されたことを確認
    expect(LLMClient).toHaveBeenCalledWith(llmConfig);
    const llmClientInstance = (LLMClient as jest.Mock).mock.instances[0];
    expect(llmClientInstance.generateFromTemplate).toHaveBeenCalled();

    // 結果を確認
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('comments');
    expect(result).toHaveProperty('overallAssessment');
    expect(result).toHaveProperty('suggestedImprovements');
  });
});
