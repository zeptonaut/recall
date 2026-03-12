import type { DayActivity } from '@/app/actions/sets';

/** Stacked bar chart showing daily reviews by state over a trailing window. */
export function ActivityChart({ data }: { data: DayActivity[] }) {
  const total = data.reduce((sum, d) => sum + d.review + d.learning + d.new, 0);
  if (total === 0) return null;

  // Trim leading empty days so the chart starts with the first active day
  let startIdx = 0;
  while (startIdx < data.length && data[startIdx].review + data[startIdx].learning + data[startIdx].new === 0) {
    startIdx++;
  }
  const trimmed = data.slice(startIdx);
  if (trimmed.length === 0) return null;

  const max = Math.max(...trimmed.map((d) => d.review + d.learning + d.new));

  return (
    <div className="space-y-1.5">
      <div className="relative">
        {/* Baseline track */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-muted-foreground/10 rounded-full" />
        <div
          className="relative grid items-end h-12"
          style={{
            gridTemplateColumns: `repeat(${trimmed.length}, 1fr)`,
            gap: '2px',
          }}
        >
          {trimmed.map((day, i) => {
            const dayTotal = day.review + day.learning + day.new;
            if (dayTotal === 0) {
              return <div key={i} />;
            }
            const heightPct = Math.max(18, (dayTotal / max) * 100);

            return (
              <div key={i} className="flex justify-center h-full items-end">
                <div
                  className="w-1.5 flex flex-col overflow-hidden rounded-t-[1.5px]"
                  style={{ height: `${heightPct}%`, minHeight: '4px' }}
                >
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
      <p className="text-xs text-muted-foreground">{total} reviews</p>
    </div>
  );
}
