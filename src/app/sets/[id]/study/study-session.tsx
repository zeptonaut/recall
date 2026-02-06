'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { StudyCard } from '@/components/study-card';
import { StudySummary } from '@/components/study-summary';
import { recordAttempt } from '@/app/actions/study';
import { ArrowLeft } from 'lucide-react';

interface CardData {
  id: string;
  prompt: string;
  response: string;
}

interface AttemptResult {
  isCorrect: boolean;
  difficulty: number | null;
}

interface StudySessionProps {
  setId: string;
  setTitle: string;
  cards: CardData[];
}

/** Shuffles an array using Fisher-Yates */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Client-side study session managing card progression, recording, and summary */
export function StudySession({ setId, setTitle, cards }: StudySessionProps) {
  const [shuffledCards, setShuffledCards] = useState(() => shuffle(cards));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [phase, setPhase] = useState<'studying' | 'summary'>('studying');

  const currentCard = shuffledCards[currentIndex];
  const progress = Math.round((currentIndex / shuffledCards.length) * 100);

  const handleResult = useCallback(
    async (isCorrect: boolean, difficulty: number | null) => {
      // Record to DB
      await recordAttempt(currentCard.id, isCorrect, difficulty);

      const newResults = [...results, { isCorrect, difficulty }];
      setResults(newResults);

      if (currentIndex + 1 >= shuffledCards.length) {
        setPhase('summary');
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentCard, currentIndex, results, shuffledCards.length]
  );

  function handleStudyAgain() {
    setShuffledCards(shuffle(cards));
    setCurrentIndex(0);
    setResults([]);
    setPhase('studying');
  }

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

      {phase === 'studying' && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Card {currentIndex + 1} of {shuffledCards.length}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <StudyCard
            key={currentCard.id}
            prompt={currentCard.prompt}
            correctResponse={currentCard.response}
            onResult={handleResult}
          />
        </>
      )}

      {phase === 'summary' && (
        <StudySummary
          setId={setId}
          totalCards={shuffledCards.length}
          results={results}
          onStudyAgain={handleStudyAgain}
        />
      )}
    </div>
  );
}
