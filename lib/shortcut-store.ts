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

export async function getShortcutStore(): Promise<ShortcutStore> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as ShortcutStore | undefined;
  return {
    shortcuts: stored?.shortcuts ?? [],
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
