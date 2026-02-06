'use client';

import { Button } from '@/components/ui/button';

interface DifficultyButtonsProps {
  onSelect: (difficulty: number) => void;
  disabled?: boolean;
}

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Again', variant: 'destructive' as const },
  { value: 2, label: 'Hard', variant: 'outline' as const },
  { value: 3, label: 'Good', variant: 'secondary' as const },
  { value: 4, label: 'Easy', variant: 'default' as const },
];

/** Four difficulty rating buttons (1=Again to 4=Easy) shown after a correct answer */
export function DifficultyButtons({ onSelect, disabled }: DifficultyButtonsProps) {
  return (
    <div className="flex gap-2">
      {DIFFICULTY_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={opt.variant}
          onClick={() => onSelect(opt.value)}
          disabled={disabled}
          className="flex-1"
        >
          {opt.label} ({opt.value})
        </Button>
      ))}
    </div>
  );
}
