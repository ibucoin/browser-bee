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

// AI 聊天相关消息类型
export interface AIChatRequest {
  type: 'ai_chat_request';
  chatTabId: number;
  messages: Message[];
}

export interface AIChatStreamChunk {
  type: 'ai_chat_chunk';
  chatTabId: number;
  chunk: string;
}

export interface AIChatComplete {
  type: 'ai_chat_complete';
  chatTabId: number;
  fullText: string;
}

export interface AIChatError {
  type: 'ai_chat_error';
  chatTabId: number;
  error: string;
}

export type AIMessage = AIChatRequest | AIChatStreamChunk | AIChatComplete | AIChatError;
