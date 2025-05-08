import { ChatAnthropic } from '@langchain/anthropic';
import { LLMConfig } from '../types';

/**
 * LLMクライアントクラス
 * Claude 3.7 Sonnetとの連携を行う
 */
export class LLMClient {
  private client: ChatAnthropic;
  private config: LLMConfig;

  /**
   * コンストラクタ
   * @param config LLM設定
   */
  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new ChatAnthropic({
      anthropicApiKey: config.apiKey,
      modelName: config.model || 'claude-3-sonnet-20240229',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4000,
    });
  }

  /**
   * テンプレート文字列を使用してLLMに問い合わせる
   * @param template テンプレート文字列
   * @param variables 変数
   * @returns LLMの応答
   */
  async generateFromTemplate(template: string, variables: Record<string, string>): Promise<string> {
    // 変数を置換してプロンプトを生成
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    const response = await this.client.invoke([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    return response.content.toString();
  }

  /**
   * 直接プロンプトを使用してLLMに問い合わせる
   * @param prompt プロンプト
   * @returns LLMの応答
   */
  async generate(prompt: string): Promise<string> {
    const response = await this.client.invoke([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    return response.content.toString();
  }

  /**
   * システムプロンプトとユーザープロンプトを使用してLLMに問い合わせる
   * @param systemPrompt システムプロンプト
   * @param userPrompt ユーザープロンプト
   * @returns LLMの応答
   */
  async generateWithSystemPrompt(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.invoke([
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ]);

    return response.content.toString();
  }
}
