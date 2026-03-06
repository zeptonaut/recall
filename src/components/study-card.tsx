'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DifficultyButtons } from '@/components/difficulty-buttons';
import { getReviewPreview } from '@/app/actions/study';
import type { ReviewPreview, ReviewType, StudyQueueItem } from '@/lib/fsrs';

interface StudyCardProps {
  card: StudyQueueItem;
  reviewType: ReviewType;
  onRate: (rating: 1 | 2 | 3 | 4, elapsedMs: number) => Promise<void>;
}

type CardPhase = 'prompt' | 'incorrect' | 'grading';

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function HotkeyBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-current/20 bg-black/10 px-1.5 font-mono text-[11px] leading-none opacity-90">
      {value}
    </span>
  );
}

/** Typed-answer flashcard that always terminates in an explicit FSRS rating. */
export function StudyCard({ card, reviewType, onRate }: StudyCardProps) {
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<CardPhase>('prompt');
  const [overridden, setOverridden] = useState(false);
  const [preview, setPreview] = useState<ReviewPreview | null>(null);
  const [submitting, startSubmitting] = useTransition();
  const [loadingPreview, startLoadingPreview] = useTransition();
  const startedAtRef = useRef<number | null>(null);

  const isCorrect = phase === 'grading';

  const loadPreview = useCallback(async () => {
    const nextPreview = await getReviewPreview(card.id, reviewType);
    setPreview(nextPreview);
  }, [card.id, reviewType]);

  function getElapsedMs() {
    if (startedAtRef.current === null) return 0;
    return Math.max(0, Date.now() - startedAtRef.current);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const correct = normalizeAnswer(answer) === normalizeAnswer(card.response);
    setOverridden(false);
    setPhase(correct ? 'grading' : 'incorrect');
  }

  function handleOverride() {
    setOverridden(true);
    setPhase('grading');
  }

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
    if (phase === 'prompt' || submitting) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (phase === 'incorrect' && (event.key === 'Enter' || event.key === '1')) {
        event.preventDefault();
        submitRating(1);
        return;
      }

      if (phase === 'incorrect' && event.key === '2') {
        event.preventDefault();
        handleOverride();
        return;
      }

      if (phase === 'grading' && event.key >= '1' && event.key <= '4') {
        event.preventDefault();
        submitRating(Number(event.key) as 1 | 2 | 3 | 4);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, submitRating, submitting]);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline" className="capitalize">
            {card.mastery}
          </Badge>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">Prompt</p>
          <p className="text-2xl font-semibold">{card.prompt}</p>
        </div>

        {phase === 'prompt' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type your answer..."
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={!answer.trim()}>
              Check answer
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">Correct answer</p>
              <p className="text-xl font-medium">{card.response}</p>
              {answer.trim() ? (
                <p className="text-sm text-muted-foreground">
                  Your answer: <span className="font-medium text-foreground">{answer}</span>
                </p>
              ) : null}
            </div>

            <div className="flex justify-center">
              {isCorrect ? (
                <Badge className="bg-green-600 px-3 py-1 text-sm text-white">
                  Correct{overridden ? ' (overridden)' : ''}
                </Badge>
              ) : (
                <Badge variant="destructive" className="px-3 py-1 text-sm">
                  Incorrect
                </Badge>
              )}
            </div>

            {phase === 'incorrect' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="destructive"
                  onClick={() => submitRating(1)}
                  disabled={submitting}
                  className="h-auto min-h-16 flex-col gap-2 py-3"
                >
                  <span className="flex items-center gap-2">
                    <HotkeyBadge value={1} />
                    <span>Again</span>
                  </span>
                  <span className="text-xs opacity-80">{preview?.again ?? '...'}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOverride}
                  disabled={submitting || loadingPreview}
                  className="h-auto min-h-16 gap-2 py-3"
                >
                  <HotkeyBadge value={2} />
                  <span>I was right</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-sm text-muted-foreground">
                  Rate your recall
                </p>
                <DifficultyButtons onSelect={submitRating} disabled={submitting} previews={preview} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
