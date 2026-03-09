'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getDrillQueue, getDueStudyQueue, submitReview } from '@/app/actions/study';
import { StudyCard } from '@/components/study-card';
import { StudySummary } from '@/components/study-summary';
import { Progress } from '@/components/ui/progress';
import { isScheduledCardDueNow, type DrillMode, type StudyQueueItem } from '@/lib/fsrs';

interface DrillModeOption {
  id: DrillMode;
  label: string;
  description: string;
}

interface StudySessionProps {
  setId: string;
  setTitle: string;
  initialCards: StudyQueueItem[];
  drillModes: DrillModeOption[];
}

interface StudyResult {
  rating: 1 | 2 | 3 | 4;
}

/** Queue-driven study session for scheduled reviews and non-rescheduling drills. */
export function StudySession({ setId, setTitle, initialCards, drillModes }: StudySessionProps) {
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

  async function handleRate(rating: 1 | 2 | 3 | 4, elapsedMs: number) {
    if (!currentCard) return;

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

    if (queue.length === 1 && !shouldReplayReviewedCard) {
      const refreshedQueue = await getDueStudyQueue(setId);
      if (refreshedQueue.cards.length > 0) {
        setQueue(refreshedQueue.cards);
      }
    }
  }

  function startDrill(drillMode: DrillMode) {
    startLoadingDrill(async () => {
      const drillCards = await getDrillQueue(setId, 10, drillMode);
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
      <div className="flex items-center justify-between">
        <Link
          href={`/sets/${setId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to {setTitle}
        </Link>
      </div>

      {!showSummary ? (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span className="capitalize">{mode} study</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <StudyCard key={`${mode}:${currentCard.id}`} card={currentCard} reviewType={mode} onRate={handleRate} />
        </>
      ) : (
        <StudySummary
          setId={setId}
          mode={mode}
          totalReviewed={results.length}
          results={results}
          drillModes={mode === 'scheduled' && !isLoadingDrill ? drillModes : []}
          onStartDrill={mode === 'scheduled' ? startDrill : undefined}
          onPracticeAgain={mode === 'drill' ? resetToDrillChooser : undefined}
        />
      )}
    </div>
  );
}
