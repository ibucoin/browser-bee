import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    if (confirm(t('confirmClearChat'))) {
      // 清空聊天记录（这里只是示例，实际需要根据 chat-store 的实现来处理）
      await chrome.storage.local.remove(['chat-history']);
      alert(t('chatHistoryCleared'));
    }
  };

  const handleResetSettings = async () => {
    if (confirm(t('confirmResetSettings'))) {
      await chrome.storage.local.remove([STORAGE_KEY, 'ai-config-store', 'shortcut-config']);
      setConfig(DEFAULT_CONFIG);
      applyTheme(DEFAULT_CONFIG.theme);
      alert(t('settingsReset'));
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
        {t('generalSettings')}
      </div>

      {/* 主题设置 */}
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="text-sm font-medium">{t('appearance')}</h3>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">{t('themeMode')}</label>
          <div className="flex gap-2">
            {[
              { value: 'light' as Theme, icon: Sun, label: t('light') },
              { value: 'dark' as Theme, icon: Moon, label: t('dark') },
              { value: 'system' as Theme, icon: Monitor, label: t('system') },
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
        <h3 className="text-sm font-medium">{t('contentExtraction')}</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm">{t('autoExtractContent')}</label>
            <p className="text-xs text-muted-foreground">
              {t('autoExtractContentDesc')}
            </p>
          </div>
          <Switch
            checked={config.autoExtractContent}
            onCheckedChange={(checked) => updateConfig({ autoExtractContent: checked })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">{t('maxContextLength')}</label>
          <select
            value={config.maxContextLength}
            onChange={(e) => updateConfig({ maxContextLength: Number(e.target.value) })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value={10000}>10,000 {t('chars')}</option>
            <option value={30000}>30,000 {t('chars')}</option>
            <option value={50000}>50,000 {t('charsDefault')}</option>
            <option value={100000}>100,000 {t('chars')}</option>
            <option value={200000}>200,000 {t('chars')}</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {t('maxContextLengthDesc')}
          </p>
        </div>
      </div>

      {/* 数据管理 */}
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="text-sm font-medium">{t('dataManagement')}</h3>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm">{t('clearChatHistory')}</label>
              <p className="text-xs text-muted-foreground">
                {t('clearChatHistoryDesc')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChatHistory}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t('clearButton')}
            </Button>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm">{t('resetAllSettings')}</label>
                <p className="text-xs text-muted-foreground">
                  {t('resetAllSettingsDesc')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSettings}
                className="text-destructive hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {t('resetButton')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 关于 */}
      <div className="rounded-lg border p-4 space-y-2">
        <h3 className="text-sm font-medium">{t('about')}</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t('aboutDescription')}</p>
          <p>{t('version')}</p>
        </div>
      </div>
    </div>
  );
}
