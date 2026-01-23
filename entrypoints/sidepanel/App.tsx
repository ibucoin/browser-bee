import { useEffect, useRef } from 'react';
import { Header } from '@/components/header/Header';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ChatInput } from '@/components/chat/ChatInput';
import { ShortcutBar } from '@/components/chat/ShortcutBar';
import { ChatStoreProvider, useChatStore } from '@/lib/chat-store.tsx';
import { safeGetHostname } from '@/lib/utils';
import { TabEventMessage, TabInfo, Attachment } from '@/lib/types';

function AppContent() {
  const { setActiveTab, initTabChat, addAttachment, removeTabChat, updateBoundTab, state } = useChatStore();
  const initialTabCheckedRef = useRef(false);

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
          hostname: safeGetHostname(activeTab.url || ''),
        };
        setActiveTab(activeTab.id);
        initTabChat(activeTab.id, tabInfo);
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
              hostname: safeGetHostname(tab.url || ''),
            };
            initTabChat(message.tabId, tabInfo);
          });
        }
      } else if (message.type === 'removed') {
        removeTabChat(message.tabId);
      } else if (message.type === 'updated' && message.tabInfo) {
        // Tab 更新时，全局更新所有匹配的 TabInfo
        updateBoundTab(message.tabInfo);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [setActiveTab, initTabChat, removeTabChat, updateBoundTab, state.chats]);

  // 检查当前 chat 是否有当前标签页的 tab，如果没有则添加（只在初始化时执行一次）
  useEffect(() => {
    if (state.activeTabId === null) return;
    if (initialTabCheckedRef.current) return; // 只执行一次

    const chat = state.chats[state.activeTabId];
    if (!chat) return;

    initialTabCheckedRef.current = true;

    const hasCurrentTabAttachment = chat.attachments.some(
      a => a.type === 'tab' && a.data.id === state.activeTabId
    );

    if (!hasCurrentTabAttachment) {
      // 获取当前标签页信息并添加
      chrome.tabs.get(state.activeTabId, (tab) => {
        if (chrome.runtime.lastError || !tab || !tab.url) return;
        const tabInfo: TabInfo = {
          id: tab.id || state.activeTabId!,
          title: tab.title || '未命名标签页',
          url: tab.url,
          favicon: tab.favIconUrl,
          hostname: safeGetHostname(tab.url),
        };
        const tabAttachment: Attachment = { type: 'tab', data: tabInfo };
        addAttachment(state.activeTabId!, tabAttachment);
      });
    }
  }, [state.activeTabId, state.chats, addAttachment]);

  // 获取所有 tab 的 loading 状态
  const isTabLoading = (tabId: number) => state.loadingTabIds.has(tabId);

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 overflow-hidden relative">
        {/* 为每个 tab 渲染独立的滚动容器，用 CSS 控制显示/隐藏 */}
        {Object.keys(state.chats).map((tabIdStr) => {
          const tabId = Number(tabIdStr);
          const isActive = tabId === state.activeTabId;
          return (
            <div
              key={tabId}
              className="absolute inset-0 overflow-y-auto p-3"
              style={{ display: isActive ? 'block' : 'none' }}
            >
              <ChatContainer tabId={tabId} isLoading={isTabLoading(tabId)} />
              <ShortcutBar disabled={isTabLoading(tabId)} />
            </div>
          );
        })}
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
