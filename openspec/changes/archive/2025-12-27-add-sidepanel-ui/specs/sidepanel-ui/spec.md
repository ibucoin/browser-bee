## ADDED Requirements

### Requirement: Side Panel Entry Point
系统 SHALL 提供一个侧边栏入口点，用户点击扩展图标时在浏览器侧边打开面板。

#### Scenario: 用户打开侧边栏
- **WHEN** 用户点击扩展图标
- **THEN** 侧边栏面板在浏览器右侧打开
- **AND** 显示完整的对话界面

### Requirement: Header Toolbar
系统 SHALL 在侧边栏顶部显示工具栏，包含核心操作按钮。

#### Scenario: 显示工具栏
- **WHEN** 侧边栏打开
- **THEN** 顶部显示工具栏
- **AND** 工具栏包含新建对话、固定、设置、关闭按钮

#### Scenario: 关闭侧边栏
- **WHEN** 用户点击关闭按钮
- **THEN** 侧边栏关闭

### Requirement: Page Info Card
系统 SHALL 显示当前活动标签页的信息卡片。

#### Scenario: 显示页面信息
- **WHEN** 侧边栏打开
- **THEN** 显示当前页面的标题
- **AND** 显示当前页面的域名
- **AND** 显示页面图标（如果有）

#### Scenario: 快捷操作
- **WHEN** 页面信息卡片显示
- **THEN** 显示"总结一下"快捷按钮

### Requirement: Chat Message Display
系统 SHALL 提供对话消息显示区域，展示用户和 AI 的对话历史。

#### Scenario: 显示消息列表
- **WHEN** 存在对话消息
- **THEN** 按时间顺序显示消息列表
- **AND** 用户消息和 AI 消息有不同的视觉样式

#### Scenario: 空状态
- **WHEN** 没有对话消息
- **THEN** 显示欢迎提示或空状态

### Requirement: Chat Input
系统 SHALL 在底部提供消息输入区域。

#### Scenario: 文本输入
- **WHEN** 用户在输入框输入文字
- **THEN** 输入框显示输入内容
- **AND** 支持多行输入

#### Scenario: 发送消息
- **WHEN** 用户点击发送按钮或按 Enter
- **THEN** 消息被提交（当前阶段仅 UI，不实际发送）

#### Scenario: 附加功能按钮
- **WHEN** 输入区域显示
- **THEN** 显示截图、语音等功能按钮占位
