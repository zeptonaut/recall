'use client';

import { Plus } from 'lucide-react';
import { CreateSetDialog } from '@/components/create-set-dialog';
import { Card, CardContent } from '@/components/ui/card';

/** Dashboard tile for creating a new set from the same grid as existing sets. */
export function CreateSetTile() {
  return (
    <CreateSetDialog
      trigger={
        <button type="button" className="h-full w-full text-left">
          <Card className="h-full min-h-64 cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed">
                <Plus className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">Create a new set</p>
                <p className="text-sm text-muted-foreground">
                  Add a fresh spaced repetition set to your library.
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
      }
    />
  );
}
