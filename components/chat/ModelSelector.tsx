import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Server, Check, AlertCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  AIConfigStore, 
  ModelPlatform, 
  getAIConfigStore, 
  setAIConfigStore 
} from '@/lib/ai-config';

export function ModelSelector() {
  const [store, setStore] = useState<AIConfigStore | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getAIConfigStore().then(setStore);
  }, []);

  // 监听 storage 变化，保持同步
  useEffect(() => {
    const handleStorageChange = () => {
      getAIConfigStore().then(setStore);
    };
    
    // Chrome storage 变化监听
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
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

  if (!store) return null;

  const activePlatform = store.platforms.find(p => p.id === store.activePlatformId);
  
  // 获取当前选中的模型
  const currentModel = activePlatform?.selectedModel || activePlatform?.models[0] || '';
  
  // 检查配置状态
  const hasApiKey = !!activePlatform?.apiKey;
  const hasModels = (activePlatform?.models.length ?? 0) > 0;
  const isConfigured = activePlatform && hasApiKey && hasModels;
  
  // 显示文本：平台名/模型名
  const displayText = activePlatform 
    ? (hasModels ? `${activePlatform.name}/${currentModel}` : `${activePlatform.name}/未选择模型`)
    : '未配置';
  
  // 警告状态
  const showWarning = activePlatform && (!hasApiKey || !hasModels);

  const handleSelectPlatform = async (platform: ModelPlatform) => {
    const newStore = { ...store, activePlatformId: platform.id };
    setStore(newStore);
    await setAIConfigStore(newStore);
  };

  const handleSelectModel = async (platformId: string, model: string) => {
    // 同时更新 activePlatformId 和 selectedModel
    const newPlatforms = store.platforms.map(p => 
      p.id === platformId ? { ...p, selectedModel: model } : p
    );
    const newStore = { 
      ...store, 
      platforms: newPlatforms,
      activePlatformId: platformId  // 确保同时切换平台
    };
    setStore(newStore);
    await setAIConfigStore(newStore);
    setIsOpen(false);
  };

  // 过滤有模型的平台
  const availablePlatforms = store.platforms.filter(p => p.models.length > 0);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs",
          "border bg-background hover:bg-muted/50 transition-colors",
          "max-w-[200px]",
          showWarning 
            ? "border-amber-500 text-amber-600 dark:text-amber-400" 
            : !activePlatform 
              ? "border-destructive text-destructive"
              : "border-input"
        )}
      >
        {showWarning || !activePlatform ? (
          <AlertCircle className="h-3 w-3 shrink-0" />
        ) : (
          <Server className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <span className="truncate">{displayText}</span>
        <ChevronDown className={cn(
          "h-3 w-3 shrink-0 transition-transform",
          showWarning || !activePlatform ? "" : "text-muted-foreground",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border bg-background shadow-lg z-50 overflow-hidden"
        >
          <div className="p-2 border-b">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">
              选择模型
            </div>
          </div>
          
          {/* 配置警告提示 */}
          {(!activePlatform || !hasApiKey) && (
            <div className="px-3 py-2 border-b bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  {!activePlatform 
                    ? "未配置 AI 服务" 
                    : "请先配置 API Key"}
                  <button
                    onClick={() => {
                      chrome.runtime.openOptionsPage();
                      setIsOpen(false);
                    }}
                    className="ml-1 underline hover:no-underline"
                  >
                    去设置
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="max-h-[300px] overflow-y-auto p-1">
            {availablePlatforms.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                暂无可用模型，请在设置中配置
              </div>
            ) : (
              availablePlatforms.map(platform => (
                <div key={platform.id} className="mb-1">
                  {/* 平台标题 */}
                  <div 
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-xs font-medium",
                      store.activePlatformId === platform.id 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    )}
                  >
                    <Server className="h-3 w-3" />
                    {platform.name}
                  </div>
                  
                  {/* 模型列表 */}
                  <div className="space-y-0.5">
                    {platform.models.map(model => {
                      const isActive = store.activePlatformId === platform.id && 
                                       platform.selectedModel === model;
                      
                      return (
                        <button
                          key={model}
                          onClick={() => handleSelectModel(platform.id, model)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-1.5 rounded text-sm text-left",
                            isActive 
                              ? "bg-primary/10 text-primary" 
                              : "hover:bg-muted"
                          )}
                        >
                          <span className="truncate">{model}</span>
                          {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
