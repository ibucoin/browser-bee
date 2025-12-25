import { cn } from '@/lib/utils';

export interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function Message({ role, content }: MessageProps) {
  const isUser = role === 'user';

  if (isUser) {
    // 用户消息：保持气泡样式，右对齐
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }

  // AI 消息：直接渲染，无气泡限制
  return (
    <div className="text-sm text-foreground whitespace-pre-wrap">
      {content}
    </div>
  );
}
