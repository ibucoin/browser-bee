import { createOpenAI } from '@ai-sdk/openai';

// 支持的提供商类型
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'azure' | 'ollama';

export const PROVIDER_TYPES: { value: ProviderType; label: string; description: string }[] = [
  { value: 'openai', label: 'OpenAI 兼容', description: '支持 OpenAI API 格式的服务（OpenAI、DeepSeek、OneAPI 等）' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude 系列模型原生 API' },
  { value: 'google', label: 'Google AI', description: 'Gemini 系列模型原生 API' },
  { value: 'azure', label: 'Azure OpenAI', description: '微软 Azure 托管的 OpenAI 服务' },
  { value: 'ollama', label: 'Ollama', description: '本地运行的 Ollama 服务' },
];

// 基础配置接口（保持兼容）
export interface AIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  providerType?: ProviderType;
}

export interface ModelPlatform {
  id: string;
  name: string;
  icon?: string;
  baseURL: string;
  apiKey: string;
  enabled: boolean;
  models: string[]; // 已启用的模型列表
  selectedModel: string; // 当前选中的模型
  isCustom?: boolean; // 是否为自定义平台
  providerType: ProviderType; // 提供商类型
}

export interface AIConfigStore {
  platforms: ModelPlatform[];
  activePlatformId: string | null;
}

// 默认为空配置，需要用户自己添加
const DEFAULT_PLATFORMS: ModelPlatform[] = [];

// 开发模式下的默认 provider
const DEV_DEFAULT_PLATFORM: ModelPlatform = {
  id: 'dev-default',
  name: '黑与白',
  icon: 'server',
  baseURL: 'https://ai.hybgzs.com/',
  apiKey: 'sk-N2FhzVBXVaQCGg7_QZLf9GxLO-tpWUyIbsS9Wuce0jjABhbRX7chb7DcJQY',
  enabled: true,
  models: ['hyb-Optimal/gemini-3-flash-preview'],
  selectedModel: 'hyb-Optimal/gemini-3-flash-preview',
  isCustom: true,
  providerType: 'openai',
};

const DEFAULT_STORE: AIConfigStore = {
  platforms: DEFAULT_PLATFORMS,
  activePlatformId: null,
};

// 开发模式下的默认配置
const DEV_DEFAULT_STORE: AIConfigStore = {
  platforms: [DEV_DEFAULT_PLATFORM],
  activePlatformId: 'dev-default',
};

const STORAGE_KEY = 'ai-config-store';
// 旧的 key，用于迁移
const LEGACY_STORAGE_KEY = 'ai-config';

// 获取完整的配置存储
export async function getAIConfigStore(): Promise<AIConfigStore> {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY, LEGACY_STORAGE_KEY]);
    
    // 如果有新存储，直接返回
    if (result[STORAGE_KEY]) {
      return result[STORAGE_KEY] as AIConfigStore;
    }
    
    // 如果有旧存储，进行迁移
    if (result[LEGACY_STORAGE_KEY]) {
      const oldConfig = result[LEGACY_STORAGE_KEY] as AIConfig;
      // 创建自定义平台包含旧配置
      const customPlatform: ModelPlatform = {
        id: 'custom-legacy',
        name: 'Custom (Legacy)',
        icon: 'settings',
        baseURL: oldConfig.baseURL,
        apiKey: oldConfig.apiKey,
        enabled: true,
        models: [oldConfig.model],
        selectedModel: oldConfig.model,
        isCustom: true,
        providerType: oldConfig.providerType || 'openai',
      };
      
      const newStore: AIConfigStore = {
        platforms: [customPlatform, ...DEFAULT_PLATFORMS],
        activePlatformId: 'custom-legacy'
      };
      
      // 保存迁移结果
      await chrome.storage.local.set({ [STORAGE_KEY]: newStore });
      return newStore;
    }
    
    // 开发模式下返回默认调试配置
    if (import.meta.env.DEV) {
      return DEV_DEFAULT_STORE;
    }

    return DEFAULT_STORE;
  } catch {
    // 开发模式下返回默认调试配置
    if (import.meta.env.DEV) {
      return DEV_DEFAULT_STORE;
    }

    return DEFAULT_STORE;
  }
}

export async function setAIConfigStore(store: AIConfigStore): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: store });
}

// 保持兼容性的 getAIConfig
// 它现在会从 Store 中获取当前激活的平台配置
export async function getAIConfig(): Promise<AIConfig> {
  const store = await getAIConfigStore();
  const activePlatform = store.platforms.find(p => p.id === store.activePlatformId);

  if (activePlatform) {
    return {
      baseURL: activePlatform.baseURL,
      apiKey: activePlatform.apiKey,
      model: activePlatform.selectedModel,
      providerType: activePlatform.providerType,
    };
  }

  // Fallback
  return {
    baseURL: '',
    apiKey: '',
    model: '',
    providerType: 'openai',
  };
}

// 兼容性的 setAIConfig (只更新当前激活的平台，或者创建一个新的自定义平台)
// 实际上为了简单起见，我们可能不需要这个函数了，但为了不破坏现有代码接口，我们保留它
// 但在新的 UI 中我们主要使用 setAIConfigStore
export async function setAIConfig(config: AIConfig): Promise<void> {
  const store = await getAIConfigStore();
  const activeIndex = store.platforms.findIndex(p => p.id === store.activePlatformId);
  
  if (activeIndex >= 0) {
    const platform = store.platforms[activeIndex];
    const updatedPlatform = {
      ...platform,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      selectedModel: config.model,
      // 如果新模型不在列表里，加进去
      models: platform.models.includes(config.model) 
        ? platform.models 
        : [...platform.models, config.model]
    };
    
    const newPlatforms = [...store.platforms];
    newPlatforms[activeIndex] = updatedPlatform;
    
    await setAIConfigStore({
      ...store,
      platforms: newPlatforms
    });
  }
}

// 规范化 baseURL，自动添加 /v1 后缀（OpenAI 兼容格式）
function normalizeBaseURL(baseURL: string): string {
  let url = baseURL.replace(/\/+$/, ''); // 移除尾部斜杠
  if (!url.endsWith('/v1')) {
    url = `${url}/v1`;
  }
  return url;
}

export function createAIProvider(config: AIConfig) {
  return createOpenAI({
    baseURL: normalizeBaseURL(config.baseURL),
    apiKey: config.apiKey,
    compatibility: 'compatible',
  } as any);
}

// 获取聊天模型，显式使用 chat completions API
export function getChatModel(config: AIConfig) {
  const provider = createAIProvider(config);
  // 使用 .chat() 方法强制使用 chat completions 端点
  return provider.chat(config.model);
}

// 获取可用模型列表的辅助函数
export async function fetchModels(baseURL: string, apiKey: string): Promise<string[]> {
  try {
    // 规范化 baseURL，确保以 /v1 结尾（OpenAI 兼容格式）
    let normalizedURL = baseURL.replace(/\/+$/, ''); // 移除尾部斜杠
    if (!normalizedURL.endsWith('/v1')) {
      normalizedURL = `${normalizedURL}/v1`;
    }
    
    const url = `${normalizedURL}/models`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    // 检查 Content-Type 是否为 JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('API 返回了非 JSON 响应，请检查 Base URL 是否正确');
    }
    
    const data = await response.json();
    // OpenAI 格式通常是 { data: [{ id: 'model-name', ... }] }
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => m.id);
    }
    return [];
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
}

// 测试模型连通性 - 发送一个最小化的对话请求
export async function testConnection(baseURL: string, apiKey: string, model: string): Promise<boolean> {
  try {
    const url = `${normalizeBaseURL(baseURL)}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    // 检查是否有有效的响应结构
    return !!(data.choices && data.choices.length > 0);
  } catch {
    return false;
  }
}

