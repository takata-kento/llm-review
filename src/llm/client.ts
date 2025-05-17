import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
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
    // PromptTemplateを作成
    const promptTemplate = PromptTemplate.fromTemplate(template);
    
    // chainを構築
    const chain = RunnableSequence.from([
      promptTemplate,
      this.client,
      new StringOutputParser(),
    ]);
    
    // chainを実行
    const response = await chain.invoke(variables);
    
    return response;
  }

}
