import {
  escapeContactHtml,
  handleContactRequest,
  type ContactProviderInput,
} from '@/lib/contact/contactRequest';
import { createServiceRoleClient } from '@/lib/supabase-server';

export const maxDuration = 15;
export const dynamic = 'force-dynamic';

const RESEND_USER_AGENT =
  'Jalanea-ATS/1.0 (+https://ats.jalanea.dev)';

function createEmailBody(input: ContactProviderInput) {
  const safeName = escapeContactHtml(input.name);
  const safeEmail = escapeContactHtml(input.email);
  const safeSubject = escapeContactHtml(input.subject);
  const safeMessage = escapeContactHtml(input.message).replace(
    /\n/g,
    '<br />'
  );

  return {
    from: process.env.CONTACT_FROM_EMAIL!,
    to: [process.env.CONTACT_TO_EMAIL!],
    reply_to: input.email,
    subject: input.subject
      ? `[Contact] ${input.subject}`
      : `[Contact] Message from ${input.name}`,
    html: `
      <h2>New Jalanea ATS contact request</h2>
      <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
      ${safeSubject ? `<p><strong>Subject:</strong> ${safeSubject}</p>` : ''}
      <hr />
      <p>${safeMessage}</p>
      <hr />
      <p style="color: #666; font-size: 12px;">
        Submitted through the Jalanea ATS contact form.
      </p>
    `,
    text: [
      'New Jalanea ATS contact request',
      '',
      `From: ${input.name} (${input.email})`,
      input.subject ? `Subject: ${input.subject}` : '',
      '',
      input.message,
      '',
      '---',
      'Submitted through the Jalanea ATS contact form.',
    ].filter((line, index, lines) => line || lines[index - 1] !== '').join('\n'),
  };
}

export async function POST(request: Request) {
  return handleContactRequest(request, {
    configuration: {
      rateLimitSecret: process.env.CONTACT_RATE_LIMIT_SECRET,
      resendApiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.CONTACT_FROM_EMAIL,
      toEmail: process.env.CONTACT_TO_EMAIL,
    },
    async consumeRateLimit({ bucket, windowStart, limit }) {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase.rpc('consume_ai_rate_limit', {
        p_bucket: bucket,
        p_window_start: windowStart,
        p_limit: limit,
      });
      if (error) throw new Error('contact_rate_limit_failed');

      const result = Array.isArray(data) ? data[0] : data;
      if (!result || typeof result.allowed !== 'boolean') {
        throw new Error('contact_rate_limit_invalid');
      }
      return result.allowed;
    },
    async sendEmail(input, signal) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY!}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': input.idempotencyKey,
          'User-Agent': RESEND_USER_AGENT,
        },
        body: JSON.stringify(createEmailBody(input)),
        cache: 'no-store',
        signal,
      });

      return {
        accepted: response.ok,
        status: response.status,
      };
    },
    logFailure(event, metadata) {
      console.error('Contact submission failed', { event, ...metadata });
    },
  });
}
