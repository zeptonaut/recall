import { getUserSettings } from '@/app/actions/settings';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

/** Basic scheduler settings page. */
export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <SettingsForm
      initialValues={{
        desiredRetention: settings.desiredRetention,
        maxNewCardsPerDay: settings.maxNewCardsPerDay,
        maxReviewsPerDay: settings.maxReviewsPerDay,
        timezone: settings.timezone,
        newDayStartHour: settings.newDayStartHour,
      }}
    />
  );
}
