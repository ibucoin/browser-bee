import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store.tsx';

export function Header() {
  const { state, clearChat } = useChatStore();

  const handleNewChat = () => {
    if (state.activeTabId !== null) {
      clearChat(state.activeTabId);
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
