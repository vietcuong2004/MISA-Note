import type React from 'react';

function lineBounds(input: HTMLTextAreaElement, caret: number) {
  const value = input.value;
  const explicitStart = value.slice(0, caret).lastIndexOf('\n') + 1;
  const newline = value.indexOf('\n', caret);
  const explicitEnd = newline === -1 ? value.length : newline;
  if (!input.clientWidth) return { start: explicitStart, end: explicitEnd, first: explicitStart === 0, last: explicitEnd === value.length };

  // Mirror the textarea's wrapping so arrows still move naturally within long lines.
  const mirror = document.createElement('div');
  const style = getComputedStyle(input);
  for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'padding', 'border-width', 'box-sizing', 'word-break', 'tab-size']) {
    mirror.style.setProperty(property, style.getPropertyValue(property));
  }
  Object.assign(mirror.style, { position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', width: `${input.getBoundingClientRect().width}px` });
  const marker = document.createElement('span');
  marker.textContent = '\u200b';
  const before = document.createTextNode('');
  mirror.append(before, marker);
  document.body.append(mirror);
  try {
    const top = (position: number) => { before.textContent = value.slice(0, position); return marker.offsetTop; };
    const current = top(caret);
    let low = 0; let high = caret;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (top(middle) < current) low = middle + 1; else high = middle;
    }
    const start = low;
    low = caret; high = value.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (top(middle) > current) high = middle - 1; else low = middle;
    }
    return { start, end: low, first: current === top(0), last: current === top(value.length) };
  } finally { mirror.remove(); }
}

export function navigateEditorArrow(event: React.KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowUp', 'ArrowDown'].includes(event.key) || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing) return;
  const input = event.target;
  if (!(input instanceof HTMLTextAreaElement) || !event.currentTarget.contains(input) || input.selectionStart !== input.selectionEnd) return;
  const caret = input.selectionStart;
  const line = lineBounds(input, caret);
  const up = event.key === 'ArrowUp';
  if (up ? !line.first : !line.last) return;
  const fields = Array.from(event.currentTarget.querySelectorAll<HTMLTextAreaElement | HTMLButtonElement>(
    'textarea:not(:disabled), [data-list-exit-for] button[aria-label="Gõ văn bản bên dưới danh sách"]'
  ));
  const target = fields[fields.indexOf(input) + (up ? -1 : 1)];
  if (!target) return;
  event.preventDefault(); event.stopPropagation();
  if (!(target instanceof HTMLTextAreaElement)) { target.click(); return; }
  const destination = lineBounds(target, up ? target.value.length : 0);
  const offset = Math.min(destination.start + caret - line.start, destination.end);
  target.focus(); target.setSelectionRange(offset, offset);
  target.scrollIntoView({ block: 'nearest' });
}
