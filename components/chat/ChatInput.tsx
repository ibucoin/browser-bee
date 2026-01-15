import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Globe, LayoutGrid, Plus, Square, MousePointer2 } from 'lucide-react';
import { PageCard } from '@/components/page-card/PageCard';
import { ElementCard } from '@/components/element-card/ElementCard';
import { Button } from '@/components/ui/button';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { SHORTCUT_SEND_EVENT } from '@/components/chat/ShortcutBar';
import { useChatStore } from '@/lib/chat-store.tsx';
import { safeGetHostname } from '@/lib/utils';
import { getAIConfigStore } from '@/lib/ai-config';
import { TabInfo, Message, AIChatRequest, AIChatStreamChunk, AIChatComplete, AIChatError, AIChatAbort, ContentExtractRequest, ContentExtractResponse, ElementInfo, ElementPickRequest, ElementPickResponse, ElementPickCancel } from '@/lib/types';

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
  
  // 选中的元素列表
  const [selectedElements, setSelectedElements] = useState<ElementInfo[]>([]);
  // 元素选择器状态
  const [isPickingElement, setIsPickingElement] = useState(false);
  // 用于去重：记录最近处理的元素ID
  const lastProcessedElementIdRef = useRef<string | null>(null);
  // 用于快捷方式调用：存储最新的 handleSend 函数
  const handleSendRef = useRef<(msg?: string) => void>(() => {});

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

  // 监听标签页切换，更新 browserActiveTabId 并停止旧页面的选择器
  useEffect(() => {
    const handleTabMessage = (message: { type: string; tabId?: number }) => {
      if (message.type === 'activated' && message.tabId) {
        // 如果正在选择元素，先停止旧标签页的选择器
        if (isPickingElement && browserActiveTabId !== null && browserActiveTabId !== message.tabId) {
          chrome.tabs.sendMessage(browserActiveTabId, { type: 'element_pick_stop' }).catch(() => {});
        }
        setBrowserActiveTabId(message.tabId);
        // 切换标签页时重置选择器状态
        setIsPickingElement(false);
      }
    };
    chrome.runtime.onMessage.addListener(handleTabMessage);
    return () => chrome.runtime.onMessage.removeListener(handleTabMessage);
  }, [isPickingElement, browserActiveTabId]);

  // 监听快捷操作事件
  useEffect(() => {
    const handleShortcutSend = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        handleSendRef.current(customEvent.detail);
      }
    };
    window.addEventListener(SHORTCUT_SEND_EVENT, handleShortcutSend);
    return () => window.removeEventListener(SHORTCUT_SEND_EVENT, handleShortcutSend);
  }, []);

  // 监听来自 background 的 AI 响应消息
  useEffect(() => {
    const handleMessage = (message: AIChatStreamChunk | AIChatComplete | AIChatError | ElementPickResponse | ElementPickCancel) => {
      // 处理元素选择响应
      if (message.type === 'element_pick_response') {
        setIsPickingElement(false);
        if (message.success && message.element && browserActiveTabId !== null) {
          // 去重：检查是否已经处理过这个元素
          const elementId = message.element.id;
          if (lastProcessedElementIdRef.current === elementId) {
            console.log('[ChatInput] Duplicate element response ignored:', elementId);
            return;
          }
          lastProcessedElementIdRef.current = elementId;
          
          // 获取当前标签页信息来填充元素的 tab 信息
          chrome.tabs.get(browserActiveTabId, (tab) => {
            if (chrome.runtime.lastError || !tab) return;
            
            const elementInfo: ElementInfo = {
              ...message.element!,
              tabId: browserActiveTabId,
              tabTitle: tab.title || '未知页面',
              tabUrl: tab.url || '',
            };
            setSelectedElements(prev => [...prev, elementInfo]);
            
            // 如果该标签页不在 selectedTabs 中，自动添加
            if (activeTabId !== null) {
              const tabInfo: TabInfo = {
                id: browserActiveTabId,
                title: tab.title || '未命名标签页',
                url: tab.url || '',
                favicon: tab.favIconUrl,
                hostname: safeGetHostname(tab.url || ''),
              };
              const exists = selectedTabs.some(t => t.id === browserActiveTabId || t.url === tab.url);
              if (!exists) {
                setSelectedTabs(activeTabId, [...selectedTabs, tabInfo]);
              }
            }
          });
        }
        return;
      }
      
      if (message.type === 'element_pick_cancel') {
        setIsPickingElement(false);
        return;
      }

      if ((message as AIChatStreamChunk).chatTabId !== activeTabId) return;

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
  }, [activeTabId, browserActiveTabId, selectedTabs, updateLastMessage, setLoading, setSelectedTabs]);

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

  // 处理移除选中的元素
  const handleRemoveElement = (elementId: string) => {
    setSelectedElements(prev => prev.filter(el => el.id !== elementId));
  };

  // 处理点击选择元素按钮
  const handlePickElement = async () => {
    if (browserActiveTabId === null || isPickingElement) return;
    
    setIsPickingElement(true);
    setShowAttachMenu(false);
    
    const request: ElementPickRequest = {
      type: 'element_pick_request',
      tabId: browserActiveTabId,
    };
    
    chrome.runtime.sendMessage(request, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[ChatInput] Element pick error:', chrome.runtime.lastError);
        setIsPickingElement(false);
      }
    });
  };

  const handleSend = async (messageToSend?: string) => {
    const contentToSend = messageToSend ?? message.trim();
    console.log('[ChatInput] handleSend called, message:', contentToSend, 'activeTabId:', activeTabId, 'isLoading:', isLoading, 'isConfigured:', isConfigured);
    if (!contentToSend || activeTabId === null || isLoading || !isConfigured) {
      console.log('[ChatInput] Blocked: empty message or no activeTabId or loading or not configured');
      return;
    }

    setLoading(activeTabId, true);
    const userMessageContent = contentToSend;
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
      attachedElements: selectedElements.length > 0 ? [...selectedElements] : undefined,
    };
    addMessage(activeTabId, userMessage);
    
    // 保存选中元素用于发送请求（发送前保存，因为后面会清空）
    const elementsToSend = [...selectedElements];
    
    // 清空已选元素（发送后清空）
    setSelectedElements([]);

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
      selectedElements: elementsToSend.length > 0 ? elementsToSend : undefined,
    };
    console.log('[ChatInput] Sending request to background:', request);
    chrome.runtime.sendMessage(request, (response) => {
      console.log('[ChatInput] Got response from background:', response);
      if (chrome.runtime.lastError) {
        console.error('[ChatInput] Error sending message:', chrome.runtime.lastError);
      }
    });
  };

  // 更新 ref 以便快捷方式可以调用最新的 handleSend
  handleSendRef.current = handleSend;

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
          {/* 已选择的标签页 */}
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
          {/* 已选择的元素 */}
          {selectedElements.map((element) => (
            <ElementCard
              key={element.id}
              element={element}
              onClose={() => handleRemoveElement(element.id)}
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
                    onClick={handlePickElement}
                    disabled={isPickingElement || browserActiveTabId === null}
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    aria-label="选择页面元素"
                    title="选择页面元素"
                  >
                    <MousePointer2 className={`h-4 w-4 ${isPickingElement ? 'animate-pulse text-purple-500' : ''}`} />
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ModelSelector />
            </div>
          </div>
        </div>
        {showAttachMenu ? (
          <div
            ref={attachMenuRef}
            className="absolute bottom-full left-0 right-0 z-10 mb-2 overflow-visible rounded-xl border border-input bg-background p-3 shadow-lg"
          >
            {/* 选择元素按钮 */}
            <button
              type="button"
              onClick={handlePickElement}
              disabled={isPickingElement || browserActiveTabId === null}
              className="flex w-full items-center gap-2 rounded-md px-1 py-2 text-left hover:bg-muted/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-purple-100 dark:bg-purple-900/50">
                <MousePointer2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">
                  {isPickingElement ? '选择中...' : '选择页面元素'}
                </div>
                <div className="text-xs text-muted-foreground">
                  点击页面上的元素添加为上下文
                </div>
              </div>
            </button>

            <div className="my-2 border-t border-input" />

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
