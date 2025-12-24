import { useEffect } from 'react';
import { Header } from '@/components/header/Header';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatStoreProvider, useChatStore } from '@/lib/chat-store.tsx';
import { TabEventMessage, TabInfo } from '@/lib/types';

function AppContent() {
  const { setActiveTab, initTabChat, removeTabChat, updateTabInfo, state } = useChatStore();

  useEffect(() => {
    // 初始化时获取当前活动 Tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        const tabInfo: TabInfo = {
          id: activeTab.id,
          title: activeTab.title || '未命名标签页',
          url: activeTab.url || '',
          favicon: activeTab.favIconUrl,
          hostname: activeTab.url ? new URL(activeTab.url).hostname : '',
        };
        setActiveTab(activeTab.id);
        initTabChat(activeTab.id, [tabInfo], activeTab.id);
      }
    });

    // 监听来自 Background 的 Tab 事件消息
    const handleMessage = (message: TabEventMessage) => {
      if (message.type === 'activated') {
        setActiveTab(message.tabId);
        // 如果该 Tab 的聊天不存在，则初始化
        if (!state.chats[message.tabId]) {
          chrome.tabs.get(message.tabId, (tab) => {
            if (chrome.runtime.lastError) return;
            const tabInfo: TabInfo = {
              id: tab.id || message.tabId,
              title: tab.title || '未命名标签页',
              url: tab.url || '',
              favicon: tab.favIconUrl,
              hostname: tab.url ? new URL(tab.url).hostname : '',
            };
            initTabChat(message.tabId, [tabInfo], message.tabId);
          });
        }
      } else if (message.type === 'removed') {
        removeTabChat(message.tabId);
      } else if (message.type === 'updated' && message.tabInfo) {
        // Tab 更新时，全局更新所有匹配的 TabInfo
        updateTabInfo(message.tabInfo, message.urlChanged ?? false);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [setActiveTab, initTabChat, removeTabChat, updateTabInfo, state.chats]);

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 overflow-y-auto p-3">
        <ChatContainer />
      </div>
      <ChatInput />
    </div>
  );
}

function App() {
  return (
    <ChatStoreProvider>
      <AppContent />
    </ChatStoreProvider>
  );
}

export default App;
