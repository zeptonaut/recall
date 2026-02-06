'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createCard } from '@/app/actions/cards';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

interface CreateCardDialogProps {
  setId: string;
}

/** Dialog form for adding a new card to a set */
export function CreateCardDialog({ setId }: CreateCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || !response.trim()) return;

    setLoading(true);
    try {
      await createCard(setId, prompt.trim(), response.trim());
      toast.success('Card added');
      setPrompt('');
      setResponse('');
      setOpen(false);
      router.refresh();
    } catch {
      toast.error('Failed to add card');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="The question or prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="response">Response</Label>
            <Input
              id="response"
              placeholder="The correct answer"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading || !prompt.trim() || !response.trim()} className="w-full">
            {loading ? 'Adding...' : 'Add Card'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
