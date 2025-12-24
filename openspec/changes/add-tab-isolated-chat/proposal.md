# Change: 添加 Tab 隔离的独立聊天

## Why
当前侧边栏是全局共享的，所有浏览器 Tab 看到的是同一个对话内容。用户需要每个 Tab 拥有独立的聊天上下文，这样可以针对不同网页进行针对性的对话，同时支持在单个聊天中关联多个页面进行跨页面联动沟通。

## What Changes
- 侧边栏状态按浏览器 Tab ID 隔离，每个 Tab 拥有独立的聊天历史
- 输入框默认关联当前活动 Tab 的页面信息
- 支持通过"添加页面"功能将其他 Tab 页面加入当前对话上下文
- Tab 关闭时清理对应的聊天数据

## Impact
- Affected specs: tab-isolated-chat (新增)
- Affected code:
  - `entrypoints/sidepanel/App.tsx` (添加 Tab 隔离逻辑)
  - `entrypoints/background.ts` (监听 Tab 事件)
  - `components/chat/ChatContainer.tsx` (接收 Tab 隔离的消息)
  - `components/chat/ChatInput.tsx` (保持当前 Tab 选择逻辑)
  - 新增 `lib/chat-store.ts` (管理按 Tab 隔离的聊天状态)
