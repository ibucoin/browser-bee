# Change: 添加页面内容提取功能

## Why
用户需要能够在对话中引用网页内容进行交互，例如输入"总结这个页面"时，需要获取当前 Tab 页面的主体内容，发送给 AI 进行总结、分析等处理。当前系统只能获取 Tab 的元数据（标题、URL、图标），无法获取页面实际内容。

## What Changes
- 添加 @mozilla/readability 依赖：使用 Mozilla 的 Readability 库提取页面主体内容
- 增强 Content Script：注入到所有网页，提供页面内容提取能力
- 页面主体内容提取：使用 Readability 算法提取页面的可读内容（自动去除导航、广告、页脚等干扰元素）
- 扩展消息传递机制：支持 SidePanel 向 Content Script 请求页面内容
- 扩展类型定义：添加内容请求/响应消息类型
- 更新 AI 消息上下文：将附加的页面内容包含在发送给 AI 的消息中

## Impact
- 受影响规格: tab-isolated-chat（扩展多标签上下文功能）
- 受影响代码:
  - `entrypoints/content.ts` - 重写为内容提取脚本
  - `entrypoints/background.ts` - 添加内容请求中转
  - `lib/types.ts` - 扩展类型定义
  - `components/chat/ChatInput.tsx` - 发送消息时附加内容
- 新增依赖: @mozilla/readability
