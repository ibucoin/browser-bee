import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Globe, Image, LayoutGrid, Plus } from 'lucide-react';
import { PageCard } from '@/components/page-card/PageCard';
import { Button } from '@/components/ui/button';

interface TabItem {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  hostname: string;
}

export function ChatInput() {
  const [message, setMessage] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [totalTabCount, setTotalTabCount] = useState(0);
  const [selectedTabs, setSelectedTabs] = useState<TabItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const loadTabs = () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      setTotalTabCount(tabs.length);
      const normalizedTabs = tabs
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
      const activeTab = tabs.find((tab) => tab.active);
      setActiveTabId(activeTab?.id ?? null);
      setTabs(normalizedTabs);
      if (activeTab?.url && selectedTabs.length === 0) {
        const activeTabInfo = normalizedTabs.find((tab) => tab.id === activeTab.id);
        if (activeTabInfo) {
          setSelectedTabs([activeTabInfo]);
        }
      }
    });
  };

  useEffect(() => {
    loadTabs();
  }, []);

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

  const getTabKey = (tab: TabItem) => tab.url || `id:${tab.id}`;

  const handleAddTab = (tab: TabItem) => {
    setSelectedTabs((prev) => {
      const newKey = getTabKey(tab);
      const exists = prev.some((item) => getTabKey(item) === newKey);
      if (exists) return prev;
      return [...prev, tab];
    });
  };

  const handleRemoveTab = (tab: TabItem) => {
    const removeKey = getTabKey(tab);
    setSelectedTabs((prev) => prev.filter((item) => getTabKey(item) !== removeKey));
  };

  const handleSend = () => {
    if (!message.trim()) return;
    // TODO: 实现发送消息
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const orderedTabs = [
    ...tabs.filter((tab) => tab.id === activeTabId),
    ...tabs.filter((tab) => tab.id !== activeTabId),
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
