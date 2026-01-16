import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store.tsx';
import { safeGetHostname } from '@/lib/utils';

export function Header() {
  const { state, clearChat } = useChatStore();

  const handleNewChat = async () => {
    if (state.activeTabId !== null) {
      // 获取当前浏览器活动标签页信息
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id && activeTab.url) {
        const boundTab = {
          id: activeTab.id,
          title: activeTab.title || '未命名标签页',
          url: activeTab.url,
          favicon: activeTab.favIconUrl,
          hostname: safeGetHostname(activeTab.url),
        };
        clearChat(state.activeTabId, boundTab);
      } else {
        clearChat(state.activeTabId);
      }
    }
  };

  const handleSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <header className="flex items-center justify-between px-2 py-1.5">
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewChat} title="新建对话">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSettings} title="设置">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
