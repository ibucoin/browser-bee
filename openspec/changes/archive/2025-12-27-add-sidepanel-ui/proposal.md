# Change: 添加侧边栏基础 UI

## Why
Browser Bee 需要一个类似 Dia 的侧边栏界面，作为用户与 AI 交互的主要入口。这是产品的核心功能，需要优先实现。

## What Changes
- 使用 Chrome Side Panel API 实现侧边栏
- 实现顶部工具栏（新建对话、固定、设置、关闭）
- 实现当前页面信息卡片
- 实现对话消息列表区域
- 实现底部输入框组件

## Impact
- Affected specs: sidepanel-ui (新增)
- Affected code:
  - `entrypoints/sidepanel/` (新增)
  - `components/` (新增 UI 组件)
  - `wxt.config.ts` (配置 sidepanel)
