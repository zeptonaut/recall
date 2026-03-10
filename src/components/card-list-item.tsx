import { CardContentDisplay } from '@/components/card-content-display';
import { MasteryBadge } from '@/components/mastery-badge';
import type { MasteryTier } from '@/lib/fsrs';

interface CardListItemProps {
  prompt: string;
  response: string;
  mastery: MasteryTier;
  showResponse?: boolean;
}

/** Card row with mastery context. */
export function CardListItem({
  prompt,
  response,
  mastery,
  showResponse = true,
}: CardListItemProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1 space-y-3">
        <CardContentDisplay
          content={prompt}
          className="space-y-2"
          imageClassName="max-h-40"
          textClassName="font-medium"
        />
        {showResponse ? (
          <CardContentDisplay
            content={response}
            className="space-y-2"
            imageClassName="max-h-32"
            textClassName="text-sm text-muted-foreground"
          />
        ) : null}
      </div>
      <div className="hidden min-w-40 justify-end gap-2 sm:flex">
        <MasteryBadge mastery={mastery} />
      </div>
    </div>
  );
}
