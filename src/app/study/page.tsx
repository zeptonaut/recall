import { getSets } from '@/app/actions/sets';
import { getDrillModes } from '@/app/actions/study';
import { StudyPageClient } from './study-page-client';

export const dynamic = 'force-dynamic';

/** Study landing page for selecting one or more sets before starting a session. */
export default async function StudyPage() {
  const [sets, drillModes] = await Promise.all([getSets(), getDrillModes()]);

  return <StudyPageClient sets={sets} drillModes={drillModes} />;
}
