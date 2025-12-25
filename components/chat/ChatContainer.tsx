import { Message } from './Message';
import { useChatStore } from '@/lib/chat-store.tsx';

export function ChatContainer() {
  const { getCurrentChat } = useChatStore();
  const chat = getCurrentChat();
  const messages = chat?.messages ?? [];

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        开始新的对话...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {messages.map((message) => (
          <Message key={message.id} role={message.role} content={message.content} />
        ))}
      </div>
    </div>
  );
}
