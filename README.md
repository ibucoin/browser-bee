# Browser Bee

基于 WXT + React 构建的浏览器 AI 助手扩展，支持在侧边栏与 AI 对话，并可自动提取网页内容作为上下文。

## 功能特点

- **侧边栏聊天** - 在浏览器侧边栏与 AI 实时对话
- **网页内容提取** - 自动读取当前页面内容，为 AI 提供上下文
- **多标签页支持** - 管理多个标签页的独立对话
- **流式响应** - 实时显示 AI 回复
- **兼容 OpenAI API** - 支持任何 OpenAI 兼容的 API 服务

## 技术栈

- [WXT](https://wxt.dev/) - 浏览器扩展开发框架
- React 19 + TypeScript
- Tailwind CSS
- Vercel AI SDK

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式 (Chrome)
pnpm dev

# 开发模式 (Firefox)
pnpm dev:firefox

# 构建
pnpm build

# 打包 zip
pnpm zip
```

## 配置

点击扩展图标打开侧边栏后，在设置中配置：

- **API Base URL** - API 服务地址（默认使用 OpenAI）
- **API Key** - 你的 API 密钥
- **Model** - 使用的模型名称

## License

MIT
