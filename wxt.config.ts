import { defineConfig } from 'wxt';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'BrowserBee',
    permissions: ['sidePanel', 'activeTab', 'tabs', 'scripting', 'storage'],
    host_permissions: ['<all_urls>'],
  },
  webExt: {
    // 使用绝对路径的 Chrome profile 目录，保持 storage 数据持久化
    chromiumProfile: path.resolve(__dirname, '.wxt/chrome-data'),
    // 保留 profile 数据，不在启动时清除
    keepProfileChanges: true,
  },
});
