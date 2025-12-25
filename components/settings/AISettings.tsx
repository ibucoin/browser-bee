import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AIConfig, getAIConfig, setAIConfig } from '@/lib/ai-config';
import { Settings, X, Check } from 'lucide-react';

interface AISettingsProps {
  onClose?: () => void;
}

export function AISettings({ onClose }: AISettingsProps) {
  const [config, setConfig] = useState<AIConfig>({
    baseURL: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAIConfig().then(setConfig);
  }, []);

  const handleSave = async () => {
    await setAIConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-medium">
          <Settings className="h-5 w-5" />
          AI 配置
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">API 端点</label>
          <input
            type="url"
            value={config.baseURL}
            onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
            placeholder="https://api.openai.com/v1"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            支持任何 OpenAI 兼容的 API（如 Groq、Together、Ollama 等）
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">API Key</label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder="sk-..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">模型名称</label>
          <input
            type="text"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            placeholder="gpt-4o-mini"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            根据你的 API 服务支持的模型填写
          </p>
        </div>

        <Button onClick={handleSave} className="w-full">
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              已保存
            </>
          ) : (
            '保存配置'
          )}
        </Button>
      </div>
    </div>
  );
}
