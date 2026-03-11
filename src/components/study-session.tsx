'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getDrillQueue, getDueStudyQueue, submitReview } from '@/app/actions/study';
import { StudyCard } from '@/components/study-card';
import { StudySummary } from '@/components/study-summary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { isScheduledCardDueNow, type DrillMode, type StudyQueueItem } from '@/lib/fsrs';

interface DrillModeOption {
  id: DrillMode;
  label: string;
  description: string;
}

interface StudySessionProps {
  setIds: string[];
  studyLabel: string;
  initialCards: StudyQueueItem[];
  drillModes: DrillModeOption[];
  backLabel: string;
  backHref?: string;
  onBack?: () => void;
  onReturnToSelection?: () => void;
}

interface StudyResult {
  rating: 1 | 2 | 3 | 4;
}

/** Queue-driven study session for scheduled reviews and non-rescheduling drills. */
export function StudySession({
  setIds,
  studyLabel,
  initialCards,
  drillModes,
  backLabel,
  backHref,
  onBack,
  onReturnToSelection,
}: StudySessionProps) {
  const [mode, setMode] = useState<'scheduled' | 'drill'>('scheduled');
  const [queue, setQueue] = useState<StudyQueueItem[]>(initialCards);
  const [results, setResults] = useState<StudyResult[]>([]);
  const [isLoadingDrill, startLoadingDrill] = useTransition();

  const currentCard = queue[0] ?? null;
  const totalForProgress = Math.max(initialCards.length, results.length + queue.length, 1);
  const progress = useMemo(() => {
    const completed = results.length;
    return Math.round((completed / totalForProgress) * 100);
  }, [results.length, totalForProgress]);
  const showSetTitle = new Set(setIds).size > 1 && currentCard;
  const remainingLabel = `${queue.length} remaining`;

  async function handleRate(rating: 1 | 2 | 3 | 4, elapsedMs: number) {
    if (!currentCard) return;

    const hadSingleCardLeft = queue.length === 1;
    const { card: reviewedCard } = await submitReview({
      cardId: currentCard.id,
      rating,
      reviewType: mode,
      elapsedMs,
    });

    setResults((existing) => [...existing, { rating }]);

    if (mode === 'drill') {
      setQueue((existing) => {
        const [, ...remaining] = existing;
        if (rating === 1) {
          return [...remaining, currentCard];
        }
        return remaining;
      });
      return;
    }

    const now = new Date();
    const shouldReplayReviewedCard = isScheduledCardDueNow(reviewedCard, now);

    setQueue((existing) => {
      const [, ...remaining] = existing;
      if (shouldReplayReviewedCard) {
        return [...remaining, reviewedCard];
      }
      return remaining;
    });

    if (hadSingleCardLeft && !shouldReplayReviewedCard) {
      const refreshedQueue = await getDueStudyQueue(setIds);
      if (refreshedQueue.cards.length > 0) {
        setQueue(refreshedQueue.cards);
      }
    }
  }

  function startDrill(drillMode: DrillMode) {
    startLoadingDrill(async () => {
      const drillCards = await getDrillQueue(setIds, 10, drillMode);
      setMode('drill');
      setQueue(drillCards);
      setResults([]);
    });
  }

  function resetToDrillChooser() {
    setMode('scheduled');
    setQueue([]);
    setResults([]);
  }

  const showSummary = !currentCard;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="h-auto px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {backLabel}
          </Button>
        ) : backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {backLabel}
          </Link>
        ) : (
          <div />
        )}

        <div className="text-right">
          <p className="text-sm font-medium">{studyLabel}</p>
          <p className="text-xs text-muted-foreground capitalize">{mode} study</p>
        </div>
      </div>

      {!showSummary ? (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{results.length} reviewed</span>
              <span>{remainingLabel}</span>
            </div>
            <Progress value={progress} />
          </div>

          {showSetTitle ? (
            <Badge variant="outline" className="w-fit">
              {currentCard.setTitle}
            </Badge>
          ) : null}

          <StudyCard key={`${mode}:${currentCard.id}`} card={currentCard} reviewType={mode} onRate={handleRate} />
        </>
      ) : (
        <StudySummary
          mode={mode}
          totalReviewed={results.length}
          results={results}
          backHref={backHref ?? '/'}
          backLabel={backHref ? backLabel : 'Back to Dashboard'}
          drillModes={mode === 'scheduled' && !isLoadingDrill ? drillModes : []}
          onStartDrill={mode === 'scheduled' ? startDrill : undefined}
          onPracticeAgain={mode === 'drill' ? resetToDrillChooser : undefined}
          onReturnToSelection={onReturnToSelection}
        />
      )}
    </div>
  );
}
