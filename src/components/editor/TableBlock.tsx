import React, { useEffect, useRef, useState } from 'react';
import { GripHorizontal, GripVertical } from 'lucide-react';
import { Block, BlockProperties, BlockTableData } from '../../types';

type Selection = { kind: 'row' | 'column'; index: number };
export function TableBlock({ block, readOnly, onChange }: {
  block: Block; readOnly: boolean; onChange: (content: string, properties: BlockProperties) => void;
}) {
  const data = block.properties?.tableData || { headers: ['Công việc', 'Người phụ trách', 'Trạng thái'], rows: [['', '', '']] };
  const [selection, setSelection] = useState<Selection | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const start = useRef<{ row: number; column: number } | null>(null);
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setSelection(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelection(null); };
    const release = () => { start.current = null; };
    document.addEventListener('mousedown', outside);
    document.addEventListener('mouseup', release);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('mouseup', release);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  const save = (next: BlockTableData) => onChange(block.content, { ...block.properties, tableData: next });
  const insertRow = (index: number) => {
    const rows = data.rows.map(row => [...row]);
    rows.splice(index, 0, data.headers.map(header => header.toLowerCase().includes('trạng thái') ? 'Chưa bắt đầu' : ''));
    save({ ...data, rows }); setSelection(null);
  };
  const insertColumn = (index: number) => {
    const headers = [...data.headers]; headers.splice(index, 0, '');
    const rows = data.rows.map(row => { const next = [...row]; next.splice(index, 0, ''); return next; });
    save({ headers, rows }); setSelection(null);
  };
  const remove = () => {
    if (!selection) return;
    if (selection.kind === 'row') save({ ...data, rows: data.rows.filter((_, index) => index !== selection.index) });
    else if (data.headers.length > 1) save({ headers: data.headers.filter((_, index) => index !== selection.index), rows: data.rows.map(row => row.filter((_, index) => index !== selection.index)) });
    setSelection(null);
  };
  const select = (kind: Selection['kind'], index: number) => { if (!readOnly) setSelection({ kind, index }); };
  const selected = (row: number, column: number) => selection && (selection.kind === 'row' ? selection.index === row : selection.index === column);
  const finishDrag = (row: number, column: number) => {
    const from = start.current; start.current = null;
    if (!from || readOnly) return;
    if (row >= 0 && from.row === row && Math.min(from.column, column) === 0 && Math.max(from.column, column) === data.headers.length - 1 && from.column !== column) select('row', row);
    else if (from.column === column && Math.min(from.row, row) <= 0 && Math.max(from.row, row) === data.rows.length - 1 && from.row !== row) select('column', column);
  };
  const cellClass = 'border-r border-[var(--ui-border)] px-3.5 py-2.5 last:border-r-0';
  return <div ref={root} className="relative my-2.5 w-full">
    <div className="overflow-x-auto rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)]">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="border-b border-[var(--ui-border)] bg-[var(--ui-panel)]">
          {!readOnly && <tr aria-label="Chọn cột">
            <th className="w-7" />
            {data.headers.map((_, column) => <th key={column} className={selected(-1, column) ? 'bg-blue-100' : ''}>
              <button type="button" aria-label={`Chọn cột ${column + 1}`} onClick={() => select('column', column)}
                className="flex h-5 w-full items-center justify-center text-[var(--ui-tertiary)] hover:bg-[var(--ui-hover)]"><GripHorizontal className="h-3.5 w-3.5" /></button>
            </th>)}
          </tr>}
          <tr>
            {!readOnly && <th className="w-7" />}
            {data.headers.map((header, column) => <th key={column} className={`${cellClass} ${selected(-1, column) ? 'bg-blue-100' : ''}`}
              onMouseDown={() => { start.current = { row: -1, column }; }} onMouseUp={() => finishDrag(-1, column)}>
              <input aria-label={`Tiêu đề cột ${column + 1}`} disabled={readOnly} value={header}
                onChange={event => save({ ...data, headers: data.headers.map((value, index) => index === column ? event.target.value : value) })}
                className="w-full bg-transparent font-semibold outline-none" />
            </th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ui-border)]">
          {data.rows.map((row, rowIndex) => <tr key={rowIndex}>
            {!readOnly && <td className={selection?.kind === 'row' && selection.index === rowIndex ? 'bg-blue-100' : ''}>
              <button type="button" aria-label={`Chọn hàng ${rowIndex + 1}`} onClick={() => select('row', rowIndex)}
                className="flex h-full min-h-8 w-7 items-center justify-center text-[var(--ui-tertiary)] hover:bg-[var(--ui-hover)]"><GripVertical className="h-3.5 w-3.5" /></button>
            </td>}
            {data.headers.map((header, column) => {
              const cell = row[column] || '';
              const update = (value: string) => save({ ...data, rows: data.rows.map((values, index) => index === rowIndex ? data.headers.map((_, col) => col === column ? value : values[col] || '') : values) });
              return <td key={column} className={`${cellClass} ${selected(rowIndex, column) ? 'bg-blue-100' : ''}`}
                onMouseDown={() => { start.current = { row: rowIndex, column }; }} onMouseUp={() => finishDrag(rowIndex, column)}>
                {header.toLowerCase().includes('trạng thái') ? <button type="button" disabled={readOnly}
                  onClick={() => { const statuses = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Chờ duyệt']; update(statuses[(statuses.indexOf(cell) + 1) % statuses.length]); }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#EAEAEC] px-2.5 py-1 text-xs font-medium text-[var(--ui-text)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#6E6E73]" />{cell || 'Chưa bắt đầu'}
                </button> : <input aria-label={`Hàng ${rowIndex + 1}, cột ${column + 1}`} disabled={readOnly} value={cell} placeholder="..." onChange={event => update(event.target.value)} className="w-full bg-transparent outline-none" />}
              </td>;
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
    {!readOnly && selection && <div role="dialog" aria-label={selection.kind === 'row' ? 'Thao tác hàng' : 'Thao tác cột'}
      className="absolute left-8 top-full z-30 mt-1 min-w-52 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-1.5 text-xs shadow-lg">
      <button type="button" onClick={remove} disabled={selection.kind === 'column' && data.headers.length <= 1}
        className="block w-full rounded-md px-3 py-2 text-left text-red-500 hover:bg-[var(--ui-hover)] disabled:opacity-40">{selection.kind === 'row' ? 'Xóa hàng' : 'Xóa cột'}</button>
      <button type="button" onClick={() => selection.kind === 'row' ? insertRow(selection.index) : insertColumn(selection.index)} className="block w-full rounded-md px-3 py-2 text-left hover:bg-[var(--ui-hover)]">{selection.kind === 'row' ? 'Thêm hàng phía trên' : 'Thêm cột bên trái'}</button>
      <button type="button" onClick={() => selection.kind === 'row' ? insertRow(selection.index + 1) : insertColumn(selection.index + 1)} className="block w-full rounded-md px-3 py-2 text-left hover:bg-[var(--ui-hover)]">{selection.kind === 'row' ? 'Thêm hàng bên dưới' : 'Thêm cột bên phải'}</button>
    </div>}
  </div>;
}
