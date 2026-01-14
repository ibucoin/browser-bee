export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  hostname: string;
  pageContent?: string;  // 页面主体内容（使用 Readability 提取）
}

// 图片附件
export interface ImageAttachment {
  id: string;
  name: string;
  type: string;  // MIME type
  dataUrl: string;  // base64 data URL
  size: number;  // 文件大小 bytes
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachedTabs?: TabInfo[];
  attachedImages?: ImageAttachment[];  // 图片附件
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
  selectedTabs: TabInfo[];
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

export interface AIChatAbort {
  type: 'ai_chat_abort';
  chatTabId: number;
}

/** 中止确认消息 - 通知前端请求已被成功中止 */
export interface AIChatAborted {
  type: 'ai_chat_aborted';
  chatTabId: number;
}

export type AIMessage = AIChatRequest | AIChatStreamChunk | AIChatComplete | AIChatError | AIChatAbort | AIChatAborted;

// 页面内容提取相关消息类型
export interface ContentExtractRequest {
  type: 'content_extract_request';
  tabId: number;
}

export interface ContentExtractResponse {
  type: 'content_extract_response';
  tabId: number;
  success: boolean;
  title?: string;
  content?: string;
  error?: string;
}

export type ContentMessage = ContentExtractRequest | ContentExtractResponse;
