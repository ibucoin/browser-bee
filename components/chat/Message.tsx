import { cn } from '@/lib/utils';

export interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function Message({ role, content }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {content}
      </div>
    </div>
  );
}
