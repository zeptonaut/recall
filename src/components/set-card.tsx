'use client';

import Link from 'next/link';
import type { DayActivity } from '@/app/actions/sets';
import { ActivityChart } from '@/components/activity-chart';
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
  activity: DayActivity[];
}

/** Dashboard tile showing due work, activity sparkline, and recent study info. */
export function SetCard({
  id,
  title,
  description,
  cardCount,
  dueCount,
  lastStudied,
  activity,
}: SetCardProps) {
  return (
    <Link href={`/sets/${id}`}>
      <Card className="h-full min-h-64 cursor-pointer transition-colors hover:bg-muted/50">
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

          <ActivityChart data={activity} />

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
