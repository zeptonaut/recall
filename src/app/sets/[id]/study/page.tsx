import { getSet } from '@/app/actions/sets';
import { getDrillModes, getDueStudyQueue } from '@/app/actions/study';
import { notFound } from 'next/navigation';
import { StudySession } from './study-session';

interface StudyPageProps {
  params: Promise<{ id: string }>;
}

/** Study page loads the current due queue and drill mode choices for a set. */
export default async function StudyPage({ params }: StudyPageProps) {
  const { id } = await params;
  const set = await getSet(id);
  if (!set) notFound();

  const [dueQueue, drillModes] = await Promise.all([
    getDueStudyQueue(id),
    getDrillModes(),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <StudySession
        setId={id}
        setTitle={set.title}
        initialCards={dueQueue.cards}
        drillModes={drillModes}
      />
    </main>
  );
}
