import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MasteryTier } from '@/lib/fsrs';

const masteryBadgeStyles: Record<MasteryTier, string> = {
  new: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
  learning: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  familiar: 'border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
  mastered: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
};

interface MasteryBadgeProps {
  mastery: MasteryTier;
  count?: number;
  className?: string;
}

export function MasteryBadge({ mastery, count, className }: MasteryBadgeProps) {
  const label = mastery.charAt(0).toUpperCase() + mastery.slice(1);

  return (
    <Badge variant="outline" className={cn('capitalize', masteryBadgeStyles[mastery], className)}>
      {label}
      {typeof count === 'number' ? ` ${count}` : null}
    </Badge>
  );
}
