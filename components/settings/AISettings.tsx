import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  AIConfigStore, 
  ModelPlatform, 
  getAIConfigStore, 
  setAIConfigStore,
  fetchModels,
  testConnection
} from '@/lib/ai-config';
import { 
  Settings, 
  X, 
  Check, 
  Plus, 
  Search, 
  Activity, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Server,
  Pencil,
  MessageSquare,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AISettingsProps {
  onClose?: () => void;
}

// 模型分组函数 - 根据模型名称前缀分组
function groupModels(models: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  
  for (const model of models) {
    // 提取前缀作为分组名
    // 例如: gpt-4-turbo -> gpt, claude-3-opus -> claude, deepseek-chat -> deepseek
    const parts = model.split(/[-_]/);
    let groupName = parts[0] || 'other';
    
    // 常见前缀的友好名称
    const friendlyNames: Record<string, string> = {
      'gpt': 'GPT',
      'claude': 'Claude',
      'deepseek': 'DeepSeek',
      'gemini': 'Gemini',
      'llama': 'Llama',
      'mistral': 'Mistral',
      'qwen': 'Qwen',
      'yi': 'Yi',
      'glm': 'GLM',
      'moonshot': 'Moonshot',
      'ernie': 'ERNIE',
      'spark': 'Spark',
      'hunyuan': 'Hunyuan',
      'text': 'Text',
      'embedding': 'Embedding',
      'whisper': 'Whisper',
      'tts': 'TTS',
      'dall': 'DALL-E',
      'o1': 'O1',
      'o3': 'O3',
    };
    
    groupName = friendlyNames[groupName.toLowerCase()] || groupName.toUpperCase();
    
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(model);
  }
  
  // 按组名排序，将常用的放前面
  const priority = ['GPT', 'O1', 'O3', 'Claude', 'DeepSeek', 'Gemini', 'Qwen'];
  const sortedGroups: Record<string, string[]> = {};
  
  // 先添加优先级高的
  for (const p of priority) {
    if (groups[p]) {
      sortedGroups[p] = groups[p].sort();
      delete groups[p];
    }
  }
  
  // 再添加其他的（按字母排序）
  for (const key of Object.keys(groups).sort()) {
    sortedGroups[key] = groups[key].sort();
  }
  
  return sortedGroups;
}

// 模型选择对话框
function ModelSelectDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  currentModels, 
  platform 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (models: string[]) => void;
  currentModels: string[];
  platform: ModelPlatform;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(currentModels));
  const [searchQuery, setSearchQuery] = useState('');
  // 健康测试状态
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; duration: number }>>({});

  // 初始加载模型列表
  useEffect(() => {
    if (isOpen) {
      fetchAvailableModels();
      setSelectedModels(new Set(currentModels));
      setTestResults({}); // 重置测试结果
    }
  }, [isOpen, platform]);

  const fetchAvailableModels = async () => {
    if (!platform.apiKey && platform.id !== 'ollama') {
      setError('请先配置 API Key');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const models = await fetchModels(platform.baseURL, platform.apiKey);
      setAvailableModels(models);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取模型列表失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleModel = (model: string) => {
    const next = new Set(selectedModels);
    if (next.has(model)) {
      next.delete(model);
    } else {
      next.add(model);
    }
    setSelectedModels(next);
  };

  const handleTestModel = async (e: React.MouseEvent, model: string) => {
    e.stopPropagation(); // 阻止触发选择
    if (testingModel) return; // 正在测试中
    
    setTestingModel(model);
    const startTime = Date.now();
    try {
      const result = await testConnection(platform.baseURL, platform.apiKey, model);
      const duration = Date.now() - startTime;
      setTestResults(prev => ({ ...prev, [model]: { success: result, duration } }));
    } catch {
      const duration = Date.now() - startTime;
      setTestResults(prev => ({ ...prev, [model]: { success: false, duration } }));
    } finally {
      setTestingModel(null);
    }
  };

  const filteredModels = availableModels.filter(m => 
    m.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">选择模型</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索模型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchAvailableModels} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] border rounded-md p-2 space-y-3">
          {filteredModels.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              未找到模型，请检查 API 配置或手动输入
            </div>
          )}
          {filteredModels.length > 0 && Object.entries(groupModels(filteredModels)).map(([groupName, models]) => (
            <div key={groupName}>
              <div className="text-xs font-medium text-muted-foreground px-2 py-1 sticky top-0 bg-background">
                {groupName} ({models.length})
              </div>
              <div className="space-y-0.5">
                {models.map(model => {
                  const isTesting = testingModel === model;
                  const testResult = testResults[model];
                  
                  // 格式化耗时显示
                  const formatDuration = (ms: number) => {
                    if (ms < 1000) return `${ms}ms`;
                    return `${(ms / 1000).toFixed(1)}s`;
                  };
                  
                  return (
                    <div 
                      key={model}
                      onClick={() => toggleModel(model)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-sm group",
                        testResult?.success === false
                          ? "bg-destructive/10"
                          : testResult?.success === true
                            ? "bg-green-500/10"
                            : selectedModels.has(model) 
                              ? "bg-primary/10 text-primary" 
                              : "hover:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 border rounded flex items-center justify-center shrink-0",
                        selectedModels.has(model) ? "bg-primary border-primary" : "border-muted-foreground"
                      )}>
                        {selectedModels.has(model) && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className="truncate flex-1">{model}</span>
                      {/* 显示响应时长 */}
                      {testResult && (
                        <span className={cn(
                          "text-xs tabular-nums",
                          testResult.success ? "text-green-600" : "text-red-500"
                        )}>
                          {formatDuration(testResult.duration)}
                        </span>
                      )}
                      {/* 健康测试按钮 */}
                      <button
                        onClick={(e) => handleTestModel(e, model)}
                        className="p-1 rounded hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="测试模型连通性"
                        disabled={isTesting}
                      >
                        {isTesting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : testResult?.success === true ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : testResult?.success === false ? (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => {
            onSave(Array.from(selectedModels));
            onClose();
          }}>
            确认 ({selectedModels.size})
          </Button>
        </div>
      </div>
    </div>
  );
}

// 编辑名称弹窗
function EditNameDialog({
  isOpen,
  onClose,
  onSave,
  currentName
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentName: string;
}) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (isOpen) setName(currentName);
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">编辑平台名称</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="请输入平台名称"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring mb-4"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => { onSave(name); onClose(); }} disabled={!name.trim()}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}

// 删除确认弹窗
function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  platformName
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  platformName: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">确认删除</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          确定要删除平台 <span className="font-medium text-foreground">"{platformName}"</span> 吗？此操作不可撤销。
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }}>
            删除
          </Button>
        </div>
      </div>
    </div>
  );
}

// 并发测试弹窗
function BatchTestDialog({
  isOpen,
  onClose,
  models,
  platform,
  onTestComplete
}: {
  isOpen: boolean;
  onClose: () => void;
  models: string[];
  platform: ModelPlatform;
  onTestComplete: (results: Record<string, { success: boolean; duration: number }>) => void;
}) {
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(models));
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<Record<string, { success: boolean; duration: number }>>({});
  const [testingModel, setTestingModel] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedModels(new Set(models));
      setResults({});
      setTesting(false);
      setTestingModel(null);
    }
  }, [isOpen, models]);

  const toggleModel = (model: string) => {
    const next = new Set(selectedModels);
    if (next.has(model)) {
      next.delete(model);
    } else {
      next.add(model);
    }
    setSelectedModels(next);
  };

  const selectAll = () => setSelectedModels(new Set(models));
  const selectNone = () => setSelectedModels(new Set());

  // 格式化耗时显示
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const handleTest = async () => {
    if (testing || selectedModels.size === 0) return;
    
    setTesting(true);
    setResults({});
    
    const modelsToTest = Array.from(selectedModels);
    const newResults: Record<string, { success: boolean; duration: number }> = {};
    
    // 并发测试
    await Promise.all(
      modelsToTest.map(async (model) => {
        setTestingModel(model);
        const startTime = Date.now();
        try {
          const result = await testConnection(platform.baseURL, platform.apiKey, model);
          const duration = Date.now() - startTime;
          newResults[model] = { success: result, duration };
          setResults(prev => ({ ...prev, [model]: { success: result, duration } }));
        } catch {
          const duration = Date.now() - startTime;
          newResults[model] = { success: false, duration };
          setResults(prev => ({ ...prev, [model]: { success: false, duration } }));
        }
      })
    );
    
    setTestingModel(null);
    setTesting(false);
    onTestComplete(newResults);
  };

  if (!isOpen) return null;

  const passedCount = Object.values(results).filter(v => v.success === true).length;
  const failedCount = Object.values(results).filter(v => v.success === false).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background shadow-lg flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="text-sm font-semibold">并发测试</h3>
            <p className="text-xs text-muted-foreground">{platform.name}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="px-4 py-2 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              全选
            </button>
            <span className="text-muted-foreground">|</span>
            <button 
              onClick={selectNone}
              className="text-xs text-primary hover:underline"
            >
              清空
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            已选 {selectedModels.size}/{models.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[150px]">
          {models.map(model => {
            const isSelected = selectedModels.has(model);
            const testResult = results[model];
            const isTesting = testingModel === model;
            
            return (
              <div
                key={model}
                onClick={() => !testing && toggleModel(model)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                  testResult?.success === false 
                    ? "bg-destructive/10 border border-destructive"
                    : testResult?.success === true
                      ? "bg-green-500/10 border border-green-500"
                      : isSelected 
                        ? "bg-primary/10" 
                        : "hover:bg-muted",
                  testing && "cursor-not-allowed opacity-70"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-4 w-4 border rounded flex items-center justify-center shrink-0",
                    isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="truncate">{model}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* 显示响应时长 */}
                  {testResult && (
                    <span className={cn(
                      "text-xs tabular-nums",
                      testResult.success ? "text-green-600" : "text-red-500"
                    )}>
                      {formatDuration(testResult.duration)}
                    </span>
                  )}
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : testResult?.success === true ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : testResult?.success === false ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(results).length > 0 && (
          <div className="px-4 py-2 border-t text-xs">
            <span className="text-green-600">通过: {passedCount}</span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span className="text-red-600">失败: {failedCount}</span>
          </div>
        )}

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            关闭
          </Button>
          <Button 
            size="sm" 
            onClick={handleTest} 
            disabled={testing || selectedModels.size === 0}
          >
            {testing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                测试中...
              </>
            ) : (
              <>
                <Activity className="h-3 w-3 mr-1" />
                开始测试
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// 对话测试弹窗
function ChatTestDialog({
  isOpen,
  onClose,
  platform,
  model
}: {
  isOpen: boolean;
  onClose: () => void;
  platform: ModelPlatform;
  model: string;
}) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 重置状态当打开新对话
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInput('');
      setError(null);
    }
  }, [isOpen, model]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setError(null);

    try {
      // 规范化 URL
      let baseURL = platform.baseURL.replace(/\/+$/, '');
      if (!baseURL.endsWith('/v1')) {
        baseURL = `${baseURL}/v1`;
      }
      
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${platform.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [...messages, { role: 'user', content: userMessage }].map(m => ({
            role: m.role,
            content: m.content
          })),
          max_tokens: 1000,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || '(空响应)';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background shadow-lg flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div>
            <h3 className="text-sm font-semibold">对话测试</h3>
            <p className="text-xs text-muted-foreground">{platform.name} / {model}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
          {messages.length === 0 && !loading && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              发送消息开始测试对话
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-md px-2.5 py-1.5 text-sm whitespace-pre-wrap w-fit",
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">思考中...</span>
            </div>
          )}
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-md px-2.5 py-1.5">
              {error}
            </div>
          )}
        </div>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="输入消息..."
              className="flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={loading}
            />
            <Button size="sm" onClick={handleSend} disabled={loading || !input.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 右键菜单
function ContextMenu({
  x,
  y,
  onEdit,
  onDelete,
  onClose
}: {
  x: number;
  y: number;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 min-w-[120px] rounded-md border bg-popover p-1 shadow-md"
      style={{ left: x, top: y }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); onClose(); }}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
      >
        <Pencil className="h-4 w-4" />
        编辑
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
      >
        <Trash2 className="h-4 w-4" />
        删除
      </button>
    </div>
  );
}

export function AISettings({ onClose }: AISettingsProps) {
  const [store, setStore] = useState<AIConfigStore | null>(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
  const [platformSearch, setPlatformSearch] = useState('');
  const [showKey, setShowKey] = useState(false);
  // 本地编辑状态（未保存）
  const [editBaseURL, setEditBaseURL] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; duration: number }>>({});
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [showBatchTestDialog, setShowBatchTestDialog] = useState(false);
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; platformId: string } | null>(null);
  // 编辑弹窗状态
  const [editDialog, setEditDialog] = useState<{ isOpen: boolean; platformId: string; name: string }>({ isOpen: false, platformId: '', name: '' });
  // 删除确认弹窗状态
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; platformId: string; name: string }>({ isOpen: false, platformId: '', name: '' });
  // 对话测试弹窗状态
  const [chatDialog, setChatDialog] = useState<{ isOpen: boolean; model: string }>({ isOpen: false, model: '' });

  useEffect(() => {
    getAIConfigStore().then(s => {
      setStore(s);
      // 默认选中 active 的平台，或者第一个
      const activeId = s.activePlatformId || s.platforms[0]?.id;
      setSelectedPlatformId(activeId);
      // 初始化编辑状态
      const platform = s.platforms.find(p => p.id === activeId);
      if (platform) {
        setEditBaseURL(platform.baseURL);
        setEditApiKey(platform.apiKey);
      }
    });
  }, []);

  // 切换平台时同步编辑状态
  useEffect(() => {
    if (store && selectedPlatformId) {
      const platform = store.platforms.find(p => p.id === selectedPlatformId);
      if (platform) {
        setEditBaseURL(platform.baseURL);
        setEditApiKey(platform.apiKey);
        setHasUnsavedChanges(false);
      }
    }
  }, [selectedPlatformId, store]);

  if (!store) {
    return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  // 当没有平台时，显示空状态而不是加载
  const activePlatform = selectedPlatformId 
    ? store.platforms.find(p => p.id === selectedPlatformId) 
    : store.platforms[0];
  
  const filteredPlatforms = store.platforms.filter(p => 
    p.name.toLowerCase().includes(platformSearch.toLowerCase())
  );

  const handleUpdatePlatform = async (updates: Partial<ModelPlatform>) => {
    const newPlatforms = store.platforms.map(p => 
      p.id === selectedPlatformId ? { ...p, ...updates } : p
    );
    const newStore = { ...store, platforms: newPlatforms };
    setStore(newStore);
    await setAIConfigStore(newStore);
  };

  const handleActivatePlatform = async () => {
    const newStore = { ...store, activePlatformId: selectedPlatformId };
    setStore(newStore);
    await setAIConfigStore(newStore);
  };

  const handleTestConnection = async (model: string) => {
    if (!activePlatform) return;
    setTestingModel(model);
    const startTime = Date.now();
    try {
      // 使用实际对话请求测试模型健康状态
      const result = await testConnection(activePlatform.baseURL, activePlatform.apiKey, model);
      const duration = Date.now() - startTime;
      setTestResults(prev => ({ ...prev, [model]: { success: result, duration } }));
    } catch {
      const duration = Date.now() - startTime;
      setTestResults(prev => ({ ...prev, [model]: { success: false, duration } }));
    } finally {
      setTestingModel(null);
    }
  };

  const handleAddCustomPlatform = async () => {
    const newId = `custom-${Date.now()}`;
    const newPlatform: ModelPlatform = {
      id: newId,
      name: 'Custom Provider',
      icon: 'server',
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      enabled: true,
      models: [],
      selectedModel: '',
      isCustom: true
    };
    
    const newStore = {
      ...store,
      platforms: [...store.platforms, newPlatform]
    };
    setStore(newStore);
    setSelectedPlatformId(newId);
    await setAIConfigStore(newStore);
  };

  const handleDeletePlatform = async (id: string) => {
    if (store.platforms.length <= 1) return;
    const newPlatforms = store.platforms.filter(p => p.id !== id);
    // 如果删除了当前选中的，选中第一个
    let newActiveId = store.activePlatformId;
    if (id === store.activePlatformId) {
      newActiveId = newPlatforms[0].id;
    }
    
    const newStore = {
      platforms: newPlatforms,
      activePlatformId: newActiveId
    };
    setStore(newStore);
    if (id === selectedPlatformId) {
      setSelectedPlatformId(newPlatforms[0].id);
    }
    await setAIConfigStore(newStore);
  };

  // 更新指定平台的名称
  const handleUpdatePlatformName = async (platformId: string, name: string) => {
    const newPlatforms = store.platforms.map(p => 
      p.id === platformId ? { ...p, name } : p
    );
    const newStore = { ...store, platforms: newPlatforms };
    setStore(newStore);
    await setAIConfigStore(newStore);
  };

  // 右键菜单处理
  const handleContextMenu = (e: React.MouseEvent, platform: ModelPlatform) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, platformId: platform.id });
  };

  return (
    <div className="flex h-full w-full bg-background text-foreground overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-64 border-r flex flex-col bg-muted/10">
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full pl-8 pr-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="搜索平台..."
              value={platformSearch}
              onChange={(e) => setPlatformSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredPlatforms.map(platform => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatformId(platform.id)}
              onContextMenu={(e) => handleContextMenu(e, platform)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md flex items-center gap-3 transition-colors text-sm",
                selectedPlatformId === platform.id 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Server className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 truncate">{platform.name}</span>
              {store.activePlatformId === platform.id && (
                <div className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </button>
          ))}
          
          <button
            onClick={handleAddCustomPlatform}
            className="w-full text-left px-3 py-2 rounded-md flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-muted text-sm border-t mt-2 pt-3"
          >
            <div className="flex items-center justify-center w-5 h-5 rounded border border-dashed border-current">
              <Plus className="h-3 w-3" />
            </div>
            <span>添加自定义平台</span>
          </button>
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activePlatform ? (
          // 空状态：没有平台时显示提示
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Server className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">暂无 AI 服务配置</h3>
            <p className="text-sm text-muted-foreground mb-4">
              点击左侧「添加自定义平台」开始配置
            </p>
            <Button onClick={handleAddCustomPlatform}>
              <Plus className="h-4 w-4 mr-2" />
              添加平台
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 border-b h-[60px]">
              <div className="flex items-center gap-2">
                <Server className="h-6 w-6 text-muted-foreground" />
                <div className="font-semibold text-lg">{activePlatform.name}</div>
                <button
                  onClick={() => setEditDialog({ isOpen: true, platformId: activePlatform.id, name: activePlatform.name })}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="编辑名称"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {activePlatform.isCustom && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Custom</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2">
                   <span className="text-sm text-muted-foreground">启用</span>
                   <Switch 
                     checked={store.activePlatformId === activePlatform.id}
                     onCheckedChange={(checked) => {
                       if (checked) {
                         handleActivatePlatform();
                       }
                     }}
                   />
                 </div>
                 {onClose && (
                  <Button variant="ghost" size="icon" onClick={onClose} className="ml-2">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 基本配置 */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">API Base URL</label>
              <input
                value={editBaseURL}
                onChange={(e) => {
                  setEditBaseURL(e.target.value);
                  setHasUnsavedChanges(e.target.value !== activePlatform.baseURL || editApiKey !== activePlatform.apiKey);
                }}
                placeholder="https://api.openai.com"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                预览: {(() => {
                  let url = editBaseURL.replace(/\/+$/, '');
                  if (!url.endsWith('/v1')) url = `${url}/v1`;
                  return `${url}/chat/completions`;
                })()}
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={editApiKey}
                  onChange={(e) => {
                    setEditApiKey(e.target.value);
                    setHasUnsavedChanges(editBaseURL !== activePlatform.baseURL || e.target.value !== activePlatform.apiKey);
                  }}
                  placeholder="sk-..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  handleUpdatePlatform({ baseURL: editBaseURL, apiKey: editApiKey });
                  setHasUnsavedChanges(false);
                }}
                disabled={!hasUnsavedChanges}
              >
                <Check className="h-3 w-3 mr-1" />
                保存配置
              </Button>
              {hasUnsavedChanges && (
                <span className="text-xs text-amber-500">有未保存的更改</span>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium">模型管理</h4>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowBatchTestDialog(true)}
                  disabled={activePlatform.models.length === 0}
                >
                  <Activity className="h-3 w-3 mr-1" />
                  并发测试
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowModelDialog(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  选择模型
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {activePlatform.models.length === 0 ? (
                 <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md text-center">
                    暂无模型，请点击右上角选择
                 </div>
              ) : (
                activePlatform.models.map(model => {
                  const testResult = testResults[model];
                  const testFailed = testResult?.success === false;
                  const testPassed = testResult?.success === true;
                  
                  // 格式化耗时显示
                  const formatDuration = (ms: number) => {
                    if (ms < 1000) return `${ms}ms`;
                    return `${(ms / 1000).toFixed(1)}s`;
                  };
                  
                  return (
                  <div 
                    key={model}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-md border transition-all",
                      testFailed
                        ? "border-destructive bg-destructive/10"
                        : testPassed
                          ? "border-green-500 bg-green-500/10"
                          : "hover:bg-muted/50 border-transparent bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{model}</span>
                      {/* 显示响应时长 */}
                      {testResult && (
                        <span className={cn(
                          "text-xs tabular-nums",
                          testResult.success ? "text-green-600" : "text-red-500"
                        )}>
                          {formatDuration(testResult.duration)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatDialog({ isOpen: true, model });
                        }}
                        title="对话测试"
                      >
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(model);
                        }}
                        title="测试连通性"
                      >
                        {testingModel === model ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : testResult?.success === true ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : testResult?.success === false ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 删除单个模型
                          const newModels = activePlatform.models.filter(m => m !== model);
                          const newSelectedModel = activePlatform.selectedModel === model 
                            ? (newModels[0] || '') 
                            : activePlatform.selectedModel;
                          handleUpdatePlatform({ models: newModels, selectedModel: newSelectedModel });
                        }}
                        title="删除模型"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )})
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              提示：点击心跳图标 <Activity className="h-3 w-3 inline" /> 可测试模型连通性。
            </p>
          </div>
        </div>
          </>
        )}
      </div>

      {/* 模型选择弹窗 */}
      {activePlatform && (
        <ModelSelectDialog 
          isOpen={showModelDialog}
          onClose={() => setShowModelDialog(false)}
          onSave={(models) => handleUpdatePlatform({ models })}
          currentModels={activePlatform.models}
          platform={activePlatform}
        />
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={() => {
            const platform = store.platforms.find(p => p.id === contextMenu.platformId);
            if (platform) {
              setEditDialog({ isOpen: true, platformId: platform.id, name: platform.name });
            }
          }}
          onDelete={() => {
            const platform = store.platforms.find(p => p.id === contextMenu.platformId);
            if (platform) {
              setDeleteDialog({ isOpen: true, platformId: platform.id, name: platform.name });
            }
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 编辑名称弹窗 */}
      <EditNameDialog
        isOpen={editDialog.isOpen}
        onClose={() => setEditDialog({ isOpen: false, platformId: '', name: '' })}
        onSave={(name) => handleUpdatePlatformName(editDialog.platformId, name)}
        currentName={editDialog.name}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, platformId: '', name: '' })}
        onConfirm={() => handleDeletePlatform(deleteDialog.platformId)}
        platformName={deleteDialog.name}
      />

      {/* 对话测试弹窗 */}
      {activePlatform && (
        <ChatTestDialog
          isOpen={chatDialog.isOpen}
          onClose={() => setChatDialog({ isOpen: false, model: '' })}
          platform={activePlatform}
          model={chatDialog.model}
        />
      )}

      {/* 并发测试弹窗 */}
      {activePlatform && (
        <BatchTestDialog
          isOpen={showBatchTestDialog}
          onClose={() => setShowBatchTestDialog(false)}
          models={activePlatform.models}
          platform={activePlatform}
          onTestComplete={(results) => setTestResults(prev => ({ ...prev, ...results }))}
        />
      )}
    </div>
  );
}
