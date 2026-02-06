'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateCard, deleteCard } from '@/app/actions/cards';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Check, X } from 'lucide-react';

interface CardListItemProps {
  id: string;
  prompt: string;
  response: string;
  position: number | null;
}

/** Editable card row showing prompt and response with edit/delete actions */
export function CardListItem({ id, prompt, response }: CardListItemProps) {
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
          onChange={(e) => setEditPrompt(e.target.value)}
          placeholder="Prompt"
          className="flex-1"
        />
        <Input
          value={editResponse}
          onChange={(e) => setEditResponse(e.target.value)}
          placeholder="Response"
          className="flex-1"
        />
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setEditPrompt(prompt); setEditResponse(response); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="flex-1 font-medium">{prompt}</span>
      <span className="flex-1 text-muted-foreground">{response}</span>
      <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={handleDelete} disabled={loading}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
