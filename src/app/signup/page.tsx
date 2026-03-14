import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { getCurrentSession } from '@/lib/auth-session';

export default async function SignupPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect('/');
  }

  return <AuthForm mode="signup" />;
}
