import { X, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ElementInfo } from '@/lib/types';

interface ElementCardProps {
  element: ElementInfo;
  onClose?: () => void;
}

export function ElementCard({ element, onClose }: ElementCardProps) {
  const [expanded, setExpanded] = useState(false);
  const contentPreview = element.textContent.slice(0, 200);
  const hasMoreContent = element.textContent.length > 200;

  return (
    <div className="group relative flex w-[200px] shrink-0 flex-col rounded-lg bg-purple-50 dark:bg-purple-950/30 px-2 py-1.5 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50 overflow-hidden">
          <Code className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            &lt;{element.tagName}&gt;
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {element.selector.length > 30 
              ? element.selector.slice(0, 30) + '...' 
              : element.selector}
          </p>
        </div>
      </div>
      
      {contentPreview && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? '收起' : '查看内容'}
          </button>
          {expanded && (
            <div className="mt-1 max-h-32 overflow-y-auto rounded bg-background/50 p-1.5 text-[10px] text-muted-foreground">
              {element.textContent.slice(0, 500)}
              {element.textContent.length > 500 && '...'}
            </div>
          )}
        </>
      )}

      {onClose && (
        <Button
          type="button"
          onClick={onClose}
          variant="secondary"
          size="icon"
          className="absolute -right-2 -top-2 z-10 h-5 w-5 rounded-full opacity-0 shadow-sm transition-colors transition-opacity hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
          aria-label="移除元素"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
