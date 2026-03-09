'use client';

import Link from 'next/link';
import { MasteryBadge } from '@/components/mastery-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SetCardProps {
  id: string;
  title: string;
  description: string | null;
  cardCount: number;
  dueCount: number;
  lastStudied: Date | null;
  mastery: {
    new: number;
    learning: number;
    familiar: number;
    mastered: number;
  };
  averageRetrievability: number | null;
}

/** Dashboard tile showing due work, mastery distribution, and recent study activity. */
export function SetCard({
  id,
  title,
  description,
  cardCount,
  dueCount,
  lastStudied,
  mastery,
  averageRetrievability,
}: SetCardProps) {
  return (
    <Link href={`/sets/${id}`}>
      <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {cardCount} {cardCount === 1 ? 'card' : 'cards'}
            </Badge>
            <Badge variant={dueCount > 0 ? 'default' : 'outline'}>
              {dueCount} due
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <MasteryBadge mastery="new" count={mastery.new} />
            <MasteryBadge mastery="learning" count={mastery.learning} />
            <MasteryBadge mastery="familiar" count={mastery.familiar} />
            <MasteryBadge mastery="mastered" count={mastery.mastered} />
          </div>

          {averageRetrievability !== null ? (
            <p className="text-xs text-muted-foreground">
              Avg recall probability {Math.round(averageRetrievability * 100)}%
            </p>
          ) : null}

          {lastStudied ? (
            <p className="text-xs text-muted-foreground">
              Last reviewed {new Date(lastStudied).toLocaleDateString()}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No reviews yet</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
