'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, useTransition } from 'react';

import { CardContentDisplay } from '@/components/card-content-display';
import { DifficultyButtons } from '@/components/difficulty-buttons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateCard } from '@/app/actions/cards';
import { getReviewPreview } from '@/app/actions/study';
import type { ReviewPreview, ReviewType, StudyQueueItem } from '@/lib/fsrs';

export interface StudyCardHandle {
  startEditing: () => void;
}

interface StudyCardProps {
  card: StudyQueueItem;
  reviewType: ReviewType;
  onRate: (rating: 1 | 2 | 3 | 4, elapsedMs: number) => Promise<void>;
  onPhaseChange?: (phase: CardPhase) => void;
  ref?: React.Ref<StudyCardHandle>;
}

type CardPhase = 'prompt' | 'answer';

const ANSWER_TEXT_SIZE_CLASSES = [
  'text-3xl font-bold leading-[1.02] -tracking-[0.02em] sm:text-5xl',
  'text-2xl font-bold leading-[1.04] -tracking-[0.02em] sm:text-4xl',
  'text-xl font-bold leading-[1.06] -tracking-[0.02em] sm:text-3xl',
  'text-lg font-bold leading-[1.08] -tracking-[0.015em] sm:text-2xl',
  'text-base font-semibold leading-[1.12] -tracking-[0.01em] sm:text-xl',
] as const;

/** Flip-style flashcard: reveal the answer, then rate recall with FSRS. */
export function StudyCard({ card, reviewType, onRate, onPhaseChange, ref }: StudyCardProps) {
  const [phase, setPhase] = useState<CardPhase>('prompt');
  const [preview, setPreview] = useState<ReviewPreview | null>(null);
  const [submitting, startSubmitting] = useTransition();
  const [loadingPreview, startLoadingPreview] = useTransition();
  const startedAtRef = useRef<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(card.prompt);
  const [editResponse, setEditResponse] = useState(card.response);
  const [saving, startSaving] = useTransition();
  const [displayPrompt, setDisplayPrompt] = useState(card.prompt);
  const [displayResponse, setDisplayResponse] = useState(card.response);
  const [answerTextSizeIndex, setAnswerTextSizeIndex] = useState(0);
  const answerSectionRef = useRef<HTMLDivElement | null>(null);
  const answerTextClassName = ANSWER_TEXT_SIZE_CLASSES[answerTextSizeIndex];
  const startEditing = useCallback(() => {
    setEditPrompt(displayPrompt);
    setEditResponse(displayResponse);
    setEditing(true);
  }, [displayPrompt, displayResponse]);

  const loadPreview = useCallback(async () => {
    const nextPreview = await getReviewPreview(card.id, reviewType);
    setPreview(nextPreview);
  }, [card.id, reviewType]);

  function getElapsedMs() {
    if (startedAtRef.current === null) return 0;
    return Math.max(0, Date.now() - startedAtRef.current);
  }

  const revealAnswer = useCallback(() => {
    setPhase((current) => {
      if (current === 'prompt') {
        onPhaseChange?.('answer');
        return 'answer';
      }
      return current;
    });
  }, [onPhaseChange]);

  const submitRating = useCallback((rating: 1 | 2 | 3 | 4) => {
    startSubmitting(async () => {
      await onRate(rating, getElapsedMs());
    });
  }, [onRate, startSubmitting]);

  useImperativeHandle(ref, () => ({ startEditing }));

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
    if (phase !== 'answer') return;

    const frame = window.requestAnimationFrame(() => {
      setAnswerTextSizeIndex(0);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [displayResponse, phase]);

  useEffect(() => {
    if (phase !== 'answer') return;

    const frame = window.requestAnimationFrame(() => {
      const answerSection = answerSectionRef.current;
      if (!answerSection) return;

      const bottomLimit = window.innerHeight - 32;
      const sectionBottom = answerSection.getBoundingClientRect().bottom;

      if (sectionBottom > bottomLimit && answerTextSizeIndex < ANSWER_TEXT_SIZE_CLASSES.length - 1) {
        setAnswerTextSizeIndex((current) => Math.min(current + 1, ANSWER_TEXT_SIZE_CLASSES.length - 1));
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [answerTextSizeIndex, displayResponse, phase]);

  useEffect(() => {
    if (phase !== 'answer') return;

    function handleResize() {
      setAnswerTextSizeIndex(0);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [phase]);

  function cancelEditing() {
    setEditing(false);
  }

  function saveEdit() {
    const trimmedPrompt = editPrompt.trim();
    const trimmedResponse = editResponse.trim();
    if (!trimmedPrompt || !trimmedResponse) return;
    startSaving(async () => {
      await updateCard(card.id, trimmedPrompt, trimmedResponse);
      setDisplayPrompt(trimmedPrompt);
      setDisplayResponse(trimmedResponse);
      setEditing(false);
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (editing) return;

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
  }, [editing, phase, revealAnswer, submitRating, submitting]);

  return (
    <div>
      <div
        className={`w-full ${phase === 'prompt' ? 'cursor-pointer select-none' : ''}`}
        onClick={phase === 'prompt' ? revealAnswer : undefined}
        aria-label={phase === 'prompt' ? 'Reveal answer' : undefined}
      >
        <div className="flex min-h-[40dvh] items-center justify-center px-4 py-10 sm:min-h-[18rem] sm:py-14">
          <div className="w-full max-w-lg text-center">
            {editing ? (
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Front</label>
                  <Textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    autoFocus
                    className="min-h-24 text-base"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Back</label>
                  <Textarea
                    value={editResponse}
                    onChange={(e) => setEditResponse(e.target.value)}
                    className="min-h-24 text-base"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={saving || !editPrompt.trim() || !editResponse.trim()}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <CardContentDisplay
                    content={displayPrompt}
                    className="space-y-4"
                    imageClassName="mx-auto max-h-96"
                    textClassName={`-tracking-[0.01em] ${phase === 'answer' ? 'text-lg font-medium text-foreground/40 sm:text-xl' : 'text-3xl font-semibold sm:text-5xl'}`}
                  />
                </div>

                {phase === 'answer' ? (
                  <div ref={answerSectionRef} className="mt-8 space-y-8">
                    <div>
                      <CardContentDisplay
                        content={displayResponse}
                        className="space-y-4"
                        imageClassName="mx-auto max-h-80"
                        textClassName={answerTextClassName}
                      />
                    </div>

                    <div>
                      <DifficultyButtons onSelect={submitRating} disabled={submitting || loadingPreview} previews={preview} />
                    </div>

                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
