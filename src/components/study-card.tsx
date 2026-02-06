'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DifficultyButtons } from '@/components/difficulty-buttons';

interface StudyCardProps {
  prompt: string;
  correctResponse: string;
  onResult: (isCorrect: boolean, difficulty: number | null) => void;
}

/** Flashcard for study mode — handles prompt, answer, review, and difficulty rating */
export function StudyCard({ prompt, correctResponse, onResult }: StudyCardProps) {
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<'prompt' | 'review'>('prompt');
  const [isCorrect, setIsCorrect] = useState(false);
  const [overridden, setOverridden] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const correct = answer.trim().toLowerCase() === correctResponse.trim().toLowerCase();
    setIsCorrect(correct);
    setPhase('review');
  }

  function handleOverride() {
    setIsCorrect(true);
    setOverridden(true);
  }

  function handleDifficulty(difficulty: number) {
    if (!submitted) {
      setSubmitted(true);
      onResult(true, difficulty);
    }
  }

  function handleNext() {
    if (!submitted) {
      setSubmitted(true);
      onResult(false, null);
    }
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardContent className="pt-6 space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Prompt</p>
          <p className="text-2xl font-semibold">{prompt}</p>
        </div>

        {phase === 'prompt' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              autoFocus
            />
            <Button type="submit" className="w-full">
              Submit
            </Button>
          </form>
        )}

        {phase === 'review' && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Correct answer</p>
              <p className="text-xl font-medium">{correctResponse}</p>
              {answer.trim() && (
                <p className="text-sm text-muted-foreground">
                  Your answer: <span className="font-medium">{answer}</span>
                </p>
              )}
            </div>

            <div className="flex justify-center">
              {isCorrect ? (
                <Badge className="bg-green-600 text-white text-sm px-3 py-1">
                  Correct!{overridden ? ' (overridden)' : ''}
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  Incorrect
                </Badge>
              )}
            </div>

            {isCorrect ? (
              <div className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">How difficult was this?</p>
                <DifficultyButtons onSelect={handleDifficulty} disabled={submitted} />
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleOverride} className="flex-1" disabled={submitted}>
                  Override — I was right
                </Button>
                <Button onClick={handleNext} className="flex-1" disabled={submitted}>
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
