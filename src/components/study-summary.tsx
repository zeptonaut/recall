'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface AttemptResult {
  isCorrect: boolean;
  difficulty: number | null;
}

interface StudySummaryProps {
  setId: string;
  totalCards: number;
  results: AttemptResult[];
  onStudyAgain: () => void;
}

/** End-of-session summary showing correct count, accuracy, and difficulty breakdown */
export function StudySummary({ setId, totalCards, results, onStudyAgain }: StudySummaryProps) {
  const correct = results.filter((r) => r.isCorrect).length;
  const accuracy = totalCards > 0 ? Math.round((correct / totalCards) * 100) : 0;

  const difficultyBreakdown = results
    .filter((r) => r.difficulty !== null)
    .reduce<Record<number, number>>((acc, r) => {
      acc[r.difficulty!] = (acc[r.difficulty!] || 0) + 1;
      return acc;
    }, {});

  const difficultyLabels: Record<number, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Session Complete!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-4xl font-bold">{correct}/{totalCards}</p>
          <p className="text-muted-foreground">correct answers ({accuracy}%)</p>
        </div>

        {Object.keys(difficultyBreakdown).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Difficulty Breakdown</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(difficultyBreakdown)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([diff, count]) => (
                  <Badge key={diff} variant="outline">
                    {difficultyLabels[Number(diff)] ?? diff}: {count}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={onStudyAgain} className="flex-1">
            Study Again
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/sets/${setId}`}>Back to Set</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
