import { useState, useEffect } from 'react';
import { Sliders, Moon, Sun, Monitor, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

interface GeneralConfig {
  theme: Theme;
  autoExtractContent: boolean;
  maxContextLength: number;
}

const DEFAULT_CONFIG: GeneralConfig = {
  theme: 'system',
  autoExtractContent: true,
  maxContextLength: 50000,
};

const STORAGE_KEY = 'general-config';

export function GeneralSettings() {
  const [config, setConfig] = useState<GeneralConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 加载配置
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (result[STORAGE_KEY]) {
        setConfig({ ...DEFAULT_CONFIG, ...result[STORAGE_KEY] });
      }
      setLoading(false);
    });
  }, []);

  const updateConfig = async (updates: Partial<GeneralConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await chrome.storage.local.set({ [STORAGE_KEY]: newConfig });

    // 应用主题
    if (updates.theme) {
      applyTheme(updates.theme);
    }
  };

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  // 初始化时应用主题
  useEffect(() => {
    if (!loading) {
      applyTheme(config.theme);
    }
  }, [loading]);

  const handleClearChatHistory = async () => {
    if (confirm('确定要清空所有聊天记录吗？此操作不可撤销。')) {
      // 清空聊天记录（这里只是示例，实际需要根据 chat-store 的实现来处理）
      await chrome.storage.local.remove(['chat-history']);
      alert('聊天记录已清空');
    }
  };

  const handleResetSettings = async () => {
    if (confirm('确定要重置所有设置吗？')) {
      await chrome.storage.local.remove([STORAGE_KEY, 'ai-config-store', 'shortcut-config']);
      setConfig(DEFAULT_CONFIG);
      applyTheme(DEFAULT_CONFIG.theme);
      alert('设置已重置，请刷新页面');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-lg font-medium">
        <Sliders className="h-5 w-5" />
        通用设置
      </div>

      {/* 主题设置 */}
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="text-sm font-medium">外观</h3>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">主题模式</label>
          <div className="flex gap-2">
            {[
              { value: 'light' as Theme, icon: Sun, label: '浅色' },
              { value: 'dark' as Theme, icon: Moon, label: '深色' },
              { value: 'system' as Theme, icon: Monitor, label: '跟随系统' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => updateConfig({ theme: value })}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
                  config.theme === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted hover:border-muted-foreground/50 hover:bg-muted/50"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容提取设置 */}
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="text-sm font-medium">内容提取</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm">自动提取页面内容</label>
            <p className="text-xs text-muted-foreground">
              发送消息时自动提取标签页的页面内容
            </p>
          </div>
          <Switch
            checked={config.autoExtractContent}
            onCheckedChange={(checked) => updateConfig({ autoExtractContent: checked })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">最大上下文长度</label>
          <select
            value={config.maxContextLength}
            onChange={(e) => updateConfig({ maxContextLength: Number(e.target.value) })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value={10000}>10,000 字符</option>
            <option value={30000}>30,000 字符</option>
            <option value={50000}>50,000 字符（默认）</option>
            <option value={100000}>100,000 字符</option>
            <option value={200000}>200,000 字符</option>
          </select>
          <p className="text-xs text-muted-foreground">
            限制发送给 AI 的页面内容长度，过长可能导致响应变慢或失败
          </p>
        </div>
      </div>

      {/* 数据管理 */}
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="text-sm font-medium">数据管理</h3>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm">清空聊天记录</label>
              <p className="text-xs text-muted-foreground">
                删除所有对话历史
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChatHistory}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              清空
            </Button>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm">重置所有设置</label>
                <p className="text-xs text-muted-foreground">
                  恢复到默认设置（包括 AI 配置和快捷方式）
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSettings}
                className="text-destructive hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                重置
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 关于 */}
      <div className="rounded-lg border p-4 space-y-2">
        <h3 className="text-sm font-medium">关于</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>BrowserBee - AI 浏览器助手</p>
          <p>版本: 0.1.0</p>
        </div>
      </div>
    </div>
  );
}
