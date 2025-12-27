import { TabEventMessage, TabInfo, AIChatRequest, AIChatStreamChunk, AIChatComplete, AIChatError, ContentExtractRequest, ContentExtractResponse } from '@/lib/types';
import { streamChat, buildMessagesWithContext } from '@/lib/ai-service';

// 页面内容提取函数 - 在目标页面中执行
function extractPageContentInPage(): { title: string; content: string } {
  const MAX_CONTENT_LENGTH = 10000;

  // 尝试使用语义标签提取
  const selectors = ['article', 'main', '[role="main"]', '.content', '#content'];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent && el.textContent.trim().length > 200) {
      return {
        title: document.title,
        content: el.textContent.trim().slice(0, MAX_CONTENT_LENGTH),
      };
    }
  }

  // 降级到 body.innerText
  return {
    title: document.title,
    content: document.body.innerText.trim().slice(0, MAX_CONTENT_LENGTH),
  };
}

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // 点击扩展图标时打开 sidepanel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // 监听 Tab 激活事件
  chrome.tabs.onActivated.addListener((activeInfo) => {
    const message: TabEventMessage = {
      type: 'activated',
      tabId: activeInfo.tabId,
      windowId: activeInfo.windowId,
    };
    chrome.runtime.sendMessage(message).catch(() => {
      // Side Panel 可能未打开，忽略错误
    });
  });

  // 监听 Tab 关闭事件
  chrome.tabs.onRemoved.addListener((tabId) => {
    const message: TabEventMessage = {
      type: 'removed',
      tabId,
    };
    chrome.runtime.sendMessage(message).catch(() => {
      // Side Panel 可能未打开，忽略错误
    });
  });

  // 监听 Tab URL、title 或 favicon 更新事件
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if ((changeInfo.url || changeInfo.title || changeInfo.favIconUrl) && tab.url) {
      const tabInfo: TabInfo = {
        id: tabId,
        title: tab.title || '未命名标签页',
        url: tab.url,
        favicon: tab.favIconUrl,
        hostname: new URL(tab.url).hostname,
      };
      const message: TabEventMessage = {
        type: 'updated',
        tabId,
        tabInfo,
        urlChanged: Boolean(changeInfo.url),
      };
      chrome.runtime.sendMessage(message).catch(() => {
        // Side Panel 可能未打开，忽略错误
      });
    }
  });

  // 监听 AI 聊天请求和内容提取请求
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('[Background] Received message:', message);
    if (message.type === 'ai_chat_request') {
      console.log('[Background] Processing AI chat request');
      const request = message as AIChatRequest;
      handleAIChatRequest(request);
      sendResponse({ received: true });
    } else if (message.type === 'content_extract_request') {
      console.log('[Background] Processing content extract request');
      const request = message as ContentExtractRequest;
      handleContentExtractRequest(request, sendResponse);
      return true; // 保持消息通道开放
    }
    return true;
  });

  // 处理内容提取请求 - 使用 scripting API 动态执行
  async function handleContentExtractRequest(
    request: ContentExtractRequest,
    sendResponse: (response: ContentExtractResponse) => void
  ) {
    try {
      console.log('[Background] Extracting content from tab:', request.tabId);
      const results = await chrome.scripting.executeScript({
        target: { tabId: request.tabId },
        func: extractPageContentInPage,
      });

      console.log('[Background] Script execution results:', results);

      if (results && results[0] && results[0].result) {
        const { title, content } = results[0].result;
        console.log('[Background] Content extracted successfully:');
        console.log('[Background] - Title:', title);
        console.log('[Background] - Content length:', content.length);
        console.log('[Background] - Content preview:', content.substring(0, 500));
        sendResponse({
          type: 'content_extract_response',
          tabId: request.tabId,
          success: true,
          title,
          content,
        });
      } else {
        console.log('[Background] No content extracted, results:', results);
        sendResponse({
          type: 'content_extract_response',
          tabId: request.tabId,
          success: false,
          error: 'No content extracted',
        });
      }
    } catch (error) {
      console.error('[Background] Content extract error:', error);
      sendResponse({
        type: 'content_extract_response',
        tabId: request.tabId,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract content',
      });
    }
  }

  async function handleAIChatRequest(request: AIChatRequest) {
    const { chatTabId, messages, selectedTabs } = request;
    console.log('[Background] handleAIChatRequest called with:', { chatTabId, messageCount: messages.length, tabCount: selectedTabs.length });

    // 输出每个标签页的内容情况
    console.log('[Background] Selected tabs content:');
    selectedTabs.forEach((tab, index) => {
      console.log(`[Background] Tab ${index + 1}: "${tab.title}" - pageContent length: ${tab.pageContent?.length ?? 0}`);
      if (tab.pageContent) {
        console.log(`[Background] Tab ${index + 1} content preview:`, tab.pageContent.substring(0, 500));
      }
    });

    // 构建包含页面上下文的消息
    const messagesWithContext = buildMessagesWithContext(messages, selectedTabs);
    console.log('[Background] Messages with context:', JSON.stringify(messagesWithContext, null, 2));

    try {
      await streamChat({
        messages: messagesWithContext.map(m => ({
          id: crypto.randomUUID(),
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: Date.now(),
        })),
        onChunk: (chunk) => {
          console.log('[Background] Received chunk:', chunk.substring(0, 50));
          const chunkMessage: AIChatStreamChunk = {
            type: 'ai_chat_chunk',
            chatTabId,
            chunk,
          };
          chrome.runtime.sendMessage(chunkMessage).catch(() => {});
        },
        onComplete: (fullText) => {
          const completeMessage: AIChatComplete = {
            type: 'ai_chat_complete',
            chatTabId,
            fullText,
          };
          chrome.runtime.sendMessage(completeMessage).catch(() => {});
        },
        onError: (error) => {
          const errorMessage: AIChatError = {
            type: 'ai_chat_error',
            chatTabId,
            error: error.message,
          };
          chrome.runtime.sendMessage(errorMessage).catch(() => {});
        },
      });
    } catch (error) {
      const errorMessage: AIChatError = {
        type: 'ai_chat_error',
        chatTabId,
        error: error instanceof Error ? error.message : String(error),
      };
      chrome.runtime.sendMessage(errorMessage).catch(() => {});
    }
  }
});
