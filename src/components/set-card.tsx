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
  const hasActivity = activity.some((d) => d.review + d.learning + d.new > 0);

  return (
    <Link href={`/sets/${id}`}>
      <Card className="h-full min-h-64 cursor-pointer transition-colors hover:bg-muted/50 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            {dueCount > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 shrink-0">
                {dueCount} due
              </Badge>
            )}
          </div>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3 flex-1">
          {hasActivity && <ActivityChart data={activity} />}

          <div className="flex items-center justify-between mt-auto text-xs text-muted-foreground">
            <span>{cardCount} {cardCount === 1 ? 'card' : 'cards'}</span>
            <span>
              {hasActivity
                ? `Last reviewed ${new Date(lastStudied!).toLocaleDateString()}`
                : 'Not yet reviewed'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
