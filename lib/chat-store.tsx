import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';
import { TabChat, Message, TabInfo } from './types';

interface ChatState {
  chats: Record<number, TabChat>;
  activeTabId: number | null;
}

type ChatAction =
  | { type: 'SET_ACTIVE_TAB'; tabId: number }
  | { type: 'ADD_MESSAGE'; tabId: number; message: Message }
  | { type: 'SET_SELECTED_TABS'; tabId: number; tabs: TabInfo[] }
  | { type: 'REMOVE_TAB_CHAT'; tabId: number }
  | { type: 'INIT_TAB_CHAT'; tabId: number; selectedTabs?: TabInfo[]; boundTabId?: number }
  | { type: 'UPDATE_TAB_INFO'; tabInfo: TabInfo; urlChanged: boolean };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.tabId };

    case 'INIT_TAB_CHAT': {
      if (state.chats[action.tabId]) return state;
      const boundTabId = action.boundTabId ?? action.selectedTabs?.[0]?.id ?? action.tabId;
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            tabId: action.tabId,
            messages: [],
            selectedTabs: action.selectedTabs ?? [],
            boundTabId,
          },
        },
      };
    }

    case 'ADD_MESSAGE': {
      const chat = state.chats[action.tabId] ?? {
        tabId: action.tabId,
        messages: [],
        selectedTabs: [],
        boundTabId: action.tabId,
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

    case 'SET_SELECTED_TABS': {
      const chat = state.chats[action.tabId] ?? {
        tabId: action.tabId,
        messages: [],
        selectedTabs: [],
        boundTabId: action.tabId,
      };
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.tabId]: {
            ...chat,
            selectedTabs: action.tabs,
          },
        },
      };
    }

    case 'UPDATE_TAB_INFO': {
      const newTabInfo = action.tabInfo;
      const browserTabId = newTabInfo.id;
      const urlChanged = action.urlChanged;
      const newChats: Record<number, TabChat> = {};
      let hasChanges = false;

      for (const [chatId, chat] of Object.entries(state.chats)) {
        const numChatId = Number(chatId);
        // 检查 boundTabId 是否匹配
        const isBoundTab = chat.boundTabId === browserTabId;
        // 检查 selectedTabs 中是否有匹配的
        const hasMatchingTab = chat.selectedTabs.some((t) => t.id === browserTabId);

        if (!isBoundTab && !hasMatchingTab) {
          newChats[numChatId] = chat;
          continue;
        }

        hasChanges = true;
        let newSelectedTabs = chat.selectedTabs;

        if (hasMatchingTab) {
          // 更新 selectedTabs 中匹配的 TabInfo
          newSelectedTabs = chat.selectedTabs.map((t) =>
            t.id === browserTabId ? newTabInfo : t
          );
        }

        if (isBoundTab && !hasMatchingTab && urlChanged) {
          // boundTab 被删除后，URL 变化了，需要重新添加
          newSelectedTabs = [...newSelectedTabs, newTabInfo];
        }

        newChats[numChatId] = {
          ...chat,
          selectedTabs: newSelectedTabs,
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

    default:
      return state;
  }
}

const initialState: ChatState = {
  chats: {},
  activeTabId: null,
};

interface ChatContextValue {
  state: ChatState;
  setActiveTab: (tabId: number) => void;
  initTabChat: (tabId: number, selectedTabs?: TabInfo[], boundTabId?: number) => void;
  addMessage: (tabId: number, message: Message) => void;
  setSelectedTabs: (tabId: number, tabs: TabInfo[]) => void;
  removeTabChat: (tabId: number) => void;
  updateTabInfo: (tabInfo: TabInfo, urlChanged: boolean) => void;
  getCurrentChat: () => TabChat | null;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const setActiveTab = useCallback((tabId: number) => {
    dispatch({ type: 'SET_ACTIVE_TAB', tabId });
  }, []);

  const initTabChat = useCallback((tabId: number, selectedTabs?: TabInfo[], boundTabId?: number) => {
    dispatch({ type: 'INIT_TAB_CHAT', tabId, selectedTabs, boundTabId });
  }, []);

  const addMessage = useCallback((tabId: number, message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', tabId, message });
  }, []);

  const setSelectedTabs = useCallback((tabId: number, tabs: TabInfo[]) => {
    dispatch({ type: 'SET_SELECTED_TABS', tabId, tabs });
  }, []);

  const removeTabChat = useCallback((tabId: number) => {
    dispatch({ type: 'REMOVE_TAB_CHAT', tabId });
  }, []);

  const updateTabInfo = useCallback((tabInfo: TabInfo, urlChanged: boolean) => {
    dispatch({ type: 'UPDATE_TAB_INFO', tabInfo, urlChanged });
  }, []);

  const getCurrentChat = useCallback(() => {
    if (state.activeTabId === null) return null;
    return state.chats[state.activeTabId] ?? null;
  }, [state.activeTabId, state.chats]);

  return (
    <ChatContext.Provider
      value={{
        state,
        setActiveTab,
        initTabChat,
        addMessage,
        setSelectedTabs,
        removeTabChat,
        updateTabInfo,
        getCurrentChat,
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
