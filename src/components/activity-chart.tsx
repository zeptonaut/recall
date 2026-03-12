import type { DayActivity } from '@/app/actions/sets';

/** Stacked bar chart showing daily reviews by state over a trailing window. */
export function ActivityChart({ data }: { data: DayActivity[] }) {
  const total = data.reduce((sum, d) => sum + d.review + d.learning + d.new, 0);
  if (total === 0) return null;

  // Find the first active day — everything before it is leading whitespace
  let firstActiveIdx = 0;
  while (firstActiveIdx < data.length && data[firstActiveIdx].review + data[firstActiveIdx].learning + data[firstActiveIdx].new === 0) {
    firstActiveIdx++;
  }
  if (firstActiveIdx >= data.length) return null;

  const activeSlice = data.slice(firstActiveIdx);
  const max = Math.max(...activeSlice.map((d) => d.review + d.learning + d.new));

  // Build column sizes: leading empty days get 1fr (whitespace on left),
  // intermediate empty days get a fraction so active bars stay close but not crammed
  const columns = data.map((d, i) => {
    const dayTotal = d.review + d.learning + d.new;
    if (dayTotal > 0) return '1fr';
    return i < firstActiveIdx ? '1fr' : '0.4fr';
  }).join(' ');

  return (
    <div className="space-y-1.5">
      <div className="relative">
        {/* Baseline track */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-muted-foreground/10 rounded-full" />
        <div
          className="relative grid items-end h-12"
          style={{
            gridTemplateColumns: columns,
            gap: '2px',
          }}
        >
          {data.map((day, i) => {
            const dayTotal = day.review + day.learning + day.new;
            if (dayTotal === 0) {
              return <div key={i} />;
            }
            const heightPct = Math.max(18, (dayTotal / max) * 100);

            return (
              <div key={i} className="flex justify-center h-full items-end">
                <div
                  className="w-1.5 flex flex-col-reverse overflow-hidden rounded-t-[1.5px]"
                  style={{ height: `${heightPct}%`, minHeight: '4px' }}
                >
                  {/* Green (mastered/review) at the bottom, then learning, then new on top */}
                  {day.review > 0 && (
                    <div
                      className="bg-emerald-400 dark:bg-emerald-500"
                      style={{ flex: day.review }}
                    />
                  )}
                  {day.learning > 0 && (
                    <div
                      className="bg-amber-300 dark:bg-amber-400"
                      style={{ flex: day.learning }}
                    />
                  )}
                  {day.new > 0 && (
                    <div
                      className="bg-slate-300 dark:bg-slate-500"
                      style={{ flex: day.new }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
