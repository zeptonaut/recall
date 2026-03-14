'use client';

import { useState, useTransition } from 'react';
import { getDueStudyQueue } from '@/app/actions/study';
import { CreateSetDialog } from '@/components/create-set-dialog';
import { HeaderBar } from '@/components/header-bar';
import { StudySelectionCard } from '@/components/study-selection-card';
import { StudySession } from '@/components/study-session';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { DrillMode, StudyQueueItem } from '@/lib/fsrs';
import type { DayActivity } from '@/app/actions/sets';

const STUDY_SELECTION_STORAGE_KEY = 'recall:last-selected-study-sets';

interface SetSummary {
  id: string;
  title: string;
  description: string | null;
  cardCount: number;
  dueCount: number;
  lastStudied: Date | null;
  mastery: {
    new: number;
    learning: number;
    familiar: number;
    mastered: number;
  };
  activity: DayActivity[];
}

interface DrillModeOption {
  id: DrillMode;
  label: string;
  description: string;
}

interface StudyPageClientProps {
  sets: SetSummary[];
  drillModes: DrillModeOption[];
}

/** Selection-first study page that can combine multiple sets into one session. */
export function StudyPageClient({ sets, drillModes }: StudyPageClientProps) {
  const allSetIds = sets.map((set) => set.id);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>(() => readStoredSelection(allSetIds));
  const [sessionCards, setSessionCards] = useState<StudyQueueItem[] | null>(null);
  const [isStartingStudy, startStudyTransition] = useTransition();

  function toggleSetSelection(setId: string) {
    setSelectedSetIds(
      selectedSetIds.includes(setId)
        ? selectedSetIds.filter((id) => id !== setId)
        : [...selectedSetIds, setId]
    );
  }

  function selectAllSets() {
    setSelectedSetIds(allSetIds);
  }

  async function startStudy() {
    if (selectedSetIds.length === 0) return;

    startStudyTransition(async () => {
      try {
        const dueQueue = await getDueStudyQueue(selectedSetIds);
        window.localStorage.setItem(
          STUDY_SELECTION_STORAGE_KEY,
          JSON.stringify(selectedSetIds)
        );
        setSessionCards(dueQueue.cards);
      } catch {
        toast.error('Failed to start study session');
      }
    });
  }

  const selectedSetCount = selectedSetIds.length;
  const selectedDueCount = sets
    .filter((set) => selectedSetIds.includes(set.id))
    .reduce((sum, set) => sum + set.dueCount, 0);
  const isInSession = sessionCards !== null;
  if (sets.length === 0) {
    return (
      <main className="mx-auto max-w-5xl space-y-8 p-6">
        <HeaderBar backHref="/" backLabel="Back to Dashboard" />
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <h1 className="text-2xl font-semibold">Create a set before you study</h1>
          <p className="mt-2 text-muted-foreground">
            Once you have a set, you can mix it into any future study batch.
          </p>
          <div className="mt-6 flex justify-center">
            <CreateSetDialog />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      {!isInSession ? (
        <>
          <HeaderBar
            backHref="/"
            backLabel="Back to Dashboard"
            actions={(
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={selectAllSets}
                  disabled={selectedSetIds.length === allSetIds.length}
                >
                  Select all
                </Button>
                <Button type="button" onClick={startStudy} disabled={selectedSetIds.length === 0 || isStartingStudy}>
                  {isStartingStudy ? 'Starting...' : 'Start study'}
                </Button>
              </>
            )}
          />

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Choose sets for this study batch</h1>
            <p className="text-muted-foreground">
              Tap any set to include or exclude it. Your last study batch is remembered after you start.
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedSetCount} selected · {selectedDueCount} due right now
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((set) => (
              <StudySelectionCard
                key={set.id}
                title={set.title}
                description={set.description}
                cardCount={set.cardCount}
                dueCount={set.dueCount}
                mastery={set.mastery}
                lastStudied={set.lastStudied}
                activity={set.activity}
                selected={selectedSetIds.includes(set.id)}
                onToggle={() => toggleSetSelection(set.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <StudySession
          setIds={selectedSetIds}
          initialCards={sessionCards}
          drillModes={drillModes}
          backLabel="Back"
          onBack={() => setSessionCards(null)}
          onReturnToSelection={() => setSessionCards(null)}
        />
      )}
    </main>
  );
}

function readStoredSelection(allSetIds: string[]) {
  if (typeof window === 'undefined') return allSetIds;
  if (allSetIds.length === 0) return [];

  const storedValue = window.localStorage.getItem(STUDY_SELECTION_STORAGE_KEY);
  if (!storedValue) {
    return allSetIds;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) {
      return allSetIds;
    }

    const filteredSelection = parsedValue.filter(
      (value): value is string => typeof value === 'string' && allSetIds.includes(value)
    );
    return filteredSelection.length > 0 ? filteredSelection : allSetIds;
  } catch {
    return allSetIds;
  }
}
