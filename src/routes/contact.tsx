import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState, type FormEvent } from 'react';

import { Header } from '@/components/Header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { submitContactForm } from '@/lib/functions/contact.functions';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? '';
const VERIFICATION_ERRORS = [
  'Complete the human verification before sending.',
  'Human verification failed. Please try again.',
  'Human verification expired. Please verify again.',
];
const SAFE_SERVER_ERRORS = new Set([
  ...VERIFICATION_ERRORS,
  'Please complete all required fields.',
  'Invalid contact form submission.',
  'Name must be between 1 and 100 characters.',
  'Enter a valid email address.',
  'Message must be between 1 and 5,000 characters.',
  'Unable to send your message right now. Please try again.',
]);

export const Route = createFileRoute('/contact')({
  component: ContactComponent,
});

function getSubmissionError(error: unknown) {
  if (error instanceof Error && SAFE_SERVER_ERRORS.has(error.message)) {
    return error.message;
  }
  return 'Unable to send your message right now. Please try again.';
}

function ContactComponent() {
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleVerificationSuccess(token: string) {
    setTurnstileToken(token);
    setError((currentError) => {
      if (currentError && VERIFICATION_ERRORS.includes(currentError)) {
        return null;
      }
      return currentError;
    });
  }

  function handleVerificationExpire() {
    setTurnstileToken(null);
    setError('Human verification expired. Please verify again.');
  }

  function handleVerificationError() {
    setTurnstileToken(null);
    setError('Human verification failed. Please try again.');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnstileToken) {
      setError('Complete the human verification before sending.');
      return;
    }

    setPending(true);
    setSuccess(false);
    setError(null);

    try {
      await submitContactForm({
        data: { name, email, message, turnstileToken },
      });
      setName('');
      setEmail('');
      setMessage('');
      setSuccess(true);
    } catch (submissionError) {
      console.error('Contact form submission failed', submissionError);
      setError(getSubmissionError(submissionError));
    } finally {
      setTurnstileToken(null);
      turnstileRef.current?.reset();
      setPending(false);
    }
  }

  const canSubmit = Boolean(TURNSTILE_SITE_KEY && turnstileToken && !pending);

  return (
    <div className='relative bg-background min-h-screen text-foreground'>
      <Header />
      <main className='px-8 xs:px-10 sm:px-12 pt-50 sm:pt-52 xl:pt-44 pb-16'>
        <section className='mx-auto sm:pt-4 w-full max-w-xl'>
          <div className='space-y-3 mb-6 xs:mb-10 text-center'>
            <h1 className='font-hand-rendered text-3xl sm:text-5xl'>Contact Me! </h1>
            <p className='text-muted-foreground text-sm xs:text-base sm:text-lg'>
              Send a note, and I’ll get back to you soon.
            </p>
          </div>

          <form
            className='relative space-y-6 bg-background-2nd shadow-card p-5 sm:p-8 border border-border/60 rounded-xl'
            onSubmit={handleSubmit}
          >
            <div className='top-2 right-4 absolute flex items-start gap-1.5 text-muted-foreground/80 text-xs'>
              <span className='text-red-500 text-base scale-120'>*</span>
              <span>required</span>
            </div>
            <div className='space-y-3'>
              <Label htmlFor='contact-name'>
                Name<span className='-ml-1 text-red-500'>*</span>
              </Label>
              <Input
                id='contact-name'
                name='name'
                autoComplete='name'
                placeholder='Your name'
                className='bg-background h-9 md:h-11 text-sm md:text-base ph'
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className='space-y-3'>
              <Label htmlFor='contact-email'>
                Email<span className='-ml-1 text-red-500'>*</span>
              </Label>
              <Input
                id='contact-email'
                name='email'
                type='email'
                autoComplete='email'
                placeholder='Your email address'
                className='bg-background h-9 md:h-11 text-sm md:text-base ph'
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className='space-y-3'>
              <Label htmlFor='contact-message'>
                Message<span className='-ml-1 text-red-500'>*</span>
              </Label>
              <Textarea
                id='contact-message'
                name='message'
                placeholder='Your message to Carla'
                className='bg-background min-h-30 sm:min-h-40 text-sm md:text-base resize-y ph'
                maxLength={5000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
              />
            </div>

            <Button
              type='submit'
              variant='brand'
              size='lg'
              className='w-full'
              disabled={!canSubmit}
            >
              {pending ? 'Sending…' : 'Send message'}
            </Button>

            <div className='flex justify-center mx-auto w-full max-w-100 min-h-16 overflow-visible max-[378px]:scale-80 max-[420px]:scale-90'>
              {TURNSTILE_SITE_KEY ? (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  className='w-full'
                  options={{
                    action: 'contact',
                    appearance: 'always',
                    size: 'flexible',
                    theme: 'auto',
                    responseField: false,
                  }}
                  onSuccess={handleVerificationSuccess}
                  onExpire={handleVerificationExpire}
                  onError={handleVerificationError}
                  onTimeout={handleVerificationExpire}
                  onUnsupported={handleVerificationError}
                />
              ) : (
                <p className='text-destructive text-sm'>
                  Human verification is not configured. Please try again later.
                </p>
              )}
            </div>
          </form>

          <div className='mt-6' aria-live='polite'>
            {error ? (
              <Alert variant='destructive' className='bg-destructive/10 border-destructive/60'>
                <AlertTitle>Message not sent</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {success ? (
              <Alert className='bg-positive/10 border-positive/60'>
                <AlertTitle>Message sent</AlertTitle>
                <AlertDescription>Thanks for getting in touch.</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
