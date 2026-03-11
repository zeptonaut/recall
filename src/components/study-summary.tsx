'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DrillMode } from '@/lib/fsrs';

interface StudyResult {
  rating: 1 | 2 | 3 | 4;
}

interface DrillModeOption {
  id: DrillMode;
  label: string;
  description: string;
}

interface StudySummaryProps {
  mode: 'scheduled' | 'drill';
  totalReviewed: number;
  results: StudyResult[];
  backHref: string;
  backLabel: string;
  drillModes?: DrillModeOption[];
  onStartDrill?: (mode: DrillMode) => void;
  onPracticeAgain?: () => void;
  onReturnToSelection?: () => void;
}

const LABELS: Record<StudyResult['rating'], string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

/** Session summary for scheduled and drill study flows. */
export function StudySummary({
  mode,
  totalReviewed,
  results,
  backHref,
  backLabel,
  drillModes = [],
  onStartDrill,
  onPracticeAgain,
  onReturnToSelection,
}: StudySummaryProps) {
  const counts = results.reduce<Record<number, number>>((acc, result) => {
    acc[result.rating] = (acc[result.rating] ?? 0) + 1;
    return acc;
  }, {});

  const title =
    mode === 'scheduled'
      ? totalReviewed > 0
        ? 'Scheduled reviews complete'
        : 'Nothing due right now'
      : 'Drill session complete';

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-4xl font-bold">{totalReviewed}</p>
          <p className="text-muted-foreground">
            {mode === 'scheduled' ? 'cards reviewed today' : 'cards practiced'}
          </p>
        </div>

        {Object.keys(counts).length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Rating breakdown</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(counts)
                .sort(([left], [right]) => Number(left) - Number(right))
                .map(([rating, count]) => (
                  <Badge key={rating} variant="outline">
                    {LABELS[Number(rating) as StudyResult['rating']]}: {count}
                  </Badge>
                ))}
            </div>
          </div>
        ) : null}

        {mode === 'scheduled' && onStartDrill ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Start a drill session</p>
            <div className="grid gap-2">
              {drillModes.map((drillMode) => (
                <Button
                  key={drillMode.id}
                  variant="outline"
                  onClick={() => onStartDrill(drillMode.id)}
                  className="h-auto items-start justify-start py-3 text-left"
                >
                  <div>
                    <div className="font-medium">{drillMode.label}</div>
                    <div className="text-xs text-muted-foreground">{drillMode.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          {mode === 'drill' && onPracticeAgain ? (
            <Button onClick={onPracticeAgain} className="flex-1">
              Try another drill
            </Button>
          ) : null}
          {onReturnToSelection ? (
            <Button variant="secondary" className="flex-1" onClick={onReturnToSelection}>
              Choose sets
            </Button>
          ) : null}
          <Button variant="outline" className="flex-1" asChild>
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
