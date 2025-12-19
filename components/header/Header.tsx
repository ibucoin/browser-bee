import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pin, PinOff, Settings, X } from 'lucide-react';

export function Header() {
  const [isPinned, setIsPinned] = useState(false);

  const handleNewChat = () => {
    // TODO: 实现新建对话
  };

  const handleTogglePin = () => {
    setIsPinned(!isPinned);
    // TODO: 实现固定/取消固定
  };

  const handleSettings = () => {
    // TODO: 打开设置页面
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <header className="flex items-center justify-between px-2 py-1.5">
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewChat} title="新建对话">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTogglePin} title={isPinned ? '取消固定' : '固定'}>
          {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSettings} title="设置">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose} title="关闭">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
