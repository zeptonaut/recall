import { getStudyCards } from '@/app/actions/study';
import { getSet } from '@/app/actions/sets';
import { notFound } from 'next/navigation';
import { StudySession } from './study-session';

interface StudyPageProps {
  params: Promise<{ id: string }>;
}

/** Study mode page — loads cards then hands off to client session */
export default async function StudyPage({ params }: StudyPageProps) {
  const { id } = await params;
  const set = await getSet(id);
  if (!set) notFound();

  const cards = await getStudyCards(id);
  if (cards.length === 0) notFound();

  return (
    <main className="max-w-2xl mx-auto p-6">
      <StudySession
        setId={id}
        setTitle={set.title}
        cards={cards.map((c) => ({ id: c.id, prompt: c.prompt, response: c.response }))}
      />
    </main>
  );
}
