import { TabEventMessage, TabInfo } from '@/lib/types';

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // 点击扩展图标时打开 sidepanel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // 监听 Tab 激活事件
  chrome.tabs.onActivated.addListener((activeInfo) => {
    const message: TabEventMessage = {
      type: 'activated',
      tabId: activeInfo.tabId,
      windowId: activeInfo.windowId,
    };
    chrome.runtime.sendMessage(message).catch(() => {
      // Side Panel 可能未打开，忽略错误
    });
  });

  // 监听 Tab 关闭事件
  chrome.tabs.onRemoved.addListener((tabId) => {
    const message: TabEventMessage = {
      type: 'removed',
      tabId,
    };
    chrome.runtime.sendMessage(message).catch(() => {
      // Side Panel 可能未打开，忽略错误
    });
  });

  // 监听 Tab URL、title 或 favicon 更新事件
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if ((changeInfo.url || changeInfo.title || changeInfo.favIconUrl) && tab.url) {
      const tabInfo: TabInfo = {
        id: tabId,
        title: tab.title || '未命名标签页',
        url: tab.url,
        favicon: tab.favIconUrl,
        hostname: new URL(tab.url).hostname,
      };
      const message: TabEventMessage = {
        type: 'updated',
        tabId,
        tabInfo,
        urlChanged: Boolean(changeInfo.url),
      };
      chrome.runtime.sendMessage(message).catch(() => {
        // Side Panel 可能未打开，忽略错误
      });
    }
  });
});
