import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageAttachment } from '@/lib/types';

export interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  displayContent?: string;
  attachedImages?: ImageAttachment[];
}

export function Message({ role, content, displayContent, attachedImages }: MessageProps) {
  const { t } = useTranslation();
  const isUser = role === 'user';
  // 如果有 displayContent，显示它；否则显示 content
  const textToShow = displayContent || content;
  // 是否为快捷方式消息（有 displayContent 且与 content 不同）
  const isShortcut = displayContent && displayContent !== content;

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-2">
        {/* 图片附件 */}
        {attachedImages && attachedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end max-w-[85%]">
            {attachedImages.map((img) => (
              <img
                key={img.id}
                src={img.dataUrl}
                alt={img.name}
                className="max-h-48 max-w-[200px] rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        {/* 快捷方式卡片 - 与 TabCard 样式一致 */}
        {isShortcut && textToShow && (
          <div className="flex items-center gap-2 rounded-xl bg-muted/80 px-3 py-2 shadow-sm w-[200px]">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-background">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{textToShow}</p>
              <p className="text-xs text-muted-foreground">{t('shortcutCommand')}</p>
            </div>
          </div>
        )}
        {/* 普通文字消息 */}
        {!isShortcut && textToShow && (
          <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            {textToShow}
          </div>
        )}
      </div>
    );
  }

  // AI 消息：使用 markdown 渲染
  // 检查是否为错误消息
  const isError = content.startsWith(t('error')) || content.startsWith('错误:') || content.startsWith('错误：') || content.startsWith('Error:');

  return (
    <div className={cn(
      "prose prose-sm max-w-none dark:prose-invert",
      "prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
      "prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg",
      "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
      isError ? "text-destructive" : "text-foreground"
    )}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
