'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ArrowLeft } from 'lucide-react';
import { updateUserSettings } from '@/app/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface SettingsFormProps {
  initialValues: {
    desiredRetention: number;
    maxNewCardsPerDay: number;
    maxReviewsPerDay: number;
    timezone: string;
    newDayStartHour: number;
  };
}

/** Basic FSRS settings editor for the single-user app. */
export function SettingsForm({ initialValues }: SettingsFormProps) {
  const [form, setForm] = useState({
    desiredRetention: String(initialValues.desiredRetention),
    maxNewCardsPerDay: String(initialValues.maxNewCardsPerDay),
    maxReviewsPerDay: String(initialValues.maxReviewsPerDay),
    timezone: initialValues.timezone,
    newDayStartHour: String(initialValues.newDayStartHour),
  });
  const [isPending, startTransition] = useTransition();

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      try {
        await updateUserSettings({
          desiredRetention: Number(form.desiredRetention),
          maxNewCardsPerDay: Number(form.maxNewCardsPerDay),
          maxReviewsPerDay: Number(form.maxReviewsPerDay),
          timezone: form.timezone,
          newDayStartHour: Number(form.newDayStartHour),
        });
        toast.success('Settings updated');
      } catch {
        toast.error('Failed to update settings');
      }
    });
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Study Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="desiredRetention">Desired retention</Label>
              <Input
                id="desiredRetention"
                type="number"
                min="0.7"
                max="0.99"
                step="0.01"
                value={form.desiredRetention}
                onChange={(event) => updateField('desiredRetention', event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxNewCardsPerDay">Max new cards per day</Label>
                <Input
                  id="maxNewCardsPerDay"
                  type="number"
                  min="0"
                  step="1"
                  value={form.maxNewCardsPerDay}
                  onChange={(event) => updateField('maxNewCardsPerDay', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxReviewsPerDay">Max reviews per day</Label>
                <Input
                  id="maxReviewsPerDay"
                  type="number"
                  min="0"
                  step="1"
                  value={form.maxReviewsPerDay}
                  onChange={(event) => updateField('maxReviewsPerDay', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={form.timezone}
                onChange={(event) => updateField('timezone', event.target.value)}
                placeholder="America/Detroit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newDayStartHour">New day starts at hour</Label>
              <Input
                id="newDayStartHour"
                type="number"
                min="0"
                max="23"
                step="1"
                value={form.newDayStartHour}
                onChange={(event) => updateField('newDayStartHour', event.target.value)}
              />
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save settings'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
