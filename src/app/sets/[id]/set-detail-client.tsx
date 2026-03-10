'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Check, Pencil, Trash2, X } from 'lucide-react';
import { createCard, deleteCard, updateCard } from '@/app/actions/cards';
import { deleteSet, updateSet } from '@/app/actions/sets';
import { CardContentInput } from '@/components/card-content-input';
import { CardListItem } from '@/components/card-list-item';
import { HeaderBar } from '@/components/header-bar';
import { MasteryBadge } from '@/components/mastery-badge';
import { ShortcutTooltip } from '@/components/shortcut-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { MasteryTier } from '@/lib/fsrs';

interface Card {
  id: string;
  prompt: string;
  response: string;
  mastery: MasteryTier;
  retrievability: number;
}

interface SetWithCards {
  id: string;
  title: string;
  description: string | null;
  stats: {
    dueNowCount: number;
    mastery: Record<MasteryTier, number>;
    lastReviewed: Date | null;
  };
  cards: Card[];
}

interface SetDetailClientProps {
  set: SetWithCards;
  mode?: 'view' | 'edit';
}

interface EditableCardRow {
  localId: string;
  id: string | null;
  prompt: string;
  response: string;
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function isCompleteRow(row: Pick<EditableCardRow, 'prompt' | 'response'>) {
  return hasText(row.prompt) && hasText(row.response);
}

/** Set detail client showing scheduler-driven study stats alongside cards. */
export function SetDetailClient({ set, mode = 'view' }: SetDetailClientProps) {
  const draftRowId = useRef(1);
  const [title, setTitle] = useState(set.title);
  const [description, setDescription] = useState(set.description ?? '');
  const [loading, setLoading] = useState(false);
  const [cardRows, setCardRows] = useState<EditableCardRow[]>(() => buildEditorRows(set.cards));
  const router = useRouter();
  const isEditRoute = mode === 'edit';

  function createBlankRow(): EditableCardRow {
    const localId = `draft-${draftRowId.current}`;
    draftRowId.current += 1;
    return { localId, id: null, prompt: '', response: '' };
  }

  function buildRows(rows: EditableCardRow[]) {
    const nextRows = [...rows];
    while (nextRows.length > 1) {
      const last = nextRows.at(-1);
      const previous = nextRows.at(-2);
      if (!last || !previous) break;
      if (last.id !== null || previous.id !== null) break;
      if (hasText(last.prompt) || hasText(last.response)) break;
      if (hasText(previous.prompt) || hasText(previous.response)) break;
      nextRows.pop();
    }

    const lastRow = nextRows.at(-1);
    if (!lastRow || isCompleteRow(lastRow)) {
      nextRows.push(createBlankRow());
    }

    return nextRows;
  }

  async function handleSave() {
    if (!title.trim()) return;
    const incompleteRow = cardRows.find(
      (row) => hasText(row.prompt) !== hasText(row.response)
    );
    if (incompleteRow) {
      toast.error('Complete or remove the unfinished card before saving');
      return;
    }

    setLoading(true);
    try {
      const originalCards = new Map(set.cards.map((card) => [card.id, card]));
      const keptIds = new Set(
        cardRows
          .filter((row) => row.id !== null)
          .map((row) => row.id as string)
      );
      const cardsToDelete = set.cards.filter((card) => !keptIds.has(card.id));
      const cardsToUpdate = cardRows.filter((row) => {
        if (!row.id || !isCompleteRow(row)) return false;
        const original = originalCards.get(row.id);
        return original ? original.prompt !== row.prompt || original.response !== row.response : false;
      });
      const cardsToCreate = cardRows.filter((row) => row.id === null && isCompleteRow(row));

      await updateSet(set.id, title.trim(), description.trim());
      await Promise.all(cardsToDelete.map((card) => deleteCard(card.id)));
      await Promise.all(cardsToUpdate.map((row) => updateCard(row.id as string, row.prompt, row.response)));
      for (const row of cardsToCreate) {
        await createCard(set.id, row.prompt, row.response);
      }

      toast.success('Deck updated');
      router.push(`/sets/${set.id}`);
      router.refresh();
    } catch {
      toast.error('Failed to update deck');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this set and all its cards?')) return;

    setLoading(true);
    try {
      await deleteSet(set.id);
      toast.success('Set deleted');
      router.push('/');
    } catch {
      toast.error('Failed to delete set');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    draftRowId.current = 1;
    setTitle(set.title);
    setDescription(set.description ?? '');
    setCardRows(buildEditorRows(set.cards));
  }, [set.cards, set.description, set.title]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (isEditRoute) return;

      if (event.key.toLowerCase() === 's' && set.cards.length > 0) {
        event.preventDefault();
        router.push(`/sets/${set.id}/study`);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditRoute, router, set.cards.length, set.id]);

  function updateCardRow(localId: string, key: 'prompt' | 'response', value: string) {
    setCardRows((currentRows) =>
      buildRows(
        currentRows.map((row) =>
          row.localId === localId ? { ...row, [key]: value } : row
        )
      )
    );
  }

  function removeCardRow(localId: string) {
    setCardRows((currentRows) => buildRows(currentRows.filter((row) => row.localId !== localId)));
  }

  const hasSavedCards = set.cards.length > 0;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      {isEditRoute ? (
        <HeaderBar
          backHref={`/sets/${set.id}`}
          backLabel={`Back to ${set.title} set`}
          actions={(
            <>
              <Button variant="secondary" asChild>
                <Link href={`/sets/${set.id}`}>
                  <X className="mr-1 h-4 w-4" /> Cancel
                </Link>
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Check className="mr-1 h-4 w-4" /> Save
              </Button>
            </>
          )}
        />
      ) : (
        <HeaderBar
          backHref="/"
          backLabel="Back to Dashboard"
          actions={(
            <>
              <Button asChild variant="secondary">
                <Link href={`/sets/${set.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
              {hasSavedCards ? (
                <ShortcutTooltip label="Study this set" shortcuts="S">
                  <Button asChild>
                    <Link href={`/sets/${set.id}/study`}>
                      <BookOpen className="h-4 w-4" />
                      Study
                      {set.stats.dueNowCount > 0 ? (
                        <Badge
                          variant="secondary"
                          className="border-primary-foreground/20 bg-primary-foreground/15 text-primary-foreground"
                        >
                          {set.stats.dueNowCount}
                        </Badge>
                      ) : null}
                    </Link>
                  </Button>
                </ShortcutTooltip>
              ) : null}
            </>
          )}
        />
      )}

      {isEditRoute ? (
        <div className="space-y-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="text-2xl font-bold"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{set.title}</h1>
          {set.description ? (
            <p className="whitespace-pre-wrap break-words text-muted-foreground">{set.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <MasteryBadge mastery="new" count={set.stats.mastery.new} />
            <MasteryBadge mastery="learning" count={set.stats.mastery.learning} />
            <MasteryBadge mastery="familiar" count={set.stats.mastery.familiar} />
            <MasteryBadge mastery="mastered" count={set.stats.mastery.mastered} />
            <Badge variant="secondary">
              {set.stats.lastReviewed
                ? `Last reviewed ${new Date(set.stats.lastReviewed).toLocaleDateString()}`
                : 'No reviews yet'}
            </Badge>
          </div>
        </div>
      )}

      <Separator />

      {isEditRoute ? (
        <div className="space-y-3">
          <div className="grid gap-3 text-sm font-medium text-muted-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div>Question</div>
            <div>Answer</div>
            <div className="hidden lg:block" />
          </div>
          <div className="space-y-4">
            {cardRows.map((card) => {
              const isIncomplete = hasText(card.prompt) !== hasText(card.response);
              const isBlankDraft = card.id === null && !hasText(card.prompt) && !hasText(card.response);

              return (
                <div
                  key={card.localId}
                  className="grid gap-3 rounded-xl border border-transparent lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start"
                >
                  <CardContentInput
                    value={card.prompt}
                    onChange={(value) => updateCardRow(card.localId, 'prompt', value)}
                    placeholder="Question"
                    aria-label="Question"
                    className={isIncomplete ? 'border-destructive' : undefined}
                  />
                  <CardContentInput
                    value={card.response}
                    onChange={(value) => updateCardRow(card.localId, 'response', value)}
                    placeholder="Answer"
                    aria-label="Answer"
                    className={isIncomplete ? 'border-destructive' : undefined}
                  />
                  <Button
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => removeCardRow(card.localId)}
                    disabled={isBlankDraft}
                    className="justify-self-start lg:mt-2 lg:justify-self-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Separator className="mt-6" />
          <div className="flex justify-end">
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
              Delete Set
            </Button>
          </div>
        </div>
      ) : set.cards.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No cards yet. Open Edit to add your first card.</p>
      ) : (
        <div className="divide-y">
          {set.cards.map((card) => (
            <CardListItem
              key={card.id}
              prompt={card.prompt}
              response={card.response}
              mastery={card.mastery}
              showResponse={false}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function buildEditorRows(cards: SetWithCards['cards']): EditableCardRow[] {
  return [
    ...cards.map((card) => ({
      localId: card.id,
      id: card.id,
      prompt: card.prompt,
      response: card.response,
    })),
    { localId: 'draft-0', id: null, prompt: '', response: '' },
  ];
}
