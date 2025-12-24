import { Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageCardProps {
  title: string;
  url: string;
  favicon?: string;
  onClose?: () => void;
}

export function PageCard({ title, url, favicon, onClose }: PageCardProps) {

  return (
    <div className="group relative flex w-[200px] shrink-0 items-center gap-2 rounded-lg bg-muted px-2 py-1.5">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-background/80 overflow-hidden">
        {favicon ? (
          <img src={favicon} alt="" className="h-4 w-4 rounded-full" />
        ) : (
          <Globe className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">{title}</p>
        <p className="truncate text-[11px] py-1 text-muted-foreground">{url}</p>
      </div>
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
