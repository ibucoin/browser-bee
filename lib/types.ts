export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  hostname: string;
  pageContent?: string;  // 页面主体内容（使用 Readability 提取）
}

// 选中的元素信息
export interface ElementInfo {
  id: string;           // 唯一标识符
  tagName: string;      // 元素标签名
  selector: string;     // CSS 选择器（用于定位）
  outerHTML: string;    // 元素完整 HTML
  textContent: string;  // 元素文本内容
  tabId: number;        // 所属标签页 ID
  tabTitle: string;     // 所属标签页标题
  tabUrl: string;       // 所属标签页 URL
}

// 图片附件
export interface ImageAttachment {
  id: string;
  name: string;
  type: string;  // MIME type
  dataUrl: string;  // base64 data URL
  size: number;  // 文件大小 bytes
}

// 统一的附件类型
export type Attachment =
  | { type: 'tab'; data: TabInfo; isBound?: boolean }    // 网页，isBound 表示是否为绑定的当前页
  | { type: 'element'; data: ElementInfo }               // 选取的元素
  | { type: 'image'; data: ImageAttachment };            // 图片

// 附件辅助函数类型
export type AttachmentType = Attachment['type'];

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  // 发送时附加的上下文快照
  attachments?: Attachment[];
  // 兼容旧数据（可选，后续可移除）
  attachedTabs?: TabInfo[];
  attachedImages?: ImageAttachment[];
  attachedElements?: ElementInfo[];
}

export interface TabChat {
  tabId: number;
  messages: Message[];
  attachments: Attachment[];  // 当前的附件列表
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
  attachments: Attachment[];  // 统一的附件列表
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

// 元素选择相关消息类型
export interface ElementPickRequest {
  type: 'element_pick_request';
  tabId: number;
}

export interface ElementPickResponse {
  type: 'element_pick_response';
  tabId: number;
  success: boolean;
  element?: Omit<ElementInfo, 'tabId' | 'tabTitle' | 'tabUrl'>;
  error?: string;
}

export interface ElementPickCancel {
  type: 'element_pick_cancel';
  tabId: number;
}

export type ElementMessage = ElementPickRequest | ElementPickResponse | ElementPickCancel;
