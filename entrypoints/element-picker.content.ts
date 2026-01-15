import { ElementPickResponse, ElementPickCancel } from '@/lib/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    console.log('[ElementPicker] Content script loaded');

    // 元素选择器状态
    let isPickerActive = false;
    let highlightedElement: HTMLElement | null = null;

    // UI 元素
    let overlayElement: HTMLDivElement | null = null;
    let labelElement: HTMLDivElement | null = null;
    let bannerElement: HTMLDivElement | null = null;

    // 创建 overlay 高亮层
    function createOverlay(): HTMLDivElement {
      const overlay = document.createElement('div');
      overlay.id = 'browser-bee-picker-overlay';
      overlay.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 2147483646;
        border: 3px solid #8b5cf6;
        border-radius: 4px;
        background-color: rgba(139, 92, 246, 0.15);
        box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.3), 0 0 20px rgba(139, 92, 246, 0.4);
        transition: all 0.1s ease-out;
        display: none;
      `;
      document.body.appendChild(overlay);
      return overlay;
    }

    // 创建悬浮标签显示元素信息
    function createLabel(): HTMLDivElement {
      const label = document.createElement('div');
      label.id = 'browser-bee-picker-label';
      label.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 2147483647;
        padding: 6px 12px;
        background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 500;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        white-space: nowrap;
        display: none;
        max-width: 400px;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      document.body.appendChild(label);
      return label;
    }

    // 创建顶部横幅提示
    function createBanner(): HTMLDivElement {
      const banner = document.createElement('div');
      banner.id = 'browser-bee-picker-banner';
      banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            <path d="M13 13l6 6"/>
          </svg>
          <span><strong>元素选择模式</strong> - 点击页面上的元素进行选择，按 ESC 取消</span>
        </div>
      `;
      banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 2147483647;
        padding: 12px 20px;
        background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        display: none;
        animation: slideDown 0.3s ease-out;
      `;

      // 添加动画样式
      if (!document.getElementById('browser-bee-picker-styles')) {
        const style = document.createElement('style');
        style.id = 'browser-bee-picker-styles';
        style.textContent = `
          @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
      document.body.appendChild(banner);
      return banner;
    }

    // 更新 overlay 位置
    function updateOverlay(element: HTMLElement) {
      if (!overlayElement || !labelElement) return;

      const rect = element.getBoundingClientRect();

      // 更新 overlay
      overlayElement.style.left = `${rect.left - 3}px`;
      overlayElement.style.top = `${rect.top - 3}px`;
      overlayElement.style.width = `${rect.width + 6}px`;
      overlayElement.style.height = `${rect.height + 6}px`;
      overlayElement.style.display = 'block';

      // 生成标签文本
      const tagName = element.tagName.toLowerCase();
      const id = element.id ? `#${element.id}` : '';
      const classes =
        element.className && typeof element.className === 'string'
          ? '.' + element.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
      const size = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
      const labelText = `${tagName}${id}${classes} (${size})`;

      // 更新标签
      labelElement.textContent = labelText;
      labelElement.style.display = 'block';

      // 计算标签位置（元素上方，如果空间不够则放下方）
      const labelHeight = 30;
      const labelTop = rect.top - labelHeight - 8;

      if (labelTop > 50) {
        // 留出横幅空间
        labelElement.style.top = `${labelTop}px`;
      } else {
        labelElement.style.top = `${rect.bottom + 8}px`;
      }
      labelElement.style.left = `${Math.max(8, rect.left)}px`;
    }

    // 显示选中效果（绿色）
    function showSelectedEffect() {
      if (overlayElement) {
        overlayElement.style.borderColor = '#22c55e';
        overlayElement.style.backgroundColor = 'rgba(34, 197, 94, 0.25)';
        overlayElement.style.boxShadow =
          '0 0 0 4px rgba(34, 197, 94, 0.4), 0 0 30px rgba(34, 197, 94, 0.5)';
      }
    }

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
          const classes = current.className
            .trim()
            .split(/\s+/)
            .filter((c) => c && !c.includes(':'));
          if (classes.length > 0) {
            selector += '.' + classes.slice(0, 2).join('.');
          }
        }

        // 添加 nth-child 以确保唯一性
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (child) => child.tagName === current!.tagName
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

    // 检查元素是否是我们的 UI 元素
    function isPickerUIElement(element: HTMLElement): boolean {
      const pickerIds = [
        'browser-bee-picker-overlay',
        'browser-bee-picker-label',
        'browser-bee-picker-banner',
      ];
      return (
        pickerIds.includes(element.id) ||
        element.closest(
          '#browser-bee-picker-overlay, #browser-bee-picker-label, #browser-bee-picker-banner'
        ) !== null
      );
    }

    // 清理 UI 元素
    function cleanupUI() {
      overlayElement?.remove();
      labelElement?.remove();
      bannerElement?.remove();
      document.getElementById('browser-bee-picker-styles')?.remove();
      overlayElement = null;
      labelElement = null;
      bannerElement = null;
    }

    // 处理鼠标移动
    function handleMouseMove(event: MouseEvent) {
      if (!isPickerActive) return;

      const target = event.target as HTMLElement;

      // 忽略我们自己的 UI 元素
      if (!target || isPickerUIElement(target)) return;

      if (target === highlightedElement) return;

      // 更新高亮元素
      highlightedElement = target;
      updateOverlay(target);
    }

    // 处理点击选择
    function handleClick(event: MouseEvent) {
      if (!isPickerActive) return;

      const target = event.target as HTMLElement;

      // 忽略我们自己的 UI 元素
      if (!target || isPickerUIElement(target)) return;

      event.preventDefault();
      event.stopPropagation();

      // 显示选中效果
      showSelectedEffect();

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

      console.log('[ElementPicker] Sending response:', response);
      chrome.runtime.sendMessage(response);

      // 延迟停止选择器
      setTimeout(() => {
        stopPicker();
      }, 300);
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
      if (isPickerActive) {
        console.log('[ElementPicker] Already active');
        return;
      }

      console.log('[ElementPicker] Starting picker');
      isPickerActive = true;
      document.body.style.cursor = 'crosshair';

      // 创建 UI 元素
      overlayElement = createOverlay();
      labelElement = createLabel();
      bannerElement = createBanner();
      bannerElement.style.display = 'block';

      document.addEventListener('mousemove', handleMouseMove, true);
      document.addEventListener('click', handleClick, true);
      document.addEventListener('keydown', handleKeyDown, true);

      console.log('[ElementPicker] Started successfully');
    }

    // 停止选择器
    function stopPicker() {
      if (!isPickerActive) return;

      console.log('[ElementPicker] Stopping picker');
      isPickerActive = false;
      document.body.style.cursor = '';
      highlightedElement = null;

      // 清理 UI 元素
      cleanupUI();

      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);

      console.log('[ElementPicker] Stopped');
    }

    // 监听来自 background 的消息
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      console.log('[ElementPicker] Received message:', message);
      if (message.type === 'element_pick_start') {
        startPicker();
        sendResponse({ success: true });
      } else if (message.type === 'element_pick_stop') {
        stopPicker();
        sendResponse({ success: true });
      }
      return true;
    });
  },
});
