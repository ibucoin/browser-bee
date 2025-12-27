## Context
实现类似 Dia 的侧边栏 UI，作为 Browser Bee 的主要交互界面。

## Goals / Non-Goals
- Goals:
  - 实现基础侧边栏布局
  - 组件化设计，便于后续扩展
  - 响应式设计，适配不同宽度
- Non-Goals:
  - 暂不实现 AI 对话功能（仅 UI）
  - 暂不实现截图、语音等高级功能
  - 暂不实现设置页面

## Decisions

### 使用 Chrome Side Panel API
- **决定**: 使用 `chrome.sidePanel` API 而非 popup
- **原因**: Side Panel 可以固定在浏览器侧边，用户体验更好，类似 Dia 的交互方式

### 组件结构
```
sidepanel/
├── index.html
├── main.tsx
├── App.tsx
└── style.css

components/
├── chat/
│   ├── ChatContainer.tsx
│   ├── ChatInput.tsx
│   └── Message.tsx
├── header/
│   └── Header.tsx
└── page-card/
    └── PageCard.tsx
```

### 布局设计
- 使用 Flexbox 实现三段式布局：Header + Content + Input
- Content 区域使用 `flex-1` 和 `overflow-y: auto` 实现滚动

## Risks / Trade-offs
- **Side Panel API 兼容性**: 仅 Chrome 116+ 支持，Firefox 暂不支持
  - 缓解: 后续可添加 fallback 到 popup 模式

## Open Questions
- 是否需要支持暗色主题？（shadcn 已支持，可后续添加）
