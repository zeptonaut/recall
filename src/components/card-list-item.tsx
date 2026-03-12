import { CardContentDisplay } from '@/components/card-content-display';

interface CardListItemProps {
  prompt: string;
  response: string;
  showResponse?: boolean;
}

/** Card row displaying prompt and optional response. */
export function CardListItem({
  prompt,
  response,
  showResponse = true,
}: CardListItemProps) {
  return (
    <div className="py-3 first:pt-0">
      <div className="space-y-3">
        <CardContentDisplay
          content={prompt}
          className="space-y-2"
          imageClassName="max-h-40"
          textClassName="text-foreground/90"
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
    </div>
  );
}
