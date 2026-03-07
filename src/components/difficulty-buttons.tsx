'use client';

import { ShortcutTooltip } from '@/components/shortcut-tooltip';
import { Button } from '@/components/ui/button';
import type { ReviewPreview } from '@/lib/fsrs';

interface DifficultyButtonsProps {
  onSelect: (difficulty: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
  previews?: ReviewPreview | null;
}

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Again', variant: 'destructive' as const, previewKey: 'again' as const },
  { value: 2, label: 'Hard', variant: 'outline' as const, previewKey: 'hard' as const },
  { value: 3, label: 'Good', variant: 'secondary' as const, previewKey: 'good' as const },
  { value: 4, label: 'Easy', variant: 'default' as const, previewKey: 'easy' as const },
];

/** Four FSRS rating buttons with optional interval previews. */
export function DifficultyButtons({ onSelect, disabled, previews }: DifficultyButtonsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {DIFFICULTY_OPTIONS.map((opt) => (
        <ShortcutTooltip key={opt.value} label={opt.label} shortcuts={String(opt.value)}>
          <Button
            variant={opt.variant}
            onClick={() => onSelect(opt.value as 1 | 2 | 3 | 4)}
            disabled={disabled}
            className="h-auto min-h-16 flex-col py-3"
          >
            <span>{opt.label}</span>
            <span className="text-xs opacity-80">{previews?.[opt.previewKey] ?? '...'}</span>
          </Button>
        </ShortcutTooltip>
      ))}
    </div>
  );
}
