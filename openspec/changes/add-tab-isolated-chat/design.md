## Context
Browser Bee 需要实现 Tab 隔离的聊天功能。当前侧边栏实现是全局共享状态，需要改造为每个浏览器 Tab 拥有独立的聊天上下文。

**约束条件**：
- Chrome Side Panel API：sidepanel 在同一窗口内共享，需要在应用层实现 Tab 隔离
- 需要监听 Tab 切换和关闭事件以管理状态

## Goals / Non-Goals
**Goals**：
- 每个 Tab 拥有独立的聊天消息历史
- 输入框默认选中当前 Tab 作为上下文
- 支持将多个 Tab 页面添加到同一对话上下文
- Tab 关闭时自动清理对应聊天数据

**Non-Goals**：
- 跨窗口的状态同步
- 聊天历史的持久化存储（后续功能）
- AI 对话功能实现（当前只做 UI 层）

## Decisions

### 1. 状态管理方案：React Context + useReducer
**选择理由**：
- 符合项目约定使用 React 函数式组件 + Hooks
- 不需要引入额外依赖
- 足够简单，满足当前需求

**替代方案**：
- Zustand：更轻量，但需要额外依赖
- Redux：过于重量级

### 2. Tab ID 获取方式：Background Script 消息传递
**选择理由**：
- Side Panel 无法直接访问 `chrome.tabs.query` 获取当前 Tab
- 通过 Background Script 监听 `chrome.tabs.onActivated` 并主动推送给 Side Panel
- 这是 Chrome Extension 的标准模式

### 3. 状态存储结构
```typescript
interface ChatStore {
  // 按 Tab ID 索引的聊天状态
  chats: Map<number, TabChat>;
  // 当前活动的 Tab ID
  activeTabId: number | null;
}

interface TabChat {
  tabId: number;
  messages: Message[];
  // 当前对话关联的页面上下文（可以是多个 Tab）
  contextTabs: TabItem[];
}
```

## Risks / Trade-offs
- **内存占用**：每个 Tab 都维护独立状态，Tab 数量多时内存占用增加
  - 缓解：Tab 关闭时立即清理
- **状态丢失**：页面刷新会丢失状态
  - 接受：持久化是后续功能

## Open Questions
- 无
