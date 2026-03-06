'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Check, Pencil, Trash2, X } from 'lucide-react';
import { deleteSet, updateSet } from '@/app/actions/sets';
import { CardListItem } from '@/components/card-list-item';
import { CreateCardDialog } from '@/components/create-card-dialog';
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
}

/** Set detail client showing scheduler-driven study stats alongside cards. */
export function SetDetailClient({ set }: SetDetailClientProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(set.title);
  const [description, setDescription] = useState(set.description ?? '');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSave() {
    if (!title.trim()) return;

    setLoading(true);
    try {
      await updateSet(set.id, title.trim(), description.trim());
      setEditing(false);
      router.refresh();
    } catch {
      toast.error('Failed to update set');
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

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </Link>

      {editing ? (
        <div className="space-y-3">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} className="text-2xl font-bold" />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={loading}>
              <Check className="mr-1 h-4 w-4" /> Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setTitle(set.title);
                setDescription(set.description ?? '');
              }}
            >
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{set.title}</h1>
            {set.description ? <p className="text-muted-foreground">{set.description}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant={set.stats.dueNowCount > 0 ? 'default' : 'outline'}>
                {set.stats.dueNowCount} due
              </Badge>
              <Badge variant="outline">New {set.stats.mastery.new}</Badge>
              <Badge variant="outline">Learning {set.stats.mastery.learning}</Badge>
              <Badge variant="outline">Familiar {set.stats.mastery.familiar}</Badge>
              <Badge variant="outline">Mastered {set.stats.mastery.mastered}</Badge>
              <Badge variant="secondary">
                {set.stats.lastReviewed
                  ? `Last reviewed ${new Date(set.stats.lastReviewed).toLocaleDateString()}`
                  : 'No reviews yet'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDelete} disabled={loading}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <CreateCardDialog setId={set.id} />
        {set.cards.length > 0 ? (
          <Button asChild>
            <Link href={`/sets/${set.id}/study`}>
              <BookOpen className="mr-2 h-4 w-4" />
              Study This Set
            </Link>
          </Button>
        ) : null}
      </div>

      <Separator />

      {set.cards.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No cards yet. Add your first card!</p>
      ) : (
        <div className="divide-y">
          {set.cards.map((card) => (
            <CardListItem
              key={card.id}
              id={card.id}
              prompt={card.prompt}
              response={card.response}
              mastery={card.mastery}
              retrievability={card.retrievability}
            />
          ))}
        </div>
      )}
    </main>
  );
}
