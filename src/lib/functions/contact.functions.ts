import { createServerFn } from '@tanstack/react-start';

import type { ContactSubmission } from '../shared/contact.types';

function readRequiredString(data: Record<string, unknown>, key: keyof ContactSubmission) {
  const value = data[key];
  if (typeof value !== 'string') {
    throw new Error('Please complete all required fields.');
  }
  return value.trim();
}

function validateContactSubmission(data: unknown): ContactSubmission {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid contact form submission.');
  }

  const input = data as Record<string, unknown>;
  const name = readRequiredString(input, 'name');
  const email = readRequiredString(input, 'email').toLowerCase();
  const message = readRequiredString(input, 'message');
  const turnstileToken = readRequiredString(input, 'turnstileToken');

  if (name.length === 0 || name.length > 100) {
    throw new Error('Name must be between 1 and 100 characters.');
  }
  if (email.length === 0 || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }
  if (message.length === 0 || message.length > 5000) {
    throw new Error('Message must be between 1 and 5,000 characters.');
  }
  if (turnstileToken.length === 0 || turnstileToken.length > 4096) {
    throw new Error('Complete the human verification before sending.');
  }

  return { name, email, message, turnstileToken };
}

export const submitContactForm = createServerFn({ method: 'POST' })
  .validator((data: unknown) => validateContactSubmission(data))
  .handler(async ({ data }) => {
    const { sendContactMessage } = await import('../server/contact.server');
    await sendContactMessage(data);
    return { success: true } as const;
  });
