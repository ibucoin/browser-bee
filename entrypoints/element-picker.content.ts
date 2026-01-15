import { ElementPickResponse, ElementPickCancel } from '@/lib/types';

// 元素选择器样式
const HIGHLIGHT_STYLE = {
  outline: '2px solid #3b82f6',
  outlineOffset: '2px',
  backgroundColor: 'rgba(59, 130, 246, 0.1)',
};

// 选中时的样式
const SELECTED_STYLE = {
  outline: '2px solid #22c55e',
  outlineOffset: '2px',
  backgroundColor: 'rgba(34, 197, 94, 0.2)',
};

let isPickerActive = false;
let highlightedElement: HTMLElement | null = null;
let originalStyles: Map<string, string> = new Map();

// 生成元素的 CSS 选择器
function generateSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c && !c.includes(':'));
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).join('.');
      }
    }

    // 添加 nth-child 以确保唯一性
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// 保存元素原始样式
function saveOriginalStyles(element: HTMLElement) {
  originalStyles.set('outline', element.style.outline);
  originalStyles.set('outlineOffset', element.style.outlineOffset);
  originalStyles.set('backgroundColor', element.style.backgroundColor);
}

// 恢复元素原始样式
function restoreOriginalStyles(element: HTMLElement) {
  element.style.outline = originalStyles.get('outline') || '';
  element.style.outlineOffset = originalStyles.get('outlineOffset') || '';
  element.style.backgroundColor = originalStyles.get('backgroundColor') || '';
  originalStyles.clear();
}

// 应用高亮样式
function applyHighlight(element: HTMLElement) {
  saveOriginalStyles(element);
  element.style.outline = HIGHLIGHT_STYLE.outline;
  element.style.outlineOffset = HIGHLIGHT_STYLE.outlineOffset;
  element.style.backgroundColor = HIGHLIGHT_STYLE.backgroundColor;
}

// 应用选中样式（短暂闪烁）
function applySelectedFlash(element: HTMLElement) {
  element.style.outline = SELECTED_STYLE.outline;
  element.style.outlineOffset = SELECTED_STYLE.outlineOffset;
  element.style.backgroundColor = SELECTED_STYLE.backgroundColor;
}

// 处理鼠标移动
function handleMouseMove(event: MouseEvent) {
  if (!isPickerActive) return;

  const target = event.target as HTMLElement;
  if (!target || target === highlightedElement) return;

  // 移除之前的高亮
  if (highlightedElement) {
    restoreOriginalStyles(highlightedElement);
  }

  // 应用新的高亮
  highlightedElement = target;
  applyHighlight(target);

  event.preventDefault();
  event.stopPropagation();
}

// 处理点击选择
function handleClick(event: MouseEvent) {
  if (!isPickerActive) return;

  event.preventDefault();
  event.stopPropagation();

  const target = event.target as HTMLElement;
  if (!target) return;

  // 显示选中效果
  applySelectedFlash(target);

  // 获取元素信息
  const elementInfo = {
    id: crypto.randomUUID(),
    tagName: target.tagName.toLowerCase(),
    selector: generateSelector(target),
    outerHTML: target.outerHTML.slice(0, 5000), // 限制大小
    textContent: (target.textContent || '').trim().slice(0, 2000),
  };

  // 发送响应
  const response: ElementPickResponse = {
    type: 'element_pick_response',
    tabId: 0, // 将由 background 填充
    success: true,
    element: elementInfo,
  };

  chrome.runtime.sendMessage(response);

  // 延迟恢复样式并停止选择器
  setTimeout(() => {
    if (highlightedElement) {
      restoreOriginalStyles(highlightedElement);
      highlightedElement = null;
    }
    stopPicker();
  }, 200);
}

// 处理 ESC 取消
function handleKeyDown(event: KeyboardEvent) {
  if (!isPickerActive) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();

    const cancelMessage: ElementPickCancel = {
      type: 'element_pick_cancel',
      tabId: 0,
    };
    chrome.runtime.sendMessage(cancelMessage);
    stopPicker();
  }
}

// 启动选择器
function startPicker() {
  if (isPickerActive) return;

  isPickerActive = true;
  document.body.style.cursor = 'crosshair';

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);

  console.log('[ElementPicker] Started');
}

// 停止选择器
function stopPicker() {
  if (!isPickerActive) return;

  isPickerActive = false;
  document.body.style.cursor = '';

  if (highlightedElement) {
    restoreOriginalStyles(highlightedElement);
    highlightedElement = null;
  }

  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);

  console.log('[ElementPicker] Stopped');
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'element_pick_start') {
    startPicker();
    sendResponse({ success: true });
  } else if (message.type === 'element_pick_stop') {
    stopPicker();
    sendResponse({ success: true });
  }
  return true;
});

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    console.log('[ElementPicker] Content script loaded');
  },
});
