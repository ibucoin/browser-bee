export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  hostname: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachedTabs?: TabInfo[];
}

export interface TabChat {
  tabId: number;
  messages: Message[];
  selectedTabs: TabInfo[];
  boundTabId: number;
}

export type TabEventType = 'activated' | 'removed' | 'updated';

export interface TabEventMessage {
  type: TabEventType;
  tabId: number;
  windowId?: number;
  tabInfo?: TabInfo;
  urlChanged?: boolean;
}
