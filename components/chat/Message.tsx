import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function Message({ role, content }: MessageProps) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }

  // AI 消息：使用 markdown 渲染
  // 检查是否为错误消息
  const isError = content.startsWith('错误:') || content.startsWith('错误：');

  return (
    <div className={cn(
      "prose prose-sm max-w-none dark:prose-invert",
      "prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
      "prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg",
      "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
      isError ? "text-destructive" : "text-foreground"
    )}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
