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
    console.log('[AI Service] Using config:', {
      baseURL: config.baseURL,
      model: config.model,
      apiKeyLength: config.apiKey?.length,
    });
    console.log('[AI Service] Full request URL will be:', `${config.baseURL}/chat/completions`);

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

    // 提取更详细的错误信息
    let errorMessage = '未知错误';
    if (error instanceof Error) {
      errorMessage = error.message;
      // 尝试提取 API 错误的详细信息
      const apiError = error as Error & {
        cause?: { message?: string };
        data?: { error?: { message?: string } };
        responseBody?: string;
      };
      if (apiError.cause?.message) {
        errorMessage = apiError.cause.message;
      } else if (apiError.data?.error?.message) {
        errorMessage = apiError.data.error.message;
      } else if (apiError.responseBody) {
        try {
          const body = JSON.parse(apiError.responseBody);
          if (body.error?.message) {
            errorMessage = body.error.message;
          }
        } catch {
          // 忽略解析错误
        }
      }
    } else {
      errorMessage = String(error);
    }

    const err = new Error(errorMessage);
    onError?.(err);
    throw err;
  }
}
