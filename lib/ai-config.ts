import { createOpenAI } from '@ai-sdk/openai';

export interface AIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

// 硬编码配置 - 直接用于测试
// OpenAI 兼容的中转站需要在 baseURL 后加 /v1
const CONFIG: AIConfig = {
  baseURL: 'https://kfc-api.sxxe.net/v1',
  apiKey: 'sk-dj6l5fH7ig0dgqhZe1EbT9JLoTJ1a9BvAX74uBIlG6qUKzmX',
  model: 'cursor2-claude-4.5-sonnet',
};

export async function getAIConfig(): Promise<AIConfig> {
  return CONFIG;
}

export function createAIProvider(config: AIConfig) {
  return createOpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    compatibility: 'compatible',
  });
}

// 获取聊天模型，显式使用 chat completions API
export function getChatModel(config: AIConfig) {
  const provider = createAIProvider(config);
  // 使用 .chat() 方法强制使用 chat completions 端点
  return provider.chat(config.model);
}
