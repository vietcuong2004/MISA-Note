import React, { useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Block, BlockProperties } from '../../types';
import { listLevel, listNumbers } from '../../utils/listLevels';

type Item = NonNullable<BlockProperties['listItems']>[number];

export function ListBlock({ block, readOnly, autoFocus, onChange }: {
  block: Block; readOnly: boolean; autoFocus: boolean;
  onChange: (content: string, properties: BlockProperties) => void;
}) {
  const items: Item[] = block.properties?.listItems?.length ? block.properties.listItems
    : [{ id: `${block.id}-item`, content: block.content, checked: !!block.properties?.checked }];
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const [focus, setFocus] = useState<{ id: string; offset: number } | null>(null);
  const save = (next: Item[]) => onChange(next.map(item => item.content).join('\n'), { ...block.properties, listItems: next });

  useLayoutEffect(() => {
    inputs.current.forEach(input => { input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; });
  }, [block.content, block.properties?.listItems]);
  useLayoutEffect(() => {
    if (!autoFocus || readOnly) return;
    const first = inputs.current.values().next().value;
    first?.focus(); first?.setSelectionRange(0, 0);
  }, [autoFocus, readOnly]);
  useLayoutEffect(() => {
    if (!focus || readOnly) return;
    const input = inputs.current.get(focus.id);
    input?.focus(); input?.setSelectionRange(focus.offset, focus.offset);
    input?.scrollIntoView({ block: 'nearest' });
  }, [focus, readOnly]);

  const Tag = block.type === 'numbered' ? 'ol' : 'ul';
  const numbers = listNumbers(items);
  return <div data-list-kind={block.type} className="w-full">
    <Tag className="m-0 list-none p-0 space-y-1">
      {items.map((item, index) => <li key={item.id} className="flex items-start gap-2" data-list-item={item.id}
        data-level={listLevel(item)} style={{ marginLeft: `${(listLevel(item) - 1) * 24}px` }}>
        {block.type === 'checklist' ? <button type="button" role="checkbox" aria-checked={!!item.checked}
          aria-label={`Hoàn thành mục ${index + 1}`} disabled={readOnly}
          onClick={() => save(items.map(current => current.id === item.id ? { ...current, checked: !current.checked } : current))}
          className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${item.checked
            ? 'bg-[var(--ui-primary)] border-[var(--ui-primary)] text-white' : 'border-[var(--ui-border-strong)]'}`}>
          {item.checked && <Check className="h-3 w-3" />}
        </button> : <span aria-hidden="true" className={`inline-flex h-6 min-w-5 shrink-0 items-center justify-center leading-6 text-[var(--ui-text)] ${block.type === 'numbered' ? 'text-sm' : 'text-base'}`}>
          {block.type === 'numbered' ? `${numbers[index]}.` : ['–', '●', '○', '■'][listLevel(item) - 1]}
        </span>}
        <textarea ref={node => { if (node) inputs.current.set(item.id, node); else inputs.current.delete(item.id); }}
          rows={1} disabled={readOnly} aria-label={`Nội dung mục ${index + 1}`} value={item.content}
          placeholder={block.type === 'checklist' ? 'Việc cần làm...' : 'Nội dung danh sách...'}
          className={`block w-full min-w-0 resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-[var(--ui-tertiary)] ${item.checked && block.type === 'checklist' ? 'line-through text-[var(--ui-tertiary)]' : 'text-[var(--ui-text)]'}`}
          onChange={event => save(items.map(current => current.id === item.id ? { ...current, content: event.target.value } : current))}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Tab') {
              event.preventDefault(); event.stopPropagation();
              const level = Math.max(1, Math.min(4, listLevel(item) + (event.shiftKey ? -1 : 1)));
              if (level !== listLevel(item)) save(items.map(current => current.id === item.id ? { ...current, level } : current));
            } else if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault(); event.stopPropagation();
              const start = event.currentTarget.selectionStart;
              const end = event.currentTarget.selectionEnd;
              const next = { id: `list_${crypto.randomUUID()}`, content: item.content.slice(end), checked: false, level: listLevel(item) };
              const updated = [...items];
              updated.splice(index, 1, { ...item, content: item.content.slice(0, start) }, next);
              save(updated); setFocus({ id: next.id, offset: 0 });
            } else if (event.key === 'Backspace' && event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0 && index > 0) {
              event.preventDefault(); event.stopPropagation();
              const previous = items[index - 1];
              const updated = [...items];
              updated.splice(index - 1, 2, { ...previous, content: previous.content + item.content });
              save(updated); setFocus({ id: previous.id, offset: previous.content.length });
            }
          }} />
      </li>)}
    </Tag>
  </div>;
}
