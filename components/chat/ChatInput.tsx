import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Globe, Image, LayoutGrid, Plus } from 'lucide-react';
import { PageCard } from '@/components/page-card/PageCard';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/lib/chat-store.tsx';
import { TabInfo, Message, AIChatRequest, AIChatStreamChunk, AIChatComplete, AIChatError } from '@/lib/types';

export function ChatInput() {
  const { getCurrentChat, setSelectedTabs, addMessage, updateLastMessage, state } = useChatStore();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const streamingContentRef = useRef('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [browserActiveTabId, setBrowserActiveTabId] = useState<number | null>(null);
  const [totalTabCount, setTotalTabCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);

  const chat = getCurrentChat();
  const selectedTabs = chat?.selectedTabs ?? [];
  const activeTabId = state.activeTabId;

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
          const hostname = url ? new URL(url).hostname : '';
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
        setIsLoading(false);
        streamingContentRef.current = '';
      } else if (message.type === 'ai_chat_error') {
        setIsLoading(false);
        streamingContentRef.current = '';
        updateLastMessage(activeTabId!, `错误: ${message.error}`);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [activeTabId, updateLastMessage]);

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

  const handleSend = () => {
    console.log('[ChatInput] handleSend called, message:', message, 'activeTabId:', activeTabId, 'isLoading:', isLoading);
    if (!message.trim() || activeTabId === null || isLoading) {
      console.log('[ChatInput] Blocked: empty message or no activeTabId or loading');
      return;
    }

    console.log('[ChatInput] Sending message:', message.trim());

    const chat = getCurrentChat();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
      attachedTabs: selectedTabs.length > 0 ? [...selectedTabs] : undefined,
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
    };
    console.log('[ChatInput] Sending request to background:', request);
    chrome.runtime.sendMessage(request, (response) => {
      console.log('[ChatInput] Got response from background:', response);
      if (chrome.runtime.lastError) {
        console.error('[ChatInput] Error sending message:', chrome.runtime.lastError);
      }
    });

    setIsLoading(true);
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
            placeholder="输入消息..."
            rows={1}
            className="w-full resize-none bg-transparent px-2 py-2 text-base focus:outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex items-center gap-2">
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
