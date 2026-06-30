import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins/magic-link';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { Resend } from 'resend';

import { getDb } from './db.server';
import { getServerEnv } from './env.server';

const env = getServerEnv();
const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  database: getDb(),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  plugins: [
    magicLink({
      async sendMagicLink({ email, url }) {
        if (email.toLowerCase() !== env.ADMIN_EMAIL) {
          throw new Error('Unauthorized email');
        }

        const { error } = await resend.emails.send({
          from: env.AUTH_EMAIL_FROM,
          to: email,
          subject: 'Sign in to Carla Stine admin',
          html: `<p>Use this link to sign in:</p><p><a href="${url}">${url}</a></p><p>This link expires soon.</p>`,
          text: `Use this link to sign in: ${url}\n\nThis link expires soon.`,
        });

        if (error) {
          console.error('Resend failed to send admin magic link', error);
          throw new Error(error.message || 'Unable to send sign-in email');
        }
      },
    }),
    tanstackStartCookies(),
  ],
});
