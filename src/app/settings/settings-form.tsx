'use client';

import { useState, useTransition } from 'react';
import { updateUserSettings } from '@/app/actions/settings';
import { HeaderBar } from '@/components/header-bar';
import { SignOutButton } from '@/components/sign-out-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

interface ApiKeySummary {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface SettingsFormProps {
  user: {
    name: string;
    email: string;
  };
  initialValues: {
    desiredRetention: number;
    maxNewCardsPerDay: number;
    maxReviewsPerDay: number;
    timezone: string;
    newDayStartHour: number;
  };
  initialApiKeys: ApiKeySummary[];
}

/** Basic FSRS settings editor for the single-user app. */
export function SettingsForm({ user, initialValues, initialApiKeys }: SettingsFormProps) {
  const [form, setForm] = useState({
    desiredRetention: String(initialValues.desiredRetention),
    maxNewCardsPerDay: String(initialValues.maxNewCardsPerDay),
    maxReviewsPerDay: String(initialValues.maxReviewsPerDay),
    timezone: initialValues.timezone,
    newDayStartHour: String(initialValues.newDayStartHour),
  });
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [apiKeyName, setApiKeyName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [isSavingSettings, startSettingsTransition] = useTransition();
  const [isCreatingToken, startCreateTokenTransition] = useTransition();
  const [isRefreshingKeys, startRefreshKeysTransition] = useTransition();

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function formatDate(value: string | null) {
    if (!value) {
      return 'Never';
    }

    return new Date(value).toLocaleString();
  }

  async function refreshApiKeys() {
    const result = await authClient.apiKey.list({
      query: {
        sortBy: 'createdAt',
        sortDirection: 'desc',
      },
    });

    if (result.error) {
      throw new Error(result.error.message ?? 'Could not refresh tokens.');
    }

    setApiKeys(
      (result.data?.apiKeys ?? []).map((apiKey) => ({
        id: apiKey.id,
        name: apiKey.name,
        start: apiKey.start,
        createdAt: new Date(apiKey.createdAt).toISOString(),
        expiresAt: apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString() : null,
      })),
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    startSettingsTransition(async () => {
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

  function handleCreateToken(event: React.FormEvent) {
    event.preventDefault();

    startCreateTokenTransition(async () => {
      try {
        const result = await authClient.apiKey.create({
          name: apiKeyName.trim(),
        });

        if (result.error || !result.data?.key) {
          throw new Error(result.error?.message ?? 'Could not create token.');
        }

        setApiKeyName('');
        setCreatedToken(result.data.key);
        await refreshApiKeys();
        toast.success('API token created');
      } catch {
        toast.error('Failed to create API token');
      }
    });
  }

  function handleDeleteToken(id: string) {
    startRefreshKeysTransition(async () => {
      try {
        const result = await authClient.apiKey.delete({
          keyId: id,
        });

        if (result.error) {
          throw new Error(result.error.message ?? 'Could not revoke token.');
        }

        await refreshApiKeys();
        toast.success('API token revoked');
      } catch {
        toast.error('Failed to revoke API token');
      }
    });
  }

  function handleCopyToken() {
    if (!createdToken) {
      return;
    }

    navigator.clipboard.writeText(createdToken)
      .then(() => toast.success('Token copied'))
      .catch(() => toast.error('Could not copy token'));
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <HeaderBar
        backHref="/"
        backLabel="Back to Dashboard"
        actions={<SignOutButton />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-muted-foreground">{user.email}</p>
        </CardContent>
      </Card>

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

            <Button type="submit" disabled={isSavingSettings}>
              {isSavingSettings ? 'Saving...' : 'Save settings'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateToken} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={apiKeyName}
              onChange={(event) => setApiKeyName(event.target.value)}
              placeholder="Token name"
            />
            <Button type="submit" disabled={isCreatingToken || !apiKeyName.trim()}>
              {isCreatingToken ? 'Creating...' : 'Create token'}
            </Button>
          </form>

          {createdToken ? (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Copy this token now</p>
                <p className="text-sm text-muted-foreground">You will not be able to see the full token again.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input readOnly value={createdToken} />
                <Button type="button" variant="secondary" onClick={handleCopyToken}>
                  Copy
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No API tokens created yet.</p>
            ) : (
              apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{apiKey.name ?? 'Unnamed token'}</p>
                    <p className="text-sm text-muted-foreground">
                      {apiKey.start ?? 'Hidden prefix'} • Created {formatDate(apiKey.createdAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires {formatDate(apiKey.expiresAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isRefreshingKeys}
                    onClick={() => handleDeleteToken(apiKey.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
