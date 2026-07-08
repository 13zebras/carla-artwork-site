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
    <main className='flex flex-col justify-start items-center gap-8 to-bg-gradient bg-linear-to-b from-background w-full min-h-screen text-foreground'>
      <ThemeToggle className='top-4 right-4 z-50 fixed' />
      <Card className='bg-background-2nd shadow-card backdrop-blur mt-48 border-border/60 w-100 text-foreground'>
        <CardHeader>
          <CardTitle className='pb-4 font-semibold text-2xl'>Admin Sign-in</CardTitle>
          <CardDescription className='text-muted-foreground text-base'>
            Enter email to receive a magic link to the artist dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* {error ? (
            <Alert className='p-2 border-0'>
              <AlertTitle className='font-semibold text-red-500 text-lg'>
                Sign in failed!
              </AlertTitle>
              <AlertDescription className='text-red-500 text-base'>{error}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert className='p-2 border-0'>
              <AlertTitle className='pb-2 text-green-400 text-lg'>Success!</AlertTitle>
              <AlertDescription className='text-green-400 text-base'>
                Check your email for the sign-in link.
              </AlertDescription>
            </Alert>
          ) : null} */}

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
                className='h-10 md:text-base'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <Button
              type='submit'
              variant='default'
              className='bg-brand-700/85 hover:bg-brand-700/70 active:bg-brand-700/95 border border-brand-600 w-full h-10 text-stone-100 text-base'
              disabled={pending}
            >
              {pending ? 'Sending…' : 'Send magic link'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className='mx-auto'>
        {error ? (
          <Alert className='bg-destructive/30 p-4 border border-destructive'>
            <AlertTitle className='pb-2 font-bold text-foreground text-xl'>
              Sign in failed!
            </AlertTitle>
            <AlertDescription className='text-foreground text-base'>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert className='bg-positive/30 p-4 border border-positive'>
            <AlertTitle className='pb-2 font-bold text-foreground text-xl'>Success!</AlertTitle>
            <AlertDescription className='text-foreground text-lg'>
              Check your email for the sign-in link.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </main>
  );
}
