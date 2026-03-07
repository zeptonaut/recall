'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { deleteCard, updateCard } from '@/app/actions/cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

  async function handleSave(event?: React.FormEvent) {
    event?.preventDefault();
    if (!editPrompt.trim() || !editResponse.trim()) return;

    setLoading(true);
    try {
      await updateCard(id, editPrompt, editResponse);
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

  function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (!event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className="grid gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-start"
      >
        <Textarea
          value={editPrompt}
          onChange={(event) => setEditPrompt(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Prompt"
          className="min-h-24 resize-y"
        />
        <Textarea
          value={editResponse}
          onChange={(event) => setEditResponse(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Response"
          className="min-h-24 resize-y"
        />
        <Button size="icon" type="submit" variant="ghost" disabled={loading}>
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => {
            setEditing(false);
            setEditPrompt(prompt);
            setEditResponse(response);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="whitespace-pre-wrap break-words font-medium">{prompt}</div>
        <div className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{response}</div>
      </div>
      <div className="hidden min-w-40 justify-end gap-2 sm:flex">
        <Badge variant="outline" className="capitalize">
          {mastery}
        </Badge>
        <Badge variant="secondary">{Math.round(retrievability * 100)}%</Badge>
      </div>
      <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="self-start">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={handleDelete} disabled={loading} className="self-start">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
