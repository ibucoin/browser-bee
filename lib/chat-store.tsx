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
  | { type: 'REMOVE_TAB_CHAT'; tabId: number }
  | { type: 'CLEAR_CHAT'; tabId: number }
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

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.tabId };

    case 'INIT_TAB_CHAT': {
      if (state.chats[action.tabId]) return state;
      // 初始化时，将当前页面作为绑定的 attachment
      const boundAttachment: Attachment = {
        type: 'tab',
        data: action.boundTab,
        isBound: true,
      };
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            tabId: action.tabId,
            messages: [],
            attachments: [boundAttachment],
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

    case 'UPDATE_BOUND_TAB': {
      // 更新所有聊天中绑定的标签页信息
      const newTabInfo = action.tabInfo;
      const browserTabId = newTabInfo.id;
      const newChats: Record<number, TabChat> = {};
      let hasChanges = false;

      for (const [chatId, chat] of Object.entries(state.chats)) {
        const numChatId = Number(chatId);
        // 查找绑定的标签页附件
        const boundTabIndex = chat.attachments.findIndex(
          a => a.type === 'tab' && a.isBound && a.data.id === browserTabId
        );

        if (boundTabIndex === -1) {
          newChats[numChatId] = chat;
          continue;
        }

        hasChanges = true;
        const newAttachments = [...chat.attachments];
        newAttachments[boundTabIndex] = {
          type: 'tab',
          data: newTabInfo,
          isBound: true,
        };

        newChats[numChatId] = {
          ...chat,
          attachments: newAttachments,
        };
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
      // 清空聊天时保留绑定的标签页，移除其他附件
      const boundAttachments = chat.attachments.filter(
        a => a.type === 'tab' && a.isBound
      );
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            ...chat,
            messages: [],
            attachments: boundAttachments,
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
  removeTabChat: (tabId: number) => void;
  clearChat: (tabId: number) => void;
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

  const removeTabChat = useCallback((tabId: number) => {
    dispatch({ type: 'REMOVE_TAB_CHAT', tabId });
  }, []);

  const clearChat = useCallback((tabId: number) => {
    dispatch({ type: 'CLEAR_CHAT', tabId });
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
