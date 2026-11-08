import React from 'react';
import { Check } from 'lucide-react';
import { THEMES, ThemeId } from '../../app/theme/themes';

export function ThemePicker({ theme, onChange }: { theme: ThemeId; onChange: (theme: ThemeId) => void }) {
  return <div id="appearance-options" role="radiogroup" aria-label="Chọn giao diện" className="px-3 pb-2 space-y-1">
    {THEMES.map((option, index) => <button key={option.id} id={`theme-option-${option.id}`} type="button"
      role="radio" aria-checked={theme === option.id} aria-label={option.name}
      tabIndex={theme === option.id ? 0 : -1} onClick={() => onChange(option.id)}
      onKeyDown={event => {
        if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? THEMES.length - 1 :
          (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + THEMES.length) % THEMES.length;
        onChange(THEMES[next].id);
        document.getElementById(`theme-option-${THEMES[next].id}`)?.focus();
      }}
      className={`w-full flex items-center gap-2.5 rounded-lg p-2 text-left border transition-colors ${theme === option.id ? 'border-[var(--ui-accent)] bg-[var(--ui-selected)]' : 'border-transparent hover:bg-[var(--ui-hover)]'}`}>
      <span aria-hidden="true" className="w-10 h-9 rounded-md overflow-hidden border border-black/10 shrink-0" style={{ background: option.colors[1] }}>
        <span className="block h-2" style={{ background: option.colors[0] }} />
        <span className="flex h-7"><span className="block w-3" style={{ background: option.colors[0], opacity: 0.85 }} />
          <span className="block m-1 h-1 w-5 rounded-sm" style={{ background: option.colors[2] }} /></span>
      </span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-[var(--ui-text)]">{option.name}</span>
        <span className="block text-[10px] leading-4 text-[var(--ui-muted)]">{option.description}</span></span>
      {theme === option.id && <Check className="w-4 h-4 shrink-0 text-[var(--ui-accent)]" />}
    </button>)}
  </div>;
}
