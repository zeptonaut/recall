'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { RecallLogo } from '@/components/recall-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isPending, startTransition] = useTransition();

  const copy = mode === 'login'
    ? {
        title: 'Sign in',
        description: 'Use your Recall account to access your study sets and API tokens.',
        submitLabel: 'Sign in',
        alternateHref: '/signup',
        alternateLabel: 'Create an account',
      }
    : {
        title: 'Create account',
        description: 'Create a real local account so your sets, settings, and API tokens are tied to you.',
        submitLabel: 'Create account',
        alternateHref: '/login',
        alternateLabel: 'Already have an account?',
      };

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!form.name.trim()) {
        setError('Name is required.');
        return;
      }

      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    startTransition(async () => {
      const result = mode === 'login'
        ? await authClient.signIn.email({
            email: form.email.trim(),
            password: form.password,
          })
        : await authClient.signUp.email({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
          });

      if (result.error) {
        setError(result.error.message ?? 'Authentication failed.');
        return;
      }

      router.replace('/');
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-2.5">
            <RecallLogo size={30} />
            <span className="text-lg font-semibold tracking-tight">Recall</span>
          </div>
          <div className="space-y-1">
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' ? (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
              />
            </div>

            {mode === 'signup' ? (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                />
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Working...' : copy.submitLabel}
            </Button>

            <p className="text-sm text-muted-foreground">
              <Link href={copy.alternateHref} className="text-foreground underline underline-offset-4">
                {copy.alternateLabel}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
