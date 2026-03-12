import Link from 'next/link';
import { CreateSetTile } from '@/components/create-set-tile';
import { SetCard } from '@/components/set-card';
import { Button } from '@/components/ui/button';
import { getSets } from '@/app/actions/sets';

export const dynamic = 'force-dynamic';

/** Dashboard page showing all flashcard sets with scheduler-native study stats. */
export default async function DashboardPage() {
  const sets = await getSets();

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Recall</h1>
          <p className="text-muted-foreground">Your spaced repetition sets</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/settings">Settings</Link>
          </Button>
          <Button asChild>
            <Link href="/study">Study</Link>
          </Button>
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
