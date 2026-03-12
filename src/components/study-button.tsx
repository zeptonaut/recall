'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShortcutTooltip } from '@/components/shortcut-tooltip';
import { Button } from '@/components/ui/button';

/** Study button with "S" keyboard shortcut and tooltip. */
export function StudyButton() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === 's' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        router.push('/study');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <ShortcutTooltip label="Study" shortcuts="S">
      <Button size="sm" asChild>
        <Link href="/study">Study</Link>
      </Button>
    </ShortcutTooltip>
  );
}
