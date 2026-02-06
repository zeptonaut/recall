import { getSets } from '@/app/actions/sets';
import { SetCard } from '@/components/set-card';
import { CreateSetDialog } from '@/components/create-set-dialog';

export const dynamic = 'force-dynamic';

/** Dashboard page showing all flashcard sets */
export default async function DashboardPage() {
  const sets = await getSets();

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recall</h1>
          <p className="text-muted-foreground">Your flashcard sets</p>
        </div>
        <CreateSetDialog />
      </div>

      {sets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No sets yet. Create your first one!</p>
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
              lastStudied={set.lastStudied}
              accuracy={set.accuracy}
            />
          ))}
        </div>
      )}
    </main>
  );
}
