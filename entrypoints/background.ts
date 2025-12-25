import { TabEventMessage, TabInfo, AIChatRequest, AIChatStreamChunk, AIChatComplete, AIChatError } from '@/lib/types';
import { streamChat } from '@/lib/ai-service';

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

  // 监听 AI 聊天请求
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('[Background] Received message:', message);
    if (message.type === 'ai_chat_request') {
      console.log('[Background] Processing AI chat request');
      const request = message as AIChatRequest;
      handleAIChatRequest(request);
      sendResponse({ received: true });
    }
    return true;
  });

  async function handleAIChatRequest(request: AIChatRequest) {
    const { chatTabId, messages } = request;
    console.log('[Background] handleAIChatRequest called with:', { chatTabId, messageCount: messages.length });

    try {
      await streamChat({
        messages,
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
