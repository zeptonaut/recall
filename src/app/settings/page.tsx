import { headers } from 'next/headers';
import { getUserSettings } from '@/app/actions/settings';
import { auth } from '@/lib/auth';
import { requirePageSession } from '@/lib/auth-session';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

/** Basic scheduler settings page. */
export default async function SettingsPage() {
  const session = await requirePageSession();
  const [settings, apiKeyResult] = await Promise.all([
    getUserSettings(),
    auth.api.listApiKeys({
      headers: await headers(),
      query: {
        sortBy: 'createdAt',
        sortDirection: 'desc',
      },
    }),
  ]);

  return (
    <SettingsForm
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      initialValues={{
        desiredRetention: settings.desiredRetention,
        maxNewCardsPerDay: settings.maxNewCardsPerDay,
        maxNewCardFailsPerDay: settings.maxNewCardFailsPerDay,
        maxReviewsPerDay: settings.maxReviewsPerDay,
        timezone: settings.timezone,
        newDayStartHour: settings.newDayStartHour,
      }}
      initialApiKeys={apiKeyResult.apiKeys.map((apiKey) => ({
        id: apiKey.id,
        name: apiKey.name,
        start: apiKey.start,
        createdAt: apiKey.createdAt.toISOString(),
        expiresAt: apiKey.expiresAt ? apiKey.expiresAt.toISOString() : null,
      }))}
    />
  );
}
