import { Info } from 'lucide-react';

export function AboutSettings() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-lg font-medium">
        <Info className="h-5 w-5" />
        关于
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <div>
          <h3 className="font-medium">Browser Bee</h3>
          <p className="text-sm text-muted-foreground">
            基于 WXT + React 构建的浏览器 AI 助手扩展
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">版本</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">技术栈</span>
            <span>WXT, React 19, Tailwind CSS</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="mb-2 text-sm font-medium">功能特点</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>侧边栏聊天 - 在浏览器侧边栏与 AI 实时对话</li>
            <li>网页内容提取 - 自动读取当前页面内容作为上下文</li>
            <li>多标签页支持 - 管理多个标签页的独立对话</li>
            <li>流式响应 - 实时显示 AI 回复</li>
            <li>兼容 OpenAI API - 支持任何 OpenAI 兼容的 API 服务</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <a
            href="https://github.com/user/browser-bee"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            GitHub 仓库
          </a>
        </div>
      </div>
    </div>
  );
}
