'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.replace('/login');
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleSignOut}>
      {isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
