import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className='flex min-h-screen w-full items-center justify-center bg-linear-to-b from-background to-bg-gradient text-foreground'>
      <ThemeToggle className='fixed right-4 top-4 z-50' />
      <Card className='w-100 border-border/60 bg-background/85 text-foreground shadow-card backdrop-blur'>
        <CardHeader>
          <CardTitle className='text-2xl font-semibold pb-4'>Admin Sign-in</CardTitle>
          <CardDescription className='text-base text-muted-foreground'>
            Enter email to receive a magic link to the artist dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {error ? (
            <Alert className='border-0 p-2'>
              <AlertTitle className='text-red-500 text-lg font-semibold'>
                Sign in failed!
              </AlertTitle>
              <AlertDescription className='text-base text-red-500'>{error}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert className='border-0 p-2'>
              <AlertTitle className='text-green-400 text-lg pb-2'>Success!</AlertTitle>
              <AlertDescription className='text-green-400 text-base '>
                Check your email for the sign-in link.
              </AlertDescription>
            </Alert>
          ) : null}

          <form
            className='space-y-6 pt-2'
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              setError(null);
              setSuccess(false);
              try {
                const { error } = await authClient.signIn.magicLink({
                  email: email.trim(),
                  callbackURL: redirect ?? '/admin',
                });

                if (error) {
                  throw error;
                }

                setSuccess(true);
              } catch (cause) {
                console.error('Magic-link sign in failed', cause);
                setError('Unable to send sign-in link. Check the server logs for details.');
              } finally {
                setPending(false);
              }
            }}
          >
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                autoComplete='email'
                className='md:text-base h-10'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <Button
              type='submit'
              variant='default'
              className='w-full text-stone-100 bg-brand-700/85 border border-brand-600 hover:bg-brand-700/70 active:bg-brand-700/95 text-base h-10'
              disabled={pending}
            >
              {pending ? 'Sending…' : 'Send magic link'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
