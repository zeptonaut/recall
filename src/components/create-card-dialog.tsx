'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShortcutTooltip } from '@/components/shortcut-tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createCard } from '@/app/actions/cards';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

interface CreateCardDialogProps {
  setId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dialog form for adding a new card to a set */
export function CreateCardDialog({ setId, open, onOpenChange }: CreateCardDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || !response.trim()) return;

    setLoading(true);
    try {
      await createCard(setId, prompt, response);
      toast.success('Card created');
      setPrompt('');
      setResponse('');
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error('Failed to create card');
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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setPrompt('');
          setResponse('');
        }
        onOpenChange(nextOpen);
      }}
    >
      <ShortcutTooltip label="Create a new card" shortcuts="C">
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="h-4 w-4" />
            Create Card
          </Button>
        </DialogTrigger>
      </ShortcutTooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="The question or prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              className="min-h-24 resize-y"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="response">Response</Label>
            <Textarea
              id="response"
              placeholder="The correct answer"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              className="min-h-24 resize-y"
              required
            />
          </div>
          <div className="flex justify-end pt-2">
            <ShortcutTooltip label="Submit this card" shortcuts={['Cmd+Enter', 'Ctrl+Enter']}>
              <Button
                type="submit"
                disabled={loading || !prompt.trim() || !response.trim()}
                className="min-w-32 rounded-lg px-5"
              >
                {loading ? 'Creating...' : 'Create Card'}
              </Button>
            </ShortcutTooltip>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
