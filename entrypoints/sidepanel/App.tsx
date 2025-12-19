import { Header } from '@/components/header/Header';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ChatInput } from '@/components/chat/ChatInput';

function App() {
  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 overflow-y-auto p-3">
        <ChatContainer />
      </div>
      <ChatInput />
    </div>
  );
}

export default App;
