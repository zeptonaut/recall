import { Badge } from '@/components/ui/badge';
import type { MasteryTier } from '@/lib/fsrs';

interface CardListItemProps {
  prompt: string;
  response: string;
  mastery: MasteryTier;
  retrievability: number;
  showResponse?: boolean;
}

/** Card row with mastery and recall-probability context. */
export function CardListItem({
  prompt,
  response,
  mastery,
  retrievability,
  showResponse = true,
}: CardListItemProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="whitespace-pre-wrap break-words font-medium">{prompt}</div>
        {showResponse ? (
          <div className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{response}</div>
        ) : null}
      </div>
      <div className="hidden min-w-40 justify-end gap-2 sm:flex">
        <Badge variant="outline" className="capitalize">
          {mastery}
        </Badge>
        <Badge variant="secondary">{Math.round(retrievability * 100)}%</Badge>
      </div>
    </div>
  );
}
