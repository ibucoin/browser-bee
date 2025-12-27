## 1. 依赖安装
- [ ] 1.1 安装 @mozilla/readability 和 @types/readability

## 2. 类型扩展
- [ ] 2.1 扩展 TabInfo 类型，添加 pageContent 可选字段
- [ ] 2.2 定义内容请求/响应消息类型（ContentRequest, ContentResponse）

## 3. Content Script 基础设施
- [ ] 3.1 更新 content.ts 的 matches 配置为匹配所有网页 (`<all_urls>`)
- [ ] 3.2 实现 Readability 页面内容提取逻辑
- [ ] 3.3 添加降级方案（Readability 失败时使用语义标签提取）
- [ ] 3.4 添加消息监听器，响应内容提取请求

## 4. 消息传递机制
- [ ] 4.1 在 Background Script 中添加消息中转逻辑（SidePanel → Content Script）
- [ ] 4.2 在 SidePanel 中实现内容请求 API（lib/content-service.ts）

## 5. 状态管理集成
- [ ] 5.1 在对话初始化时（initTabChat）自动获取并保存页面内容到 TabInfo.pageContent
- [ ] 5.2 添加 updateTabContent action 用于刷新已保存的内容
- [ ] 5.3 在添加新 Tab 到上下文时自动获取内容

## 6. AI 消息构建
- [ ] 6.1 修改发送消息逻辑，将已保存的 pageContent 整合到 AI 请求中
- [ ] 6.2 构建包含页面上下文的系统提示

## 7. UI 集成（可选）
- [ ] 7.1 在 Tab 标签上添加刷新按钮
- [ ] 7.2 显示内容获取加载状态
- [ ] 7.3 显示内容获取失败提示
