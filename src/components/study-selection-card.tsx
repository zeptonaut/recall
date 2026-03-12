'use client';

import { CheckCircle2 } from 'lucide-react';
import type { DayActivity } from '@/app/actions/sets';
import { ActivityChart } from '@/components/activity-chart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StudySelectionCardProps {
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
  selected: boolean;
  onToggle: () => void;
}

/** Toggleable set card used on the study batch selection screen. */
export function StudySelectionCard({
  title,
  description,
  cardCount,
  dueCount,
  lastStudied,
  activity,
  selected,
  onToggle,
}: StudySelectionCardProps) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={selected} className="h-full w-full text-left">
      <Card
        className={cn(
          'h-full min-h-64 cursor-pointer transition-colors',
          selected
            ? 'border-foreground bg-muted/40 shadow-sm'
            : 'hover:bg-muted/50'
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-lg">{title}</CardTitle>
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <Badge variant={selected ? 'default' : 'outline'} className="shrink-0">
              {selected ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Included
                </>
              ) : (
                'Excluded'
              )}
            </Badge>
          </div>
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
    </button>
  );
}
