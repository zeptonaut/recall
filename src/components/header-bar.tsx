'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface HeaderBarProps {
  backHref: string;
  backLabel: string;
  actions?: ReactNode;
}

/** Shared top bar with a back link on the left and contextual actions on the right. */
export function HeaderBar({ backHref, backLabel, actions }: HeaderBarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        href={backHref}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        {backLabel}
      </Link>
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
