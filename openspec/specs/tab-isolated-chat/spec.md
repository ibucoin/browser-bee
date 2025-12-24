# tab-isolated-chat Specification

## Purpose
TBD - created by archiving change add-tab-isolated-chat. Update Purpose after archive.
## Requirements
### Requirement: Tab Isolated Chat State
The system SHALL maintain isolated chat state for each browser tab, including message history and associated page context.

#### Scenario: 用户在 Tab A 发送消息
- **WHEN** 用户在 Tab A 中打开侧边栏并发送消息
- **THEN** 消息保存在 Tab A 的聊天历史中
- **AND** 切换到 Tab B 时看不到该消息

#### Scenario: 用户切换 Tab 时保持独立状态
- **WHEN** 用户在 Tab A 中有对话历史
- **AND** 用户切换到 Tab B
- **THEN** 侧边栏显示 Tab B 的空白对话（或其已有历史）
- **AND** 切换回 Tab A 时恢复 Tab A 的对话历史

### Requirement: Default Context Tab
The system SHALL display the current active tab's page information as the default context in the input area.

#### Scenario: 打开侧边栏时默认选中当前页
- **WHEN** 用户在某个网页上打开侧边栏
- **THEN** 输入框中自动显示当前页面作为上下文标签
- **AND** 该标签显示页面标题、图标和域名

#### Scenario: 切换 Tab 时更新默认上下文
- **WHEN** 用户切换到另一个 Tab
- **THEN** 如果该 Tab 的对话上下文为空，自动添加当前页作为上下文
- **AND** 如果该 Tab 已有对话上下文，保持原有上下文不变

### Requirement: Multi-Tab Context
The system SHALL allow users to add multiple tab pages to a single conversation context for cross-page communication.

#### Scenario: 添加其他页面到上下文
- **WHEN** 用户点击"+"按钮选择其他打开的 Tab
- **THEN** 被选中的 Tab 页面信息添加到当前对话的上下文列表中
- **AND** 可以添加多个不同页面

#### Scenario: 移除上下文页面
- **WHEN** 用户点击某个上下文标签的关闭按钮
- **THEN** 该页面从当前对话的上下文中移除

### Requirement: Tab Cleanup
The system MUST clean up chat data when a browser tab is closed.

#### Scenario: Tab 关闭时清理聊天数据
- **WHEN** 用户关闭一个浏览器 Tab
- **THEN** 该 Tab 对应的聊天历史被清除
- **AND** 释放相关内存资源

