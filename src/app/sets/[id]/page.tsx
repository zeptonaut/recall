import { getSet } from '@/app/actions/sets';
import { notFound } from 'next/navigation';
import { SetDetailClient } from './set-detail-client';

interface SetDetailPageProps {
  params: Promise<{ id: string }>;
}

/** Set detail page showing cards and management controls */
export default async function SetDetailPage({ params }: SetDetailPageProps) {
  const { id } = await params;
  const set = await getSet(id);
  if (!set) notFound();

  return <SetDetailClient set={set} />;
}
