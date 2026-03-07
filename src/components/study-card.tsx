'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { ShortcutTooltip } from '@/components/shortcut-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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

  function handleAnswerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (!event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
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
          <p className="whitespace-pre-wrap break-words text-2xl font-semibold">{card.prompt}</p>
        </div>

        {phase === 'prompt' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={handleAnswerKeyDown}
              placeholder="Type your answer..."
              autoFocus
              className="min-h-28 resize-y"
            />
            <div className="flex justify-end">
              <ShortcutTooltip label="Check answer" shortcuts={['Cmd+Enter', 'Ctrl+Enter']} joiner="or">
                <Button type="submit" size="sm" disabled={!answer.trim()}>
                  Check answer
                </Button>
              </ShortcutTooltip>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">Correct answer</p>
              <p className="whitespace-pre-wrap break-words text-xl font-medium">{card.response}</p>
              {answer.trim() ? (
                <p className="text-sm text-muted-foreground">
                  Your answer:
                  <span className="mt-1 block whitespace-pre-wrap break-words font-medium text-foreground">
                    {answer}
                  </span>
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
                <ShortcutTooltip label="Mark again" shortcuts={['Enter', '1']} joiner="or">
                  <Button
                    variant="destructive"
                    onClick={() => submitRating(1)}
                    disabled={submitting}
                    className="h-auto min-h-16 flex-col py-3"
                  >
                    <span>Again</span>
                    <span className="text-xs opacity-80">{preview?.again ?? '...'}</span>
                  </Button>
                </ShortcutTooltip>
                <ShortcutTooltip label="Override as correct" shortcuts="2">
                  <Button
                    variant="outline"
                    onClick={handleOverride}
                    disabled={submitting || loadingPreview}
                    className="h-auto min-h-16 py-3"
                  >
                    <span>I was right</span>
                  </Button>
                </ShortcutTooltip>
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
