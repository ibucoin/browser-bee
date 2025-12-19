export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // 点击扩展图标时打开 sidepanel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
