import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MasteryTier } from '@/lib/fsrs';

const masteryBadgeStyles: Record<MasteryTier, string> = {
  new: 'border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  learning: 'border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  familiar: 'border-transparent bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  mastered: 'border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
};

interface MasteryBadgeProps {
  mastery: MasteryTier;
  count?: number;
  className?: string;
}

export function MasteryBadge({ mastery, count, className }: MasteryBadgeProps) {
  const label = mastery.charAt(0).toUpperCase() + mastery.slice(1);

  return (
    <Badge variant="outline" className={cn('capitalize rounded-md tracking-tight', masteryBadgeStyles[mastery], className)}>
      {label}
      {typeof count === 'number' ? ` ${count}` : null}
    </Badge>
  );
}
