## 1. 基础设施

- [ ] 1.1 创建 `lib/types.ts` 定义 TabChat、Message 等类型
- [ ] 1.2 创建 `lib/chat-store.ts` 实现 React Context 和 useReducer 状态管理

## 2. Background Script

- [ ] 2.1 添加 `chrome.tabs.onActivated` 监听器，获取当前活动 Tab ID
- [ ] 2.2 添加 `chrome.tabs.onRemoved` 监听器，处理 Tab 关闭事件
- [ ] 2.3 实现消息传递机制，将 Tab 变化通知 Side Panel

## 3. Side Panel 集成

- [ ] 3.1 修改 `App.tsx`，接入 ChatStoreProvider
- [ ] 3.2 添加 Tab ID 监听逻辑，接收来自 Background 的消息
- [ ] 3.3 修改 `ChatContainer.tsx`，根据当前 Tab ID 渲染对应消息

## 4. 输入框上下文

- [ ] 4.1 修改 `ChatInput.tsx`，从 ChatStore 获取和更新当前 Tab 的上下文
- [ ] 4.2 确保切换 Tab 时正确更新默认上下文页面

## 5. 验证

- [ ] 5.1 手动测试：在多个 Tab 间切换，验证聊天隔离
- [ ] 5.2 手动测试：关闭 Tab 后验证状态清理
