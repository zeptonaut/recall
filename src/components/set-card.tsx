'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SetCardProps {
  id: string;
  title: string;
  description: string | null;
  cardCount: number;
  lastStudied: Date | null;
  accuracy: number | null;
}

/** Dashboard tile showing a set's title, stats, and accuracy */
export function SetCard({ id, title, description, cardCount, lastStudied, accuracy }: SetCardProps) {
  return (
    <Link href={`/sets/${id}`}>
      <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{cardCount} {cardCount === 1 ? 'card' : 'cards'}</Badge>
            {accuracy !== null && (
              <Badge variant="outline">{accuracy}% accuracy</Badge>
            )}
          </div>
          {lastStudied && (
            <p className="text-xs text-muted-foreground mt-2">
              Last studied {new Date(lastStudied).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
