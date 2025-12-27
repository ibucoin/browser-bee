## Context
当前 Browser Bee 扩展已实现 Tab 隔离的聊天功能和 AI 对话基础。用户需要与页面内容进行交互式对话，例如总结整个页面。页面内容需要保存在对话上下文中，因为每次发送消息给 AI 时都需要这个上下文。

### 约束条件
- 浏览器扩展的安全策略 (CSP) 限制
- Content Script 与 SidePanel 之间的隔离，需通过 Background Script 中转
- 页面内容可能很大，需要考虑性能和 Token 限制
- 页面内容需要持久保存在对话上下文中

## Goals / Non-Goals

**Goals:**
- 用户可以获取当前页面的主体内容
- 使用 Readability 算法自动过滤噪音（导航、广告等）
- 页面内容保存在 TabInfo 中，作为对话上下文的一部分
- 每次发送消息时，自动携带已保存的页面内容给 AI
- 支持从多个 Tab 获取并保存内容

**Non-Goals:**
- 不实现选中文本捕获功能
- 不处理需要登录或动态加载的内容

## Decisions

### Decision 1: 扩展 TabInfo 类型保存页面内容
在 TabInfo 中添加 pageContent 字段保存已提取的内容：

```typescript
export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  hostname: string;
  pageContent?: string;  // 新增：保存页面主体内容
}
```

### Decision 2: 使用 @mozilla/readability 提取内容
使用 Mozilla 的 Readability 库进行页面内容提取：

```typescript
import { Readability } from '@mozilla/readability';

function extractPageContent(): { title: string; content: string } | null {
  const documentClone = document.cloneNode(true) as Document;
  const reader = new Readability(documentClone);
  const article = reader.parse();

  if (article) {
    return {
      title: article.title,
      content: article.textContent.slice(0, 10000), // 限制长度
    };
  }
  return null;
}
```

**选择理由：**
- Firefox 阅读模式使用的同款算法，成熟可靠
- 自动去除导航、侧边栏、广告、页脚
- 对新闻、博客、文档类页面效果极佳

**降级方案：**
当 Readability 无法解析时，使用语义标签提取：
```typescript
function fallbackExtract(): string {
  const selectors = ['article', 'main', '[role="main"]', '.content', '#content'];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent && el.textContent.length > 200) {
      return el.textContent.trim().slice(0, 10000);
    }
  }
  return document.body.innerText.slice(0, 10000);
}
```

### Decision 3: 内容获取时机
在以下时机获取并保存页面内容：
1. **对话初始化时**：当 Tab 被添加到对话上下文时，自动获取并保存页面内容
2. **用户手动刷新时**：提供刷新按钮，允许用户更新已保存的内容

**保存位置**：页面内容保存在 `selectedTabs` 数组中每个 `TabInfo.pageContent` 字段

### Decision 4: 消息传递架构
采用请求-响应模式：
```
SidePanel → (chrome.runtime.sendMessage) → Background
Background → (chrome.tabs.sendMessage) → Content Script
Content Script → 返回内容 → Background → SidePanel
```

### Decision 5: AI 消息构建
发送消息给 AI 时，自动包含已保存的页面内容：
```typescript
function buildAIMessages(userMessage: string, selectedTabs: TabInfo[]): AIMessage[] {
  const contextParts = selectedTabs
    .filter(tab => tab.pageContent)
    .map(tab => `[${tab.title}](${tab.url}):\n${tab.pageContent}`);

  const systemContext = contextParts.length > 0
    ? `以下是用户提供的网页内容作为上下文：\n\n${contextParts.join('\n\n---\n\n')}`
    : '';

  return [
    { role: 'system', content: systemContext },
    { role: 'user', content: userMessage },
  ];
}
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 页面内容过大导致 Token 超限 | 截断内容至 10000 字符 |
| Content Script 注入失败（受限页面） | 优雅降级，提示用户该页面无法获取内容 |
| Readability 解析失败 | 使用语义标签提取作为降级方案 |
| 页面内容过期（用户停留时间长） | 提供刷新按钮更新内容 |

## Open Questions
- 内容截断的最佳长度？（当前设定：10000 字符，后续可配置）
