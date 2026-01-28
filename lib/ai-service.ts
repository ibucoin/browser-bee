import { streamText } from 'ai';
import i18n from './i18n';
import { getAIConfig, getChatModel } from './ai-config';
import { Message, TabInfo, ElementInfo, Attachment } from './types';

export interface ChatRequest {
  messages: Message[];
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  abortSignal?: AbortSignal;
}

/**
 * 构建包含页面上下文的消息列表
 */
export function buildMessagesWithContext(
  messages: Message[],
  attachments: Attachment[]
): { role: 'user' | 'assistant' | 'system'; content: string }[] {
  const contextParts: string[] = [];
  
  // 提取 tab 类型的附件
  const tabAttachments = attachments.filter((a): a is Attachment & { type: 'tab' } => a.type === 'tab');
  // 提取 element 类型的附件
  const elementAttachments = attachments.filter((a): a is Attachment & { type: 'element' } => a.type === 'element');
  
  // 添加页面内容上下文
  const tabContexts = tabAttachments
    .filter((a) => a.data.pageContent)
    .map((a) => `[${a.data.title}](${a.data.url}):\n${a.data.pageContent}`);
  
  if (tabContexts.length > 0) {
    contextParts.push(`## ${i18n.t('webPageContent')}\n\n` + tabContexts.join('\n\n---\n\n'));
  }

  // 添加选中元素上下文
  if (elementAttachments.length > 0) {
    const elementContexts = elementAttachments.map((a) =>
      `### <${a.data.tagName}> ${i18n.t('element')}\n- ${i18n.t('source')}: ${a.data.tabTitle}\n- ${i18n.t('selector')}: ${a.data.selector}\n- ${i18n.t('contentColon')}:\n\`\`\`html\n${a.data.outerHTML}\n\`\`\``
    );
    contextParts.push(`## ${i18n.t('selectedElements')}\n\n` + elementContexts.join('\n\n'));
  }

  const coreMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];

  // 如果有上下文，添加系统提示
  if (contextParts.length > 0) {
    coreMessages.push({
      role: 'system',
      content: `${i18n.t('contextInfo')}\n\n${contextParts.join('\n\n---\n\n')}`,
    });
  }

  // 添加历史消息
  for (const m of messages) {
    coreMessages.push({
      role: m.role,
      content: m.content,
    });
  }

  return coreMessages;
}

export async function streamChat({ messages, onChunk, onComplete, onError, abortSignal }: ChatRequest) {
  try {
    const config = await getAIConfig();
    console.log('[AI Service] Using config:', {
      baseURL: config.baseURL,
      model: config.model,
      apiKeyLength: config.apiKey?.length,
    });
    console.log('[AI Service] Full request URL will be:', `${config.baseURL}/chat/completions`);

    if (!config.apiKey) {
      throw new Error(i18n.t('configureApiKey'));
    }

    // 使用 getChatModel 获取 chat completions 模型
    const model = getChatModel(config);

    // 转换消息格式
    const coreMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    console.log('[AI Service] Calling streamText with messages:', coreMessages);

    const result = streamText({
      model,
      messages: coreMessages,
      abortSignal,
    });

    let fullText = '';

    for await (const chunk of result.textStream) {
      if (abortSignal?.aborted) {
        console.log('[AI Service] Stream aborted');
        break;
      }
      fullText += chunk;
      onChunk?.(chunk);
    }

    if (!abortSignal?.aborted) {
      onComplete?.(fullText);
    }
    return fullText;
  } catch (error) {
    console.error('[AI Service] Full error:', error);

    // 提取更详细的错误信息
    let errorMessage = i18n.t('unknownError');
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
