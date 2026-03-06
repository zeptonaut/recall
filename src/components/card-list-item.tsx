'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { deleteCard, updateCard } from '@/app/actions/cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { MasteryTier } from '@/lib/fsrs';

interface CardListItemProps {
  id: string;
  prompt: string;
  response: string;
  mastery: MasteryTier;
  retrievability: number;
}

/** Editable card row with mastery and recall-probability context. */
export function CardListItem({ id, prompt, response, mastery, retrievability }: CardListItemProps) {
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(prompt);
  const [editResponse, setEditResponse] = useState(response);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSave() {
    if (!editPrompt.trim() || !editResponse.trim()) return;

    setLoading(true);
    try {
      await updateCard(id, editPrompt.trim(), editResponse.trim());
      setEditing(false);
      router.refresh();
    } catch {
      toast.error('Failed to update card');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteCard(id);
      toast.success('Card deleted');
      router.refresh();
    } catch {
      toast.error('Failed to delete card');
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Input
          value={editPrompt}
          onChange={(event) => setEditPrompt(event.target.value)}
          placeholder="Prompt"
          className="flex-1"
        />
        <Input
          value={editResponse}
          onChange={(event) => setEditResponse(event.target.value)}
          placeholder="Response"
          className="flex-1"
        />
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setEditing(false);
            setEditPrompt(prompt);
            setEditResponse(response);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{prompt}</div>
        <div className="text-sm text-muted-foreground">{response}</div>
      </div>
      <div className="hidden min-w-40 justify-end gap-2 sm:flex">
        <Badge variant="outline" className="capitalize">
          {mastery}
        </Badge>
        <Badge variant="secondary">{Math.round(retrievability * 100)}%</Badge>
      </div>
      <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={handleDelete} disabled={loading}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
