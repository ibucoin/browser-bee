import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';
import { TabChat, Message, TabInfo, Attachment } from './types';

interface ChatState {
  chats: Record<number, TabChat>;
  activeTabId: number | null;
  loadingTabIds: Set<number>;
}

type ChatAction =
  | { type: 'SET_ACTIVE_TAB'; tabId: number }
  | { type: 'ADD_MESSAGE'; tabId: number; message: Message }
  | { type: 'UPDATE_LAST_MESSAGE'; tabId: number; content: string }
  | { type: 'SET_ATTACHMENTS'; tabId: number; attachments: Attachment[] }
  | { type: 'ADD_ATTACHMENT'; tabId: number; attachment: Attachment }
  | { type: 'REMOVE_ATTACHMENT'; tabId: number; attachmentId: string }
  | { type: 'CLEAR_UNBOUND_ATTACHMENTS'; tabId: number }
  | { type: 'REMOVE_TAB_CHAT'; tabId: number }
  | { type: 'CLEAR_CHAT'; tabId: number; boundTab?: TabInfo }
  | { type: 'SET_LOADING'; tabId: number; loading: boolean }
  | { type: 'INIT_TAB_CHAT'; tabId: number; boundTab: TabInfo }
  | { type: 'UPDATE_BOUND_TAB'; tabInfo: TabInfo }
  | { type: 'UPDATE_TAB_CONTENT'; chatTabId: number; browserTabId: number; pageContent: string };

// 获取附件的唯一标识符
function getAttachmentId(attachment: Attachment): string {
  switch (attachment.type) {
    case 'tab':
      return `tab-${attachment.data.id}`;
    case 'element':
      return `element-${attachment.data.id}`;
    case 'image':
      return `image-${attachment.data.id}`;
  }
}

// 从消息历史中查找某个 tab 最后发送时的 URL
function findLastSentTabUrl(messages: Message[], tabId: number): string | null {
  // 从后往前遍历消息，找到最后一次包含该 tab 的用户消息
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user' && msg.attachments) {
      const tabAttachment = msg.attachments.find(
        a => a.type === 'tab' && a.data.id === tabId
      );
      if (tabAttachment && tabAttachment.type === 'tab') {
        return tabAttachment.data.url;
      }
    }
  }
  return null;
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.tabId };

    case 'INIT_TAB_CHAT': {
      if (state.chats[action.tabId]) return state;
      // 初始化时，将当前页面作为 tab attachment
      const initialAttachment: Attachment = {
        type: 'tab',
        data: action.boundTab,
      };
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            tabId: action.tabId,
            messages: [],
            attachments: [initialAttachment],
          },
        },
      };
    }

    case 'ADD_MESSAGE': {
      const chat = state.chats[action.tabId] ?? {
        tabId: action.tabId,
        messages: [],
        attachments: [],
      };
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            ...chat,
            messages: [...chat.messages, action.message],
          },
        },
      };
    }

    case 'UPDATE_LAST_MESSAGE': {
      const chat = state.chats[action.tabId];
      if (!chat || chat.messages.length === 0) return state;
      const messages = [...chat.messages];
      const lastMessage = messages[messages.length - 1];
      messages[messages.length - 1] = { ...lastMessage, content: action.content };
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            ...chat,
            messages,
          },
        },
      };
    }

    case 'SET_ATTACHMENTS': {
      const chat = state.chats[action.tabId] ?? {
        tabId: action.tabId,
        messages: [],
        attachments: [],
      };
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            ...chat,
            attachments: action.attachments,
          },
        },
      };
    }

    case 'ADD_ATTACHMENT': {
      const chat = state.chats[action.tabId];
      if (!chat) return state;
      // 检查是否已存在相同的附件
      const newId = getAttachmentId(action.attachment);
      const exists = chat.attachments.some(a => getAttachmentId(a) === newId);
      if (exists) return state;
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            ...chat,
            attachments: [...chat.attachments, action.attachment],
          },
        },
      };
    }

    case 'REMOVE_ATTACHMENT': {
      const chat = state.chats[action.tabId];
      if (!chat) return state;
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            ...chat,
            attachments: chat.attachments.filter(a => getAttachmentId(a) !== action.attachmentId),
          },
        },
      };
    }

    case 'CLEAR_UNBOUND_ATTACHMENTS': {
      const chat = state.chats[action.tabId];
      if (!chat) return state;
      // 发送后清空所有 attachments
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            ...chat,
            attachments: [],
          },
        },
      };
    }

    case 'UPDATE_BOUND_TAB': {
      // 当 tab URL 变化时，检查是否需要更新或添加 tab attachment
      const newTabInfo = action.tabInfo;
      const browserTabId = newTabInfo.id;
      const newChats: Record<number, TabChat> = {};
      let hasChanges = false;

      for (const [chatId, chat] of Object.entries(state.chats)) {
        const numChatId = Number(chatId);

        // 查找当前 attachments 中匹配的 tab
        const existingTabIndex = chat.attachments.findIndex(
          a => a.type === 'tab' && a.data.id === browserTabId
        );

        if (existingTabIndex >= 0) {
          // 已存在于 attachments 中，更新它
          const oldTab = chat.attachments[existingTabIndex] as { type: 'tab'; data: TabInfo };
          const urlChanged = oldTab.data.url !== newTabInfo.url;

          hasChanges = true;
          const newAttachments = [...chat.attachments];
          newAttachments[existingTabIndex] = {
            type: 'tab',
            // URL 变化时清除 pageContent
            data: urlChanged ? { ...newTabInfo, pageContent: undefined } : newTabInfo,
          };
          newChats[numChatId] = { ...chat, attachments: newAttachments };
        } else {
          // 不在 attachments 中，检查是否需要自动添加
          // 查找之前发送时的 URL
          const lastSentUrl = findLastSentTabUrl(chat.messages, browserTabId);
          if (lastSentUrl && lastSentUrl !== newTabInfo.url) {
            // URL 变化了，自动添加新的 tab attachment
            hasChanges = true;
            const newAttachment: Attachment = {
              type: 'tab',
              data: { ...newTabInfo, pageContent: undefined },
            };
            newChats[numChatId] = {
              ...chat,
              attachments: [...chat.attachments, newAttachment],
            };
          } else {
            newChats[numChatId] = chat;
          }
        }
      }

      if (!hasChanges) return state;
      return { ...state, chats: newChats };
    }

    case 'REMOVE_TAB_CHAT': {
      const { [action.tabId]: _, ...rest } = state.chats;
      return {
        ...state,
        chats: rest,
        activeTabId:
          state.activeTabId === action.tabId ? null : state.activeTabId,
      };
    }

    case 'CLEAR_CHAT': {
      const chat = state.chats[action.tabId];
      if (!chat) return state;
      // 清空聊天时清空所有消息，如果提供了 boundTab 则重新初始化当前页面 tab
      const initialAttachments: Attachment[] = action.boundTab
        ? [{ type: 'tab', data: action.boundTab }]
        : [];
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            ...chat,
            messages: [],
            attachments: initialAttachments,
          },
        },
      };
    }

    case 'SET_LOADING': {
      const newLoadingTabIds = new Set(state.loadingTabIds);
      if (action.loading) {
        newLoadingTabIds.add(action.tabId);
      } else {
        newLoadingTabIds.delete(action.tabId);
      }
      return {
        ...state,
        loadingTabIds: newLoadingTabIds,
      };
    }

    case 'UPDATE_TAB_CONTENT': {
      const chat = state.chats[action.chatTabId];
      if (!chat) return state;
      const newAttachments = chat.attachments.map((attachment) => {
        if (attachment.type === 'tab' && attachment.data.id === action.browserTabId) {
          return {
            ...attachment,
            data: { ...attachment.data, pageContent: action.pageContent },
          };
        }
        return attachment;
      });
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.chatTabId]: {
            ...chat,
            attachments: newAttachments,
          },
        },
      };
    }

    default:
      return state;
  }
}

const initialState: ChatState = {
  chats: {},
  activeTabId: null,
  loadingTabIds: new Set(),
};

interface ChatContextValue {
  state: ChatState;
  setActiveTab: (tabId: number) => void;
  initTabChat: (tabId: number, boundTab: TabInfo) => void;
  addMessage: (tabId: number, message: Message) => void;
  updateLastMessage: (tabId: number, content: string) => void;
  setAttachments: (tabId: number, attachments: Attachment[]) => void;
  addAttachment: (tabId: number, attachment: Attachment) => void;
  removeAttachment: (tabId: number, attachmentId: string) => void;
  clearUnboundAttachments: (tabId: number) => void;
  removeTabChat: (tabId: number) => void;
  clearChat: (tabId: number, boundTab?: TabInfo) => void;
  setLoading: (tabId: number, loading: boolean) => void;
  updateBoundTab: (tabInfo: TabInfo) => void;
  updateTabContent: (chatTabId: number, browserTabId: number, pageContent: string) => void;
  getCurrentChat: () => TabChat | null;
  isCurrentTabLoading: () => boolean;
  getAttachmentId: (attachment: Attachment) => string;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const setActiveTab = useCallback((tabId: number) => {
    dispatch({ type: 'SET_ACTIVE_TAB', tabId });
  }, []);

  const initTabChat = useCallback((tabId: number, boundTab: TabInfo) => {
    dispatch({ type: 'INIT_TAB_CHAT', tabId, boundTab });
  }, []);

  const addMessage = useCallback((tabId: number, message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', tabId, message });
  }, []);

  const updateLastMessage = useCallback((tabId: number, content: string) => {
    dispatch({ type: 'UPDATE_LAST_MESSAGE', tabId, content });
  }, []);

  const setAttachments = useCallback((tabId: number, attachments: Attachment[]) => {
    dispatch({ type: 'SET_ATTACHMENTS', tabId, attachments });
  }, []);

  const addAttachment = useCallback((tabId: number, attachment: Attachment) => {
    dispatch({ type: 'ADD_ATTACHMENT', tabId, attachment });
  }, []);

  const removeAttachment = useCallback((tabId: number, attachmentId: string) => {
    dispatch({ type: 'REMOVE_ATTACHMENT', tabId, attachmentId });
  }, []);

  const clearUnboundAttachments = useCallback((tabId: number) => {
    dispatch({ type: 'CLEAR_UNBOUND_ATTACHMENTS', tabId });
  }, []);

  const removeTabChat = useCallback((tabId: number) => {
    dispatch({ type: 'REMOVE_TAB_CHAT', tabId });
  }, []);

  const clearChat = useCallback((tabId: number, boundTab?: TabInfo) => {
    dispatch({ type: 'CLEAR_CHAT', tabId, boundTab });
  }, []);

  const setLoading = useCallback((tabId: number, loading: boolean) => {
    dispatch({ type: 'SET_LOADING', tabId, loading });
  }, []);

  const updateBoundTab = useCallback((tabInfo: TabInfo) => {
    dispatch({ type: 'UPDATE_BOUND_TAB', tabInfo });
  }, []);

  const updateTabContent = useCallback((chatTabId: number, browserTabId: number, pageContent: string) => {
    dispatch({ type: 'UPDATE_TAB_CONTENT', chatTabId, browserTabId, pageContent });
  }, []);

  const getCurrentChat = useCallback(() => {
    if (state.activeTabId === null) return null;
    return state.chats[state.activeTabId] ?? null;
  }, [state.activeTabId, state.chats]);

  const isCurrentTabLoading = useCallback(() => {
    if (state.activeTabId === null) return false;
    return state.loadingTabIds.has(state.activeTabId);
  }, [state.activeTabId, state.loadingTabIds]);

  return (
    <ChatContext.Provider
      value={{
        state,
        setActiveTab,
        initTabChat,
        addMessage,
        updateLastMessage,
        setAttachments,
        addAttachment,
        removeAttachment,
        clearUnboundAttachments,
        removeTabChat,
        clearChat,
        setLoading,
        updateBoundTab,
        updateTabContent,
        getCurrentChat,
        isCurrentTabLoading,
        getAttachmentId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatStore() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatStore must be used within a ChatStoreProvider');
  }
  return context;
}
