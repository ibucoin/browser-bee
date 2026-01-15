import { useEffect, useRef, useState, useMemo } from 'react';
import { Message } from './Message';
import { useChatStore } from '@/lib/chat-store.tsx';
import { TabInfo, ElementInfo } from '@/lib/types';
import { Globe, ChevronDown, ChevronUp, Settings, AlertCircle, MousePointer2 } from 'lucide-react';
import { AIConfigStore, getAIConfigStore } from '@/lib/ai-config';
import { Button } from '@/components/ui/button';

interface ChatContainerProps {
  isLoading?: boolean;
}

// 比较两个标签页数组是否相同
function isSameTabGroup(tabs1?: TabInfo[], tabs2?: TabInfo[]): boolean {
  if (!tabs1 && !tabs2) return true;
  if (!tabs1 || !tabs2) return false;
  if (tabs1.length !== tabs2.length) return false;
  const ids1 = tabs1.map(t => t.id).sort();
  const ids2 = tabs2.map(t => t.id).sort();
  return ids1.every((id, i) => id === ids2[i]);
}

// 比较两个元素数组是否相同
function isSameElementGroup(elements1?: ElementInfo[], elements2?: ElementInfo[]): boolean {
  if (!elements1 && !elements2) return true;
  if (!elements1 || !elements2) return false;
  if (elements1.length !== elements2.length) return false;
  const ids1 = elements1.map(e => e.id).sort();
  const ids2 = elements2.map(e => e.id).sort();
  return ids1.every((id, i) => id === ids2[i]);
}

// 比较整体上下文是否相同
function isSameContext(
  tabs1?: TabInfo[], elements1?: ElementInfo[],
  tabs2?: TabInfo[], elements2?: ElementInfo[]
): boolean {
  return isSameTabGroup(tabs1, tabs2) && isSameElementGroup(elements1, elements2);
}

// 单个标签页卡片（紧凑版本）
function TabCard({ tab }: { tab: TabInfo }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/80 px-3 py-2 shadow-sm">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-background overflow-hidden">
        {tab.favicon ? (
          <img src={tab.favicon} alt="" className="h-5 w-5" />
        ) : (
          <Globe className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground max-w-[140px]">{tab.title}</p>
        <p className="text-xs text-muted-foreground">{tab.hostname}</p>
      </div>
    </div>
  );
}

// 标签页组显示组件（右对齐，显示在用户消息上方）
function TabGroupIndicator({ tabs }: { tabs: TabInfo[] }) {
  const [expanded, setExpanded] = useState(false);
  const showCollapsed = tabs.length > 3;
  const displayTabs = useMemo(
    () => (showCollapsed && !expanded ? tabs.slice(0, 3) : tabs),
    [tabs, showCollapsed, expanded]
  );
  const remainingCount = tabs.length - 3;

  return (
    <div className="flex flex-col items-end gap-1 mb-1">
      {displayTabs.map((tab) => (
        <TabCard key={tab.id} tab={tab} />
      ))}
      {showCollapsed && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 rounded-xl bg-muted/80 px-3 py-2 text-xs text-muted-foreground hover:bg-muted shadow-sm"
        >
          +{remainingCount} 个标签页
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
      {showCollapsed && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="h-3 w-3" />
          收起
        </button>
      )}
    </div>
  );
}

// 单个元素卡片（紧凑版本）
function ElementCard({ element }: { element: ElementInfo }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 px-3 py-2 shadow-sm">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-background overflow-hidden">
        <MousePointer2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground max-w-[140px]">
          &lt;{element.tagName}&gt;
        </p>
        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
          {element.textContent.slice(0, 30) || element.selector}
        </p>
      </div>
    </div>
  );
}

// 上下文指示器组件（显示标签页和元素）
function ContextIndicator({ tabs, elements }: { tabs?: TabInfo[]; elements?: ElementInfo[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasTabs = tabs && tabs.length > 0;
  const hasElements = elements && elements.length > 0;
  
  if (!hasTabs && !hasElements) return null;
  
  const totalItems = (tabs?.length ?? 0) + (elements?.length ?? 0);
  const showCollapsed = totalItems > 3;
  
  const displayTabs = useMemo(
    () => (showCollapsed && !expanded ? (tabs ?? []).slice(0, 3) : (tabs ?? [])),
    [tabs, showCollapsed, expanded]
  );
  const displayElements = useMemo(
    () => (showCollapsed && !expanded ? (elements ?? []).slice(0, Math.max(0, 3 - (tabs?.length ?? 0))) : (elements ?? [])),
    [elements, tabs, showCollapsed, expanded]
  );
  const remainingCount = totalItems - 3;

  return (
    <div className="flex flex-col items-end gap-1 mb-1">
      {displayTabs.map((tab) => (
        <TabCard key={`tab-${tab.id}`} tab={tab} />
      ))}
      {displayElements.map((element) => (
        <ElementCard key={`el-${element.id}`} element={element} />
      ))}
      {showCollapsed && !expanded && remainingCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 rounded-xl bg-muted/80 px-3 py-2 text-xs text-muted-foreground hover:bg-muted shadow-sm"
        >
          +{remainingCount} 个上下文
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
      {showCollapsed && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="h-3 w-3" />
          收起
        </button>
      )}
    </div>
  );
}

export function ChatContainer({ isLoading }: ChatContainerProps) {
  const { getCurrentChat } = useChatStore();
  const chat = getCurrentChat();
  const messages = chat?.messages ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string>('');
  const prevMessageCountRef = useRef<number>(0);
  
  // 检查是否配置了 provider
  const [configStatus, setConfigStatus] = useState<{
    hasProvider: boolean;
    hasApiKey: boolean;
    hasModels: boolean;
    providerName?: string;
  }>({ hasProvider: false, hasApiKey: false, hasModels: false });

  useEffect(() => {
    const checkConfig = async () => {
      const store = await getAIConfigStore();
      const activePlatform = store.platforms.find(p => p.id === store.activePlatformId);
      
      setConfigStatus({
        hasProvider: !!activePlatform,
        hasApiKey: !!activePlatform?.apiKey,
        hasModels: (activePlatform?.models.length ?? 0) > 0,
        providerName: activePlatform?.name,
      });
    };
    
    checkConfig();
    
    // 监听 storage 变化
    const handleStorageChange = () => checkConfig();
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // 用户发送消息后滚动到底部（消息数量增加时）
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // AI 消息输出时滚动到底部（内容变化时）
  useEffect(() => {
    if (!isLoading) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content !== lastMessageRef.current) {
      lastMessageRef.current = lastMessage.content;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // 未配置 provider 的提醒
  const renderConfigWarning = () => {
    if (!configStatus.hasProvider) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">未配置 AI 服务</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              请先在设置中配置 API 服务才能开始对话
            </p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            <Settings className="h-4 w-4" />
            打开设置
          </Button>
        </div>
      );
    }

    if (!configStatus.hasApiKey) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">未配置 API Key</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              请为 <span className="font-medium">{configStatus.providerName}</span> 配置 API Key
            </p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            <Settings className="h-4 w-4" />
            打开设置
          </Button>
        </div>
      );
    }

    if (!configStatus.hasModels) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">未选择模型</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              请为 <span className="font-medium">{configStatus.providerName}</span> 选择至少一个模型
            </p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            <Settings className="h-4 w-4" />
            打开设置
          </Button>
        </div>
      );
    }

    return null;
  };

  // 配置不完整时显示警告
  const configWarning = renderConfigWarning();
  if (configWarning && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        {configWarning}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        开始新的对话...
      </div>
    );
  }

  // 追踪上下文变动
  let lastTabs: TabInfo[] | undefined = undefined;
  let lastElements: ElementInfo[] | undefined = undefined;

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {messages.map((message) => {
          // 在用户消息前显示上下文（第一次或变动时）
          let showContext = false;
          const hasTabs = message.attachedTabs && message.attachedTabs.length > 0;
          const hasElements = message.attachedElements && message.attachedElements.length > 0;
          
          if (message.role === 'user' && (hasTabs || hasElements)) {
            if (!isSameContext(message.attachedTabs, message.attachedElements, lastTabs, lastElements)) {
              showContext = true;
            }
            lastTabs = message.attachedTabs;
            lastElements = message.attachedElements;
          }

          return (
            <div key={message.id}>
              {showContext && (
                <ContextIndicator tabs={message.attachedTabs} elements={message.attachedElements} />
              )}
              <Message
                role={message.role as 'user' | 'assistant'}
                content={message.content}
                attachedImages={message.attachedImages}
              />
            </div>
          );
        })}
        {/* AI 响应中的 loading 指示器 */}
        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">生成回复中</span>
          </div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
