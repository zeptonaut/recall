'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DifficultyButtons } from '@/components/difficulty-buttons';
import { getReviewPreview } from '@/app/actions/study';
import type { ReviewPreview, ReviewType, StudyQueueItem } from '@/lib/fsrs';

interface StudyCardProps {
  card: StudyQueueItem;
  reviewType: ReviewType;
  onRate: (rating: 1 | 2 | 3 | 4, elapsedMs: number) => Promise<void>;
}

type CardPhase = 'prompt' | 'answer';

/** Flip-style flashcard: reveal the answer, then rate recall with FSRS. */
export function StudyCard({ card, reviewType, onRate }: StudyCardProps) {
  const [phase, setPhase] = useState<CardPhase>('prompt');
  const [preview, setPreview] = useState<ReviewPreview | null>(null);
  const [submitting, startSubmitting] = useTransition();
  const [loadingPreview, startLoadingPreview] = useTransition();
  const startedAtRef = useRef<number | null>(null);

  const loadPreview = useCallback(async () => {
    const nextPreview = await getReviewPreview(card.id, reviewType);
    setPreview(nextPreview);
  }, [card.id, reviewType]);

  function getElapsedMs() {
    if (startedAtRef.current === null) return 0;
    return Math.max(0, Date.now() - startedAtRef.current);
  }

  const revealAnswer = useCallback(() => {
    setPhase((current) => (current === 'prompt' ? 'answer' : current));
  }, []);

  const submitRating = useCallback((rating: 1 | 2 | 3 | 4) => {
    startSubmitting(async () => {
      await onRate(rating, getElapsedMs());
    });
  }, [onRate, startSubmitting]);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (phase === 'prompt') return;
    startLoadingPreview(async () => {
      await loadPreview();
    });
  }, [loadPreview, phase]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (phase === 'prompt' && (event.key === ' ' || event.code === 'Space')) {
        event.preventDefault();
        revealAnswer();
        return;
      }

      if (phase === 'answer' && !submitting && event.key >= '1' && event.key <= '4') {
        event.preventDefault();
        submitRating(Number(event.key) as 1 | 2 | 3 | 4);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, revealAnswer, submitRating, submitting]);

  return (
    <div>
      <Card
        className={`min-h-[58dvh] w-full rounded-xl sm:min-h-[20rem] ${
          phase === 'prompt' ? 'cursor-pointer select-none' : ''
        }`}
        onClick={phase === 'prompt' ? revealAnswer : undefined}
        aria-label={phase === 'prompt' ? 'Reveal answer' : undefined}
      >
        <CardContent className="flex min-h-[58dvh] items-center justify-center py-10 sm:min-h-[20rem] sm:py-12">
          <div className="-translate-y-[6%] space-y-6">
            <div className="text-center">
              <p className="whitespace-pre-wrap break-words text-3xl font-semibold sm:text-4xl">{card.prompt}</p>
            </div>

            {phase === 'answer' ? (
              <div className="space-y-4 border-t pt-6">
                <div className="text-center">
                  <p className="whitespace-pre-wrap break-words text-xl font-medium">{card.response}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-center text-sm text-muted-foreground">
                    Rate how well you recalled it
                  </p>
                  <DifficultyButtons onSelect={submitRating} disabled={submitting || loadingPreview} previews={preview} />
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
