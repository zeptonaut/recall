import Link from 'next/link';
import { CreateSetTile } from '@/components/create-set-tile';
import { RecallLogo } from '@/components/recall-logo';
import { SetCard } from '@/components/set-card';
import { StudyButton } from '@/components/study-button';
import { Button } from '@/components/ui/button';
import { getSets } from '@/app/actions/sets';
import { requirePageSession } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

/** Dashboard page showing all flashcard sets with scheduler-native study stats. */
export default async function DashboardPage() {
  await requirePageSession();
  const sets = await getSets();

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <RecallLogo size={28} />
          <h1 className="text-xl font-semibold tracking-tight text-foreground/90">Recall</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
            <Link href="/settings">Settings</Link>
          </Button>
          <StudyButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <SetCard
            key={set.id}
            id={set.id}
            title={set.title}
            description={set.description}
            cardCount={set.cardCount}
            dueCount={set.dueCount}
            mastery={set.mastery}
            lastStudied={set.lastStudied}
            activity={set.activity}
          />
        ))}
        <CreateSetTile />
      </div>
    </main>
  );
}
