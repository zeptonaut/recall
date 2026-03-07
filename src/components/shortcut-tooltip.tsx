'use client';

import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ShortcutTooltipProps {
  label: string;
  shortcuts: string | string[];
  joiner?: string;
  children: ReactNode;
}

function ShortcutKey({ label }: { label: string }) {
  return (
    <kbd className="inline-flex h-6 items-center rounded-md border border-border/70 bg-muted/60 px-2 font-mono text-[11px] font-medium text-foreground shadow-xs">
      {label}
    </kbd>
  );
}

/** Shadcn-style delayed tooltip for actions with keyboard shortcuts. */
export function ShortcutTooltip({
  label,
  shortcuts,
  joiner = 'or',
  children,
}: ShortcutTooltipProps) {
  const shortcutList = Array.isArray(shortcuts) ? shortcuts : [shortcuts];

  return (
    <TooltipProvider delayDuration={550}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="bottom" className="border-border/70 bg-card/95 px-3 py-2 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {shortcutList.map((shortcut, index) => (
                <span key={shortcut} className="flex items-center gap-1.5">
                  {index > 0 ? <span className="text-[11px] uppercase tracking-[0.12em]">{joiner}</span> : null}
                  <ShortcutKey label={shortcut} />
                </span>
              ))}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
