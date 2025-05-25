import { LLMConfig } from '../types';
import { AnthropicLLMClient } from './anthropic';

/**
 * LLMクライアントのインターフェース
 */
export interface ILLMClient {
  generateFromTemplate(template: string, variables: Record<string, string>): Promise<string>;
}

/**
 * LLMClientのファクトリ関数
 * @param config LLM設定
 * @returns ILLMClientの実装
 */
export function createLLMClient(config: LLMConfig): ILLMClient {
  return new AnthropicLLMClient(config);
}
