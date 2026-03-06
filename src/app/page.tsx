import Link from 'next/link';
import { CreateSetDialog } from '@/components/create-set-dialog';
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
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings">Settings</Link>
          </Button>
          <CreateSetDialog />
        </div>
      </div>

      {sets.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">No sets yet. Create your first one!</p>
        </div>
      ) : (
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
              averageRetrievability={set.averageRetrievability}
            />
          ))}
        </div>
      )}
    </main>
  );
}
