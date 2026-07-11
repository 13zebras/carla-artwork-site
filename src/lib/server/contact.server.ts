import { Resend } from 'resend';

import type { ContactSubmission } from '../shared/contact.types';
import { getServerEnv } from './env.server';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type TurnstileVerification = {
  success: boolean;
  action?: string;
  'error-codes'?: string[];
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  );
}

async function verifyTurnstileToken(token: string) {
  const body = new URLSearchParams({
    secret: getServerEnv().TURNSTILE_SECRET_KEY,
    response: token,
  });

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
    if (!response.ok) {
      console.error('Cloudflare Turnstile verification request failed', response.status);
      return false;
    }

    const result = (await response.json()) as TurnstileVerification;
    if (!result.success) {
      console.error('Cloudflare Turnstile rejected contact submission', {
        errorCodes: result['error-codes'],
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Cloudflare Turnstile verification failed', error);
    return false;
  }
}

export async function sendContactMessage(submission: ContactSubmission) {
  const isHuman = await verifyTurnstileToken(submission.turnstileToken);
  if (!isHuman) {
    throw new Error('Human verification failed. Please try again.');
  }

  const env = getServerEnv();
  const resend = new Resend(env.RESEND_API_KEY);
  const safeName = escapeHtml(submission.name);
  const safeEmail = escapeHtml(submission.email);
  const safeMessage = escapeHtml(submission.message).replace(/\n/g, '<br />');

  try {
    const { error } = await resend.emails.send({
      from: env.AUTH_EMAIL_FROM,
      to: env.CONTACT_EMAIL_TO,
      replyTo: submission.email,
      subject: '🖼️ carlastine.com contact message 🎨',
      html: `<p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Message:</strong></p><p>${safeMessage}</p>`,
      text: `Name: ${submission.name}\nEmail: ${submission.email}\n\nMessage:\n${submission.message}`,
    });

    if (error) {
      console.error('Resend failed to send contact message', error);
      throw new Error('Unable to send your message right now. Please try again.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unable to send your message')) {
      throw error;
    }
    console.error('Resend contact delivery failed', error);
    throw new Error('Unable to send your message right now. Please try again.');
  }
}
