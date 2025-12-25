## Context
当前 Browser Bee 扩展已实现 Tab 隔离的聊天功能，但只能获取 Tab 元数据。用户需要与页面内容进行交互式对话，例如总结整个页面。

### 约束条件
- 浏览器扩展的安全策略 (CSP) 限制
- Content Script 与 SidePanel 之间的隔离，需通过 Background Script 中转
- 页面内容可能很大，需要考虑性能和 Token 限制

## Goals / Non-Goals

**Goals:**
- 用户可以获取当前页面的主体内容
- 使用 Readability 算法自动过滤噪音（导航、广告等）
- 内容可以附加到聊天消息发送给 AI
- 支持从多个 Tab 获取内容（利用已有的多标签上下文功能）

**Non-Goals:**
- 不实现选中文本捕获功能
- 不处理需要登录或动态加载的内容
- 不做内容缓存或历史记录

## Decisions

### Decision 1: 使用 @mozilla/readability 提取内容
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
- 包体积约 50KB（gzipped ~15KB），可接受

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

### Decision 2: 消息传递架构
采用请求-响应模式：
```
SidePanel → (chrome.runtime.sendMessage) → Background
Background → (chrome.tabs.sendMessage) → Content Script
Content Script → 返回内容 → Background → SidePanel
```

**原因：** SidePanel 无法直接与 Content Script 通信，必须通过 Background 中转。

### Decision 3: 内容获取时机
在用户发送消息时即时获取，而非提前缓存：
- 保证内容是最新的
- 避免内存占用
- 页面可能随时更新

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 页面内容过大导致 Token 超限 | 截断内容至 10000 字符 |
| Content Script 注入失败（受限页面） | 优雅降级，提示用户该页面无法获取内容 |
| Readability 解析失败 | 使用语义标签提取作为降级方案 |
| 异步获取内容延迟发送体验 | 显示加载状态 |

## Open Questions
- 内容截断的最佳长度？（当前设定：10000 字符，后续可配置）
