import { Sliders } from 'lucide-react';

export function GeneralSettings() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-lg font-medium">
        <Sliders className="h-5 w-5" />
        通用设置
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          更多设置选项即将推出...
        </p>
      </div>

      {/* 占位，后续可扩展 */}
      {/* 
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">主题</label>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
      </div>
      */}
    </div>
  );
}
