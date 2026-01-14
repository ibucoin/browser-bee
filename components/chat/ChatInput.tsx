import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Globe, Image, LayoutGrid, Plus, Square } from 'lucide-react';
import { PageCard } from '@/components/page-card/PageCard';
import { Button } from '@/components/ui/button';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { useChatStore } from '@/lib/chat-store.tsx';
import { safeGetHostname } from '@/lib/utils';
import { getAIConfigStore } from '@/lib/ai-config';
import { TabInfo, Message, AIChatRequest, AIChatStreamChunk, AIChatComplete, AIChatError, AIChatAbort, ContentExtractRequest, ContentExtractResponse } from '@/lib/types';

// 请求提取标签页内容
async function extractTabContent(tabId: number): Promise<{ success: boolean; content?: string; error?: string }> {
  return new Promise((resolve) => {
    const request: ContentExtractRequest = {
      type: 'content_extract_request',
      tabId,
    };
    chrome.runtime.sendMessage(request, (response: ContentExtractResponse) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      if (response?.success) {
        resolve({ success: true, content: response.content });
      } else {
        resolve({ success: false, error: response?.error || '提取失败' });
      }
    });
  });
}

export function ChatInput() {
  const { getCurrentChat, setSelectedTabs, addMessage, updateLastMessage, updateTabContent, setLoading, isCurrentTabLoading, state } = useChatStore();
  const [message, setMessage] = useState('');
  const isLoading = isCurrentTabLoading();
  const streamingContentRef = useRef('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [browserActiveTabId, setBrowserActiveTabId] = useState<number | null>(null);
  const [totalTabCount, setTotalTabCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  
  // 检查配置状态
  const [isConfigured, setIsConfigured] = useState(true);

  const chat = getCurrentChat();
  const selectedTabs = chat?.selectedTabs ?? [];
  const activeTabId = state.activeTabId;

  // 检查是否已配置 provider
  useEffect(() => {
    const checkConfig = async () => {
      const store = await getAIConfigStore();
      const activePlatform = store.platforms.find(p => p.id === store.activePlatformId);
      const hasApiKey = !!activePlatform?.apiKey;
      const hasModels = (activePlatform?.models.length ?? 0) > 0;
      setIsConfigured(!!activePlatform && hasApiKey && hasModels);
    };
    
    checkConfig();
    
    // 监听 storage 变化
    const handleStorageChange = () => checkConfig();
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const loadTabs = () => {
    chrome.tabs.query({ currentWindow: true }, (chromeTabs) => {
      setTotalTabCount(chromeTabs.length);
      const normalizedTabs = chromeTabs
        .filter((tab) => Boolean(tab.url))
        .map((tab) => {
          const url = tab.url || '';
          const hostname = safeGetHostname(url);
          return {
            id: tab.id || 0,
            title: tab.title || '未命名标签页',
            url,
            favicon: tab.favIconUrl,
            hostname,
          };
        });
      const activeTab = chromeTabs.find((tab) => tab.active);
      setBrowserActiveTabId(activeTab?.id ?? null);
      setTabs(normalizedTabs);
    });
  };

  useEffect(() => {
    loadTabs();
  }, []);

  // 监听来自 background 的 AI 响应消息
  useEffect(() => {
    const handleMessage = (message: AIChatStreamChunk | AIChatComplete | AIChatError) => {
      if (message.chatTabId !== activeTabId) return;

      if (message.type === 'ai_chat_chunk') {
        streamingContentRef.current += message.chunk;
        updateLastMessage(activeTabId!, streamingContentRef.current);
      } else if (message.type === 'ai_chat_complete') {
        setLoading(activeTabId!, false);
        streamingContentRef.current = '';
      } else if (message.type === 'ai_chat_error') {
        setLoading(activeTabId!, false);
        streamingContentRef.current = '';
        updateLastMessage(activeTabId!, `错误: ${message.error}`);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [activeTabId, updateLastMessage, setLoading]);

  useEffect(() => {
    if (!showAttachMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (attachMenuRef.current?.contains(target)) return;
      if (attachButtonRef.current?.contains(target)) return;
      setShowAttachMenu(false);
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAttachMenu]);

  const getTabKey = (tab: TabInfo) => tab.url || `id:${tab.id}`;

  const handleAddTab = (tab: TabInfo) => {
    if (activeTabId === null) return;
    const newKey = getTabKey(tab);
    const exists = selectedTabs.some((item) => getTabKey(item) === newKey);
    if (exists) return;

    // 只添加 Tab 到列表，不立即提取内容（发送时再提取）
    setSelectedTabs(activeTabId, [...selectedTabs, tab]);
  };

  const handleRemoveTab = (tab: TabInfo) => {
    if (activeTabId === null) return;
    const removeKey = getTabKey(tab);
    setSelectedTabs(
      activeTabId,
      selectedTabs.filter((item) => getTabKey(item) !== removeKey)
    );
  };

  const handleSend = async () => {
    console.log('[ChatInput] handleSend called, message:', message, 'activeTabId:', activeTabId, 'isLoading:', isLoading, 'isConfigured:', isConfigured);
    if (!message.trim() || activeTabId === null || isLoading || !isConfigured) {
      console.log('[ChatInput] Blocked: empty message or no activeTabId or loading or not configured');
      return;
    }

    setLoading(activeTabId, true);
    const userMessageContent = message.trim();
    setMessage('');

    console.log('[ChatInput] Sending message:', userMessageContent);

    const chat = getCurrentChat();
    const currentSelectedTabs = chat?.selectedTabs ?? [];

    // 发送前提取所有未提取内容的标签页
    const tabsNeedingContent = currentSelectedTabs.filter((tab) => !tab.pageContent);
    console.log('[ChatInput] Tabs needing content extraction:', tabsNeedingContent.length);
    console.log('[ChatInput] Current selected tabs:', currentSelectedTabs.map(t => ({ id: t.id, title: t.title, hasContent: Boolean(t.pageContent) })));

    // 收集提取结果，用于直接构建最终的 selectedTabs
    const extractedContentMap: Record<number, string> = {};

    if (tabsNeedingContent.length > 0) {
      console.log('[ChatInput] Extracting content for tabs:', tabsNeedingContent.map(t => t.title));
      const extractPromises = tabsNeedingContent.map(async (tab) => {
        console.log('[ChatInput] Starting extraction for tab:', tab.id, tab.title);
        const result = await extractTabContent(tab.id);
        console.log('[ChatInput] Extraction result for tab', tab.id, ':', {
          success: result.success,
          contentLength: result.content?.length ?? 0,
          error: result.error,
          contentPreview: result.content?.substring(0, 300)
        });
        if (result.success && result.content) {
          // 保存到本地 map 中，同时更新 store
          extractedContentMap[tab.id] = result.content;
          updateTabContent(activeTabId, tab.id, result.content);
          return { tabId: tab.id, content: result.content };
        }
        return { tabId: tab.id, content: null };
      });
      await Promise.all(extractPromises);
    }

    // 直接基于 currentSelectedTabs 和提取结果构建最终的 tabs 列表
    // 不依赖 store 的异步更新
    const updatedSelectedTabs = currentSelectedTabs.map(tab => {
      // 如果本次提取了新内容，使用新内容；否则保留原有的 pageContent
      const newContent = extractedContentMap[tab.id];
      if (newContent) {
        return { ...tab, pageContent: newContent };
      }
      return tab;
    });
    console.log('[ChatInput] Updated selected tabs after extraction:', updatedSelectedTabs.map(t => ({
      id: t.id,
      title: t.title,
      hasContent: Boolean(t.pageContent),
      contentLength: t.pageContent?.length ?? 0
    })));

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
      attachedTabs: updatedSelectedTabs.length > 0 ? [...updatedSelectedTabs] : undefined,
    };
    addMessage(activeTabId, userMessage);

    // 创建空的 assistant 消息用于流式更新
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(activeTabId, assistantMessage);

    // 发送 AI 请求到 background
    const allMessages = [...(chat?.messages ?? []), userMessage];
    const request: AIChatRequest = {
      type: 'ai_chat_request',
      chatTabId: activeTabId,
      messages: allMessages,
      selectedTabs: updatedSelectedTabs,
    };
    console.log('[ChatInput] Sending request to background:', request);
    chrome.runtime.sendMessage(request, (response) => {
      console.log('[ChatInput] Got response from background:', response);
      if (chrome.runtime.lastError) {
        console.error('[ChatInput] Error sending message:', chrome.runtime.lastError);
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAbort = () => {
    if (activeTabId === null) return;
    const abortMessage: AIChatAbort = {
      type: 'ai_chat_abort',
      chatTabId: activeTabId,
    };
    chrome.runtime.sendMessage(abortMessage);
    setLoading(activeTabId, false);
    streamingContentRef.current = '';
  };

  const orderedTabs = [
    ...tabs.filter((tab) => tab.id === browserActiveTabId),
    ...tabs.filter((tab) => tab.id !== browserActiveTabId),
  ];

  return (
    <div className="p-3">
      <div className="relative flex flex-col rounded-2xl border border-input bg-background py-1">
        <div className="flex flex-nowrap gap-2 overflow-x-auto overflow-y-visible px-3 pt-2 pb-1">
          {selectedTabs.map((tab) => (
            <PageCard
              key={getTabKey(tab)}
              title={tab.title}
              url={tab.url}
              favicon={tab.favicon}
              pageContent={tab.pageContent}
              onClose={() => handleRemoveTab(tab)}
            />
          ))}
        </div>
        <div className="px-3">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConfigured ? "输入消息..." : "请先配置 AI 服务..."}
            rows={1}
            disabled={!isConfigured}
            className="w-full resize-none bg-transparent px-2 py-2 text-base focus:outline-none placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Button
                  type="button"
                  onClick={handleAbort}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  aria-label="停止生成"
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!showAttachMenu) {
                        loadTabs();
                      }
                      setShowAttachMenu((prev) => !prev);
                    }}
                    variant="outline"
                    size="icon"
                    ref={attachButtonRef}
                    className="rounded-full"
                    aria-label="添加内容"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    aria-label="添加图片"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <ModelSelector />
          </div>
        </div>
        {showAttachMenu ? (
          <div
            ref={attachMenuRef}
            className="absolute bottom-full left-0 right-0 z-10 mb-2 overflow-visible rounded-xl border border-input bg-background p-3 shadow-lg"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-muted/60">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium text-foreground">
                All open tabs ({totalTabCount})
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {orderedTabs.map((tab) => (
                <button
                  key={getTabKey(tab)}
                  type="button"
                  onClick={() => handleAddTab(tab)}
                  className="flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted/60"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/40 p-1 overflow-hidden">
                    {tab.favicon ? (
                      <img src={tab.favicon} alt="" className="h-4 w-4 rounded-full" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm font-medium text-foreground truncate">
                    {tab.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
