'use client';

import { ShortcutTooltip } from '@/components/shortcut-tooltip';

import type { ReviewPreview } from '@/lib/fsrs';

interface DifficultyButtonsProps {
  onSelect: (difficulty: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
  previews?: ReviewPreview | null;
}

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Again', previewKey: 'again' as const },
  { value: 2, label: 'Hard', previewKey: 'hard' as const },
  { value: 3, label: 'Good', previewKey: 'good' as const },
  { value: 4, label: 'Easy', previewKey: 'easy' as const },
];

/** Four FSRS rating buttons styled as a single cohesive segmented control. */
export function DifficultyButtons({ onSelect, disabled, previews }: DifficultyButtonsProps) {
  return (
    <div className="inline-flex w-full items-stretch rounded-xl bg-muted/40 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03]">
      {DIFFICULTY_OPTIONS.map((opt, i) => (
        <ShortcutTooltip key={opt.value} label={opt.label} shortcuts={String(opt.value)}>
          <button
            type="button"
            onClick={() => onSelect(opt.value as 1 | 2 | 3 | 4)}
            disabled={disabled}
            className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 transition-all hover:bg-background hover:shadow-sm active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 sm:px-4 sm:py-3 ${
              i < DIFFICULTY_OPTIONS.length - 1 ? 'after:absolute after:right-0 after:top-1/2 after:h-4 after:w-px after:-translate-y-1/2 after:bg-black/[0.06]' : ''
            }`}
          >
            <span className="text-sm font-medium -tracking-[0.01em]">{opt.label}</span>
            <span className="text-[11px] text-muted-foreground/40">{previews?.[opt.previewKey] ?? '...'}</span>
          </button>
        </ShortcutTooltip>
      ))}
    </div>
  );
}
