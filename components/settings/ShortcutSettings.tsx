import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Shortcut,
  getShortcutStore,
  addShortcut,
  updateShortcut,
  deleteShortcut,
} from '@/lib/shortcut-store';
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Zap,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 编辑/添加快捷操作弹窗
function ShortcutDialog({
  isOpen,
  onClose,
  onSave,
  shortcut,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; content: string }) => void;
  shortcut?: Shortcut | null;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(shortcut?.title ?? '');
      setContent(shortcut?.content ?? '');
      setError('');
    }
  }, [isOpen, shortcut]);

  const handleSave = () => {
    if (!title.trim()) {
      setError('标题不能为空');
      return;
    }
    onSave({ title: title.trim(), content: content.trim() });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {shortcut ? '编辑快捷操作' : '添加快捷操作'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              标题 <span className="text-destructive">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setError('');
              }}
              placeholder="例如：翻译成中文"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring',
                error && 'border-destructive'
              )}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              内容 <span className="text-muted-foreground text-xs">(可选)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="发送给 AI 的内容，留空则发送标题"
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground">
              如果留空，将发送标题作为消息内容
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-1" />
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}

// 删除确认弹窗
function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  shortcutTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shortcutTitle: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">确认删除</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          确定要删除快捷操作{' '}
          <span className="font-medium text-foreground">"{shortcutTitle}"</span>{' '}
          吗？此操作不可撤销。
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            删除
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ShortcutSettings() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    shortcut: Shortcut | null;
  }>({ isOpen: false, shortcut: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    shortcut: Shortcut | null;
  }>({ isOpen: false, shortcut: null });

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    setLoading(true);
    const store = await getShortcutStore();
    setShortcuts(store.shortcuts);
    setLoading(false);
  };

  const handleAdd = () => {
    setEditDialog({ isOpen: true, shortcut: null });
  };

  const handleEdit = (shortcut: Shortcut) => {
    setEditDialog({ isOpen: true, shortcut });
  };

  const handleSave = async (data: { title: string; content: string }) => {
    if (editDialog.shortcut) {
      // 编辑
      await updateShortcut(editDialog.shortcut.id, data);
    } else {
      // 新增
      await addShortcut(data);
    }
    await loadShortcuts();
  };

  const handleDelete = async () => {
    if (deleteDialog.shortcut) {
      await deleteShortcut(deleteDialog.shortcut.id);
      await loadShortcuts();
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background text-foreground overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-64 border-r flex flex-col bg-muted/10">
        <div className="p-3 border-b">
          <h2 className="font-medium text-sm">快捷操作列表</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              className="group flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm"
            >
              <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{shortcut.title}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(shortcut)}
                  className="p-1 rounded hover:bg-muted-foreground/20"
                  title="编辑"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() =>
                    setDeleteDialog({ isOpen: true, shortcut })
                  }
                  className="p-1 rounded hover:bg-muted-foreground/20"
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={handleAdd}
            className="w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted text-sm border-t mt-2 pt-3"
          >
            <div className="flex items-center justify-center w-5 h-5 rounded border border-dashed border-current">
              <Plus className="h-3 w-3" />
            </div>
            <span>添加快捷操作</span>
          </button>
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {shortcuts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">暂无快捷操作</h3>
            <p className="text-sm text-muted-foreground mb-4">
              快捷操作可以帮助你快速发送常用的提示词
            </p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              添加快捷操作
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">快捷操作</h3>
              <p className="text-sm text-muted-foreground">
                在主对话页面可快速选择这些操作发送给 AI
              </p>
            </div>

            <div className="space-y-3">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="group border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium">{shortcut.title}</span>
                      </div>
                      {shortcut.content ? (
                        <p className="text-sm text-muted-foreground line-clamp-2 ml-6">
                          {shortcut.content}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic ml-6">
                          (发送标题作为内容)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleEdit(shortcut)}
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          setDeleteDialog({ isOpen: true, shortcut })
                        }
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      <ShortcutDialog
        isOpen={editDialog.isOpen}
        onClose={() => setEditDialog({ isOpen: false, shortcut: null })}
        onSave={handleSave}
        shortcut={editDialog.shortcut}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, shortcut: null })}
        onConfirm={handleDelete}
        shortcutTitle={deleteDialog.shortcut?.title ?? ''}
      />
    </div>
  );
}
