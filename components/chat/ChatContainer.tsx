import { Message, MessageProps } from './Message';
import { PageCard } from '@/components/page-card/PageCard';

const mockMessages: MessageProps[] = [
  { role: 'user', content: '你好，请帮我总结一下这个页面的内容。' },
  {
    role: 'assistant',
    content:
      '好的！我来帮你总结这个页面的主要内容。这是一个示例对话，展示了 Browser Bee 的基本界面。',
  },
];

export function ChatContainer() {
  return (
    <div className="space-y-3">
      <PageCard />
      <div className="space-y-3">
        {mockMessages.map((message, index) => (
          <Message key={index} {...message} />
        ))}
      </div>
    </div>
  );
}
