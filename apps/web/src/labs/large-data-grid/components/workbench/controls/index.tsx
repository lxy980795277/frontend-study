'use client';

import {
  AlertTriangle,
  Clipboard,
  RotateCcw,
  Search,
  SlidersHorizontal,
  SquareDashedMousePointer,
  Zap,
} from 'lucide-react';
import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GridColumn, GridQuery, GridRendererKind } from '@/labs/large-data-grid/types/grid';
interface GridControlsProps {
  columnCount: number;
  columnOverscan: number;
  columns: readonly GridColumn[];
  onApplyQuery: (query: GridQuery) => void;
  onColumnCountChange: (value: number) => void;
  onColumnOverscanChange: (value: number) => void;
  onCopy: () => void;
  onInjectFailure: () => void;
  onJump: (row: number) => void;
  onRendererChange: (renderer: GridRendererKind) => void;
  onReset: () => void;
  onRowCountChange: (value: number) => void;
  onRowOverscanChange: (value: number) => void;
  onSelectAll: () => void;
  renderer: GridRendererKind;
  rowCount: number;
  rowOverscan: number;
}
const RENDERER_OPTIONS: readonly {
  label: string;
  value: GridRendererKind;
}[] = [
  {
    label: 'DOM 双向虚拟化',
    value: 'dom',
  },
  {
    label: '主线程 Canvas',
    value: 'main-canvas',
  },
  {
    label: 'Worker Offscreen',
    value: 'worker-offscreen',
  },
];
export const GridControls: FC<GridControlsProps> = ({
  columnCount,
  columnOverscan,
  columns,
  onApplyQuery,
  onColumnCountChange,
  onColumnOverscanChange,
  onCopy,
  onInjectFailure,
  onJump,
  onRendererChange,
  onReset,
  onRowCountChange,
  onRowOverscanChange,
  onSelectAll,
  renderer,
  rowCount,
  rowOverscan,
}) => {
  const filterableColumns = columns.filter((column) => {
    return column.filterable;
  });
  const sortableColumns = columns.filter((column) => {
    return column.sortable;
  });
  const [filterText, setFilterText] = useState('');
  const [filterColumnId, setFilterColumnId] = useState(
    filterableColumns.find((column) => {
      return column.kind === 'status';
    })?.id ??
      filterableColumns[0]?.id ??
      'column-1',
  );
  const [sortColumnId, setSortColumnId] = useState('none');
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');
  const [jumpRow, setJumpRow] = useState('500000');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const submitQuery = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalizedFilter = filterText.trim();
    onApplyQuery({
      filter:
        normalizedFilter.length === 0
          ? null
          : {
              columnIds: [filterColumnId],
              text: normalizedFilter,
            },
      sort:
        sortColumnId === 'none'
          ? null
          : {
              columnId: sortColumnId,
              direction: sortDirection,
            },
    });
  };
  const submitJump = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const parsed = Number.parseInt(jumpRow, 10);
    if (Number.isFinite(parsed)) {
      onJump(parsed);
    }
  };
  return (
    <div className="min-w-0 rounded-lg border bg-card p-2 shadow-sm">
      <div aria-label="表格常用操作" className="min-w-0 overflow-x-auto">
        <div className="flex min-w-max items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Renderer</span>
          <Select
            value={renderer}
            onValueChange={(value) => {
              onRendererChange(value as GridRendererKind);
            }}
          >
            <SelectTrigger aria-label="Renderer" className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RENDERER_OPTIONS.map((option) => {
                return (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <span className="ml-1 text-[11px] font-medium text-muted-foreground">查询</span>
          <form className="flex items-center gap-2" onSubmit={submitQuery}>
            <Select value={filterColumnId} onValueChange={setFilterColumnId}>
              <SelectTrigger aria-label="过滤字段" className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterableColumns.slice(0, 24).map((column) => {
                  return (
                    <SelectItem key={column.id} value={column.id}>
                      {column.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Input
              aria-label="过滤关键词"
              className="h-8 w-44"
              placeholder="ready / Trace 42"
              value={filterText}
              onChange={(event) => {
                setFilterText(event.currentTarget.value);
              }}
            />
            <Button aria-label="应用查询" size="sm" type="submit">
              <Search aria-hidden className="size-3.5" />
              查询
            </Button>
          </form>

          <span className="ml-1 text-[11px] font-medium text-muted-foreground">行</span>
          <form className="flex items-center gap-2" onSubmit={submitJump}>
            <Input
              aria-label="跳转到显示行"
              className="h-8 w-28"
              max={rowCount}
              min={1}
              type="number"
              value={jumpRow}
              onChange={(event) => {
                setJumpRow(event.currentTarget.value);
              }}
            />
            <Button size="sm" type="submit" variant="outline">
              <Zap aria-hidden className="size-3.5" />
              跳转
            </Button>
          </form>

          <Button size="sm" variant="outline" onClick={onSelectAll}>
            <SquareDashedMousePointer aria-hidden className="size-3.5" />
            全选
          </Button>
          <Button size="sm" variant="outline" onClick={onCopy}>
            <Clipboard aria-hidden className="size-3.5" />
            复制 TSV
          </Button>
          <Button
            aria-controls="large-data-grid-advanced-controls"
            aria-expanded={advancedOpen}
            size="sm"
            variant="outline"
            onClick={() => {
              setAdvancedOpen((current) => {
                return !current;
              });
            }}
          >
            <SlidersHorizontal aria-hidden className="size-3.5" />
            更多设置
          </Button>
          <Button size="sm" variant="ghost" onClick={onReset}>
            <RotateCcw aria-hidden className="size-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {advancedOpen && (
        <div className="mt-2 min-w-0 overflow-x-auto border-t pt-2" id="large-data-grid-advanced-controls">
          <div className="flex min-w-max items-end gap-2">
            <ControlField label="数据行数">
              <Select
                value={String(rowCount)}
                onValueChange={(value) => {
                  onRowCountChange(Number.parseInt(value, 10));
                }}
              >
                <SelectTrigger aria-label="数据行数" className="h-8 min-w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000000">1,000,000（默认验证）</SelectItem>
                  <SelectItem value="100000">100,000（调试）</SelectItem>
                  <SelectItem value="10000">10,000（调试）</SelectItem>
                </SelectContent>
              </Select>
            </ControlField>

            <ControlField label="列数">
              <Select
                value={String(columnCount)}
                onValueChange={(value) => {
                  onColumnCountChange(Number.parseInt(value, 10));
                }}
              >
                <SelectTrigger aria-label="列数" className="h-8 min-w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100（默认）</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </ControlField>

            <ControlField label="行 Overscan">
              <Input
                aria-label="行 Overscan"
                className="h-8 w-24"
                max={20}
                min={0}
                type="number"
                value={rowOverscan}
                onChange={(event) => {
                  onRowOverscanChange(event.currentTarget.valueAsNumber);
                }}
              />
            </ControlField>

            <ControlField label="列 Overscan">
              <Input
                aria-label="列 Overscan"
                className="h-8 w-24"
                max={10}
                min={0}
                type="number"
                value={columnOverscan}
                onChange={(event) => {
                  onColumnOverscanChange(event.currentTarget.valueAsNumber);
                }}
              />
            </ControlField>

            <ControlField label="排序字段">
              <Select value={sortColumnId} onValueChange={setSortColumnId}>
                <SelectTrigger aria-label="排序字段" className="h-8 min-w-40">
                  <SelectValue placeholder="不排序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不排序</SelectItem>
                  {sortableColumns.slice(0, 24).map((column) => {
                    return (
                      <SelectItem key={column.id} value={column.id}>
                        {column.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </ControlField>

            <ControlField label="排序方向">
              <Select
                value={sortDirection}
                onValueChange={(value) => {
                  setSortDirection(value as 'ascending' | 'descending');
                }}
              >
                <SelectTrigger aria-label="排序方向" className="h-8 min-w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ascending">升序</SelectItem>
                  <SelectItem value="descending">降序</SelectItem>
                </SelectContent>
              </Select>
            </ControlField>

            <Button disabled={renderer !== 'worker-offscreen'} size="sm" variant="outline" onClick={onInjectFailure}>
              <AlertTriangle aria-hidden className="size-3.5" />
              注入 Worker 故障
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
interface ControlFieldProps {
  children: React.ReactNode;
  label: string;
}
const ControlField: FC<ControlFieldProps> = ({ children, label }) => {
  return (
    <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
};
