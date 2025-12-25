import { streamText } from 'ai';
import { getAIConfig, getChatModel } from './ai-config';
import { Message } from './types';

export interface ChatRequest {
  messages: Message[];
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export async function streamChat({ messages, onChunk, onComplete, onError }: ChatRequest) {
  try {
    const config = await getAIConfig();
    console.log('[AI Service] Using config:', { baseURL: config.baseURL, model: config.model });

    if (!config.apiKey) {
      throw new Error('请先配置 API Key');
    }

    // 使用 getChatModel 获取 chat completions 模型
    const model = getChatModel(config);

    // 转换消息格式
    const coreMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    console.log('[AI Service] Calling streamText with messages:', coreMessages);

    const result = streamText({
      model,
      messages: coreMessages,
    });

    let fullText = '';

    for await (const chunk of result.textStream) {
      fullText += chunk;
      onChunk?.(chunk);
    }

    onComplete?.(fullText);
    return fullText;
  } catch (error) {
    console.error('[AI Service] Full error:', error);
    console.error('[AI Service] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}
