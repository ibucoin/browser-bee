import { useState } from 'react';
import { Settings, Sliders, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AISettings } from '@/components/settings/AISettings';
import { GeneralSettings } from '@/components/settings/GeneralSettings';

import { ShortcutSettings } from '@/components/settings/ShortcutSettings';

type TabId = 'ai' | 'shortcuts' | 'general';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'ai', label: 'AI 配置', icon: <Settings className="h-4 w-4" /> },
  { id: 'shortcuts', label: '快捷操作', icon: <Zap className="h-4 w-4" /> },
  { id: 'general', label: '通用设置', icon: <Sliders className="h-4 w-4" /> },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('ai');

  const renderContent = () => {
    switch (activeTab) {
      case 'ai':
        return <AISettings />;
      case 'shortcuts':
        return <ShortcutSettings />;
      case 'general':
        return <GeneralSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* 左侧 Tab 导航 */}
      <aside className="w-56 border-r bg-muted/30 p-4">
        <h1 className="mb-6 text-lg font-semibold">Browser Bee 设置</h1>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
