/* eslint-disable @next/next/no-img-element */

import { parseCardContent } from '@/lib/card-content';
import { cn } from '@/lib/utils';

interface CardContentDisplayProps {
  content: string;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
}

/** Renders card text with inline image markdown support. */
export function CardContentDisplay({
  content,
  className,
  imageClassName,
  textClassName,
}: CardContentDisplayProps) {
  const parts = parseCardContent(content);

  return (
    <div className={cn('space-y-3', className)}>
      {parts.map((part, index) => {
        if (part.type === 'image' && part.value) {
          return (
            <img
              key={`${part.value}-${index}`}
              src={part.value}
              alt={part.alt}
              className={cn(
                'max-h-80 w-auto max-w-full rounded-lg border object-contain shadow-sm',
                imageClassName,
              )}
              loading="lazy"
            />
          );
        }

        if (!part.value) {
          return null;
        }

        return (
          <p
            key={`text-${index}`}
            className={cn('whitespace-pre-wrap break-words', textClassName)}
          >
            {part.value}
          </p>
        );
      })}
    </div>
  );
}
