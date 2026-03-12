'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, useTransition } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { getDrillQueue, getDueStudyQueue, submitReview } from '@/app/actions/study';
import { StudyCard, type StudyCardHandle } from '@/components/study-card';
import { StudySummary } from '@/components/study-summary';

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
  const [cardPhase, setCardPhase] = useState<'prompt' | 'answer'>('prompt');
  const studyCardRef = useRef<StudyCardHandle>(null);

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
    setCardPhase('prompt');

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="h-auto !px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
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

        {cardPhase === 'answer' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto !px-0 text-muted-foreground/50 hover:bg-transparent hover:text-muted-foreground"
            onClick={() => studyCardRef.current?.startEditing()}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit card
          </Button>
        ) : <div />}
      </div>

      {!showSummary ? (
        <>
          <div className="space-y-1">
            <Progress value={progress} className="h-[3px]" />
            <div className="flex justify-between text-xs text-muted-foreground/50">
              <span>{results.length} reviewed</span>
              <span>{remainingLabel}</span>
            </div>
          </div>

          {showSetTitle ? (
            <p className="text-center text-[11px] text-muted-foreground/40">{currentCard.setTitle}</p>
          ) : null}

          <StudyCard ref={studyCardRef} key={`${mode}:${currentCard.id}`} card={currentCard} reviewType={mode} onRate={handleRate} onPhaseChange={setCardPhase} />
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
