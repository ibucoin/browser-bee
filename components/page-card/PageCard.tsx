import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';

interface PageInfo {
  title: string;
  url: string;
  favicon?: string;
}

export function PageCard() {
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    title: '加载中...',
    url: '',
  });

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        setPageInfo({
          title: tab.title || '未知页面',
          url: tab.url || '',
          favicon: tab.favIconUrl,
        });
      }
    });
  }, []);

  const hostname = pageInfo.url ? new URL(pageInfo.url).hostname : '';

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
      <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center">
        {pageInfo.favicon ? (
          <img src={pageInfo.favicon} alt="" className="w-4 h-4" />
        ) : (
          <Globe className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{hostname || pageInfo.title}</p>
      </div>
    </div>
  );
}
