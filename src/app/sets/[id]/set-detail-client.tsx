'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { CardListItem } from '@/components/card-list-item';
import { CreateCardDialog } from '@/components/create-card-dialog';
import { updateSet, deleteSet } from '@/app/actions/sets';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Trash2, Check, X, BookOpen } from 'lucide-react';

interface Card {
  id: string;
  prompt: string;
  response: string;
  position: number | null;
}

interface SetWithCards {
  id: string;
  title: string;
  description: string | null;
  cards: Card[];
}

interface SetDetailClientProps {
  set: SetWithCards;
}

/** Client component for set detail — handles inline editing and deletion */
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
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </Link>

      {editing ? (
        <div className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{set.title}</h1>
            {set.description && (
              <p className="text-muted-foreground mt-1">{set.description}</p>
            )}
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
        {set.cards.length > 0 && (
          <Button asChild>
            <Link href={`/sets/${set.id}/study`}>
              <BookOpen className="mr-2 h-4 w-4" />
              Study This Set
            </Link>
          </Button>
        )}
      </div>

      <Separator />

      {set.cards.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No cards yet. Add your first card!
        </p>
      ) : (
        <div className="divide-y">
          {set.cards.map((card) => (
            <CardListItem
              key={card.id}
              id={card.id}
              prompt={card.prompt}
              response={card.response}
              position={card.position}
            />
          ))}
        </div>
      )}
    </main>
  );
}
