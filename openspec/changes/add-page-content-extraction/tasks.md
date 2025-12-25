## 1. 依赖安装
- [ ] 1.1 安装 @mozilla/readability 和 @types/readability

## 2. Content Script 基础设施
- [ ] 2.1 更新 content.ts 的 matches 配置为匹配所有网页 (`<all_urls>`)
- [ ] 2.2 实现 Readability 页面内容提取逻辑
- [ ] 2.3 添加降级方案（Readability 失败时使用语义标签提取）

## 3. 消息传递机制
- [ ] 3.1 定义内容请求/响应消息类型（ContentRequest, ContentResponse）
- [ ] 3.2 在 Content Script 中添加消息监听器，响应内容请求
- [ ] 3.3 在 Background Script 中添加消息中转逻辑（SidePanel → Content Script）
- [ ] 3.4 在 SidePanel 中实现内容请求 API（lib/content-service.ts）

## 4. UI 集成
- [ ] 4.1 在 ChatInput 发送消息时，根据上下文标签获取相应页面内容
- [ ] 4.2 将页面内容附加到用户消息中，供 AI 处理
- [ ] 4.3 显示内容获取加载状态
