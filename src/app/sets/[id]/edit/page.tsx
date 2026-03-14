import { getSet } from '@/app/actions/sets';
import { requirePageSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { SetDetailClient } from '../set-detail-client';

interface EditSetPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSetPage({ params }: EditSetPageProps) {
  await requirePageSession();
  const { id } = await params;
  const set = await getSet(id);
  if (!set) notFound();

  return <SetDetailClient set={set} mode="edit" />;
}
