import { useState } from 'react';
import { Globe, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeGetHostname } from '@/lib/utils';

interface PageCardProps {
  title: string;
  url: string;
  favicon?: string;
  pageContent?: string;
  onClose?: () => void;
}

export function PageCard({ title, url, favicon, pageContent, onClose }: PageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = Boolean(pageContent);
  const contentPreview = pageContent?.slice(0, 500);
  const hostname = safeGetHostname(url);

  return (
    <div className="group relative flex w-[200px] shrink-0 flex-col rounded-lg bg-muted px-2 py-1.5">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-background/80 overflow-hidden">
          {favicon ? (
            <img src={favicon} alt="" className="h-4 w-4 rounded-full" />
          ) : (
            <Globe className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{title}</p>
          <div className="flex items-center gap-1">
            <p className="truncate text-[11px] text-muted-foreground flex-1">{hostname}</p>
            {hasContent && (
              <Check className="h-3 w-3 text-green-500 shrink-0" />
            )}
          </div>
        </div>
      </div>
      {hasContent && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? '收起内容' : '查看内容'}
        </button>
      )}
      {expanded && contentPreview && (
        <div className="mt-1 max-h-32 overflow-y-auto rounded bg-background/50 p-1.5 text-[10px] text-muted-foreground">
          {contentPreview}
          {pageContent && pageContent.length > 500 && '...'}
        </div>
      )}
      {onClose ? (
        <Button
          type="button"
          onClick={onClose}
          variant="secondary"
          size="icon"
          className="absolute -right-2 -top-2 z-10 h-5 w-5 rounded-full opacity-0 shadow-sm transition-colors transition-opacity hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
          aria-label="关闭页面标签"
        >
          <X className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  );
}
