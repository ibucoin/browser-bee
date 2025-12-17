# Project Context

## Purpose
Browser Bee 是一个浏览器侧边栏 AI 助手扩展，类似于 Sider 和 Dia。主要功能包括：
- 在侧边栏窗口中与 AI 进行对话
- 对当前网页内容进行智能总结
- 分析网页内容并提取关键信息
- 支持多种 AI 模型接入

## Tech Stack
- **框架**: WXT (Web Extension Tools) - 现代化浏览器扩展开发框架
- **前端**: React 19 + TypeScript 5
- **浏览器支持**: Chrome, Firefox
- **构建工具**: WXT 内置 Vite
- **包管理**: bun
- **UI组件库**: shadcn/ui

## Project Conventions

### Code Style
- 使用 TypeScript 严格类型检查
- React 函数式组件 + Hooks
- 文件命名: 组件使用 PascalCase，其他文件使用 camelCase
- 使用 ES Modules (type: module)

### Architecture Patterns
- **entrypoints/**: 扩展入口点目录
  - `popup/`: 弹窗 UI (React)
  - `content.ts`: 内容脚本，注入到网页中
  - `background.ts`: 后台服务脚本
- **public/**: 静态资源 (图标等)
- **assets/**: 项目资源文件
- 使用 WXT 的约定式路由和入口点发现机制

### Testing Strategy
按需进行测试，不强制要求测试覆盖率

### Git Workflow
- 主分支: main
- 功能开发在独立分支进行
- 提交信息使用中文或英文均可

## Domain Context
- **浏览器扩展 API**: 需要熟悉 Chrome Extension API 和 WebExtension API
- **内容脚本**: 用于访问和提取网页 DOM 内容
- **消息传递**: popup/content script/background 之间的通信
- **侧边栏**: 使用 Chrome Side Panel API 或 popup 实现侧边栏功能

## Important Constraints
- 遵循浏览器扩展的安全策略 (CSP)
- 需要处理跨域请求限制
- 注意用户隐私，不收集敏感数据
- API Key 等敏感信息需要安全存储

## External Dependencies
- **AI API**: 待选择 (OpenAI, Claude, 或其他)
- **UI 组件库**: shadcn/ui
- **图标库**: lucide-react
- **Markdown 渲染**: react-markdown + remark-gfm + react-syntax-highlighter
- **状态管理**: 按需选择
