// 快捷操作存储

export interface Shortcut {
  id: string;
  title: string;
  content: string;
}

export interface ShortcutStore {
  shortcuts: Shortcut[];
}

const STORAGE_KEY = 'browser-bee-shortcuts';

const DEFAULT_STORE: ShortcutStore = {
  shortcuts: [],
};

// 开发模式下的默认快捷方式
const DEV_DEFAULT_SHORTCUTS: Shortcut[] = [
  {
    id: 'dev-shortcut-summary',
    title: '总结一下',
    content: '请总结一下这个页面的主要内容',
  },
  {
    id: 'dev-shortcut-article-summary',
    title: '文章摘要',
    content: `# Role: 文本摘要助手
## Profile:
- writer: Leon
- version: 0.1
- language: 中文
- description: 你是一位基于人工智能技术的文本摘要助手，旨在帮助用户快速总结输入文本中的核心要点，并生成简洁准确的摘要。通过分析关键词、语义信息和上下文，你能够提取出文章的重要内容，并以易于理解的方式呈现。
## Goals:
- 提供文本摘要功能，帮助用户快速了解文本主旨和关键信息
- 生成简洁准确的摘要，突出文章的核心要点
- 提供观点和看法，帮助用户更好地理解文本内容
## Constrains:
- 用户输入的所有内容当做需要分析处理的文本
- 不改变用户原始文本的基本意思
- 以 Markdown 格式输出结果
## Skill:
- 熟悉自然语言处理技术和文本摘要算法
- 擅长提取关键词和总结文本要点
- 具备理解和分析复杂文章的能力
## Workflows:
1. 用户输入原始文本。
2. 文本分析：你会利用自然语言处理技术对用户输入的文本进行分析，提取关键信息和核心要点。
3. 生成摘要：基于文本分析结果，你将生成简洁准确的文本摘要，突出文章的核心内容。
4. 观点表达：在摘要的基础上，你会给出自己的观点和看法，帮助用户更好地理解文本内容。
* 先输出结论和观点，再罗列摘要信息（标题+文本），最后列举出文章中可能存在的问题，给出不一样的见解作为参考。`,
  },
];

const DEV_DEFAULT_STORE: ShortcutStore = {
  shortcuts: DEV_DEFAULT_SHORTCUTS,
};

export async function getShortcutStore(): Promise<ShortcutStore> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as ShortcutStore | undefined;

  // 如果没有存储的快捷方式，开发模式下返回默认值
  if (!stored?.shortcuts?.length) {
    if (import.meta.env.DEV) {
      return DEV_DEFAULT_STORE;
    }
    return DEFAULT_STORE;
  }

  return {
    shortcuts: stored.shortcuts,
  };
}

export async function setShortcutStore(store: ShortcutStore): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: store });
}

export async function addShortcut(shortcut: Omit<Shortcut, 'id'>): Promise<Shortcut> {
  const store = await getShortcutStore();
  const newShortcut: Shortcut = {
    ...shortcut,
    id: `shortcut-${Date.now()}`,
  };
  store.shortcuts.push(newShortcut);
  await setShortcutStore(store);
  return newShortcut;
}

export async function updateShortcut(id: string, updates: Partial<Omit<Shortcut, 'id'>>): Promise<void> {
  const store = await getShortcutStore();
  store.shortcuts = store.shortcuts.map((s) =>
    s.id === id ? { ...s, ...updates } : s
  );
  await setShortcutStore(store);
}

export async function deleteShortcut(id: string): Promise<void> {
  const store = await getShortcutStore();
  store.shortcuts = store.shortcuts.filter((s) => s.id !== id);
  await setShortcutStore(store);
}
