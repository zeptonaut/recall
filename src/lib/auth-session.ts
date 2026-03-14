import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export async function getCurrentSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requirePageSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export async function requireUserId() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session.user.id;
}
