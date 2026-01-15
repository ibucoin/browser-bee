import { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { Shortcut, getShortcutStore } from '@/lib/shortcut-store';
import { cn } from '@/lib/utils';

interface ShortcutBarProps {
  disabled?: boolean;
}

// 自定义事件名称
export const SHORTCUT_SEND_EVENT = 'shortcut-send-message';

export function ShortcutBar({ disabled }: ShortcutBarProps) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadShortcuts = async () => {
      const store = await getShortcutStore();
      setShortcuts(store.shortcuts);
    };
    loadShortcuts();

    // 监听 storage 变化
    const handleStorageChange = () => loadShortcuts();
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (shortcut: Shortcut) => {
    const messageContent = shortcut.content.trim() || shortcut.title;
    // 触发自定义事件，让 ChatInput 接收并发送
    window.dispatchEvent(new CustomEvent(SHORTCUT_SEND_EVENT, { detail: messageContent }));
    setIsOpen(false);
  };

  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-3 right-3 z-10">
      {/* 悬浮按钮 */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full transition-all shadow-lg',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        title="快捷操作"
      >
        <Zap className="h-5 w-5" />
      </button>

      {/* 弹出菜单 */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full mb-2 right-0 z-20 w-64 max-h-72 overflow-y-auto rounded-lg border bg-background shadow-lg"
        >
          <div className="sticky top-0 bg-background border-b px-3 py-2">
            <span className="text-sm font-medium">
              快捷操作 ({shortcuts.length})
            </span>
          </div>
          <div className="py-1">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => handleSelect(shortcut)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-sm hover:bg-muted text-left"
              >
                <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{shortcut.title}</div>
                  {shortcut.content && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {shortcut.content}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
