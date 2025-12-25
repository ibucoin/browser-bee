## ADDED Requirements

### Requirement: Page Content Extraction
The system SHALL extract and provide page content from browser tabs using Readability algorithm when requested for AI conversation context.

#### Scenario: 获取页面主体内容
- **WHEN** 用户发送需要页面内容的消息（如"总结这个页面"）
- **THEN** 系统使用 Readability 算法提取页面的主体文本内容
- **AND** 自动过滤导航、广告、页脚等干扰元素
- **AND** 将页面内容作为上下文附加到消息中发送给 AI

#### Scenario: 从多个 Tab 获取内容
- **WHEN** 用户添加了多个 Tab 到对话上下文
- **AND** 用户发送消息
- **THEN** 系统获取各个 Tab 已保存的页面内容
- **AND** 将所有内容整合后发送给 AI

#### Scenario: Readability 解析失败时降级
- **WHEN** Readability 无法解析页面内容
- **THEN** 系统使用语义标签（article, main 等）提取内容
- **AND** 如果语义标签也无法匹配，则使用 body.innerText 作为最后降级

### Requirement: Page Content Persistence
The system SHALL persist extracted page content in the conversation context for reuse across multiple messages.

#### Scenario: 对话初始化时保存页面内容
- **WHEN** Tab 被添加到对话上下文（对话初始化或用户添加新 Tab）
- **THEN** 系统自动获取该 Tab 的页面内容
- **AND** 将内容保存在 TabInfo.pageContent 字段中
- **AND** 后续消息自动复用已保存的内容

#### Scenario: 发送消息时使用已保存内容
- **WHEN** 用户发送消息
- **AND** 对话上下文中有已保存页面内容的 Tab
- **THEN** 系统直接使用已保存的内容构建 AI 消息
- **AND** 无需再次请求 Content Script

#### Scenario: 用户手动刷新内容
- **WHEN** 用户点击 Tab 标签上的刷新按钮
- **THEN** 系统重新获取该 Tab 的页面内容
- **AND** 更新 TabInfo.pageContent 字段

### Requirement: Content Script Injection
The system SHALL inject content scripts into web pages to enable content extraction.

#### Scenario: 普通网页内容脚本注入
- **WHEN** 用户访问一个普通网页
- **THEN** Content Script 自动注入到该页面
- **AND** 可以响应内容提取请求

#### Scenario: 受限页面处理
- **WHEN** 用户访问 chrome:// 或其他受限页面
- **THEN** 系统检测到无法注入 Content Script
- **AND** 向用户提示该页面无法获取内容

### Requirement: Content Message Passing
The system SHALL provide a messaging mechanism between SidePanel and Content Scripts for content retrieval.

#### Scenario: 请求页面内容
- **WHEN** SidePanel 需要获取某个 Tab 的内容
- **THEN** 向 Background Script 发送内容请求
- **AND** Background Script 转发请求到对应 Tab 的 Content Script
- **AND** Content Script 返回页面内容

#### Scenario: 内容请求超时处理
- **WHEN** Content Script 在指定时间内未响应
- **THEN** 系统返回超时错误
- **AND** 提示用户该页面可能无法正常访问

## MODIFIED Requirements

### Requirement: Multi-Tab Context
The system SHALL allow users to add multiple tab pages to a single conversation context for cross-page communication.

#### Scenario: 添加其他页面到上下文
- **WHEN** 用户点击"+"按钮选择其他打开的 Tab
- **THEN** 被选中的 Tab 页面信息添加到当前对话的上下文列表中
- **AND** 自动获取并保存该 Tab 的页面内容
- **AND** 可以添加多个不同页面

#### Scenario: 移除上下文页面
- **WHEN** 用户点击某个上下文标签的关闭按钮
- **THEN** 该页面从当前对话的上下文中移除
- **AND** 释放已保存的页面内容

#### Scenario: 发送消息时携带上下文页面内容
- **WHEN** 用户发送消息
- **AND** 当前对话有上下文页面
- **THEN** 系统将所有上下文页面的已保存内容整合到消息中
- **AND** 发送给 AI 进行处理
