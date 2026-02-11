/**
 * Contact Form API
 *
 * Sends contact form submissions via Resend to support email.
 */

import { NextResponse } from 'next/server';

// Rate limiting: simple in-memory store (resets on deploy)
const submissions = new Map<string, number[]>();
const RATE_LIMIT = 5; // max submissions per IP
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = submissions.get(ip) || [];

  // Filter to only recent submissions
  const recent = timestamps.filter(t => now - t < RATE_WINDOW);
  submissions.set(ip, recent);

  return recent.length >= RATE_LIMIT;
}

function recordSubmission(ip: string): void {
  const timestamps = submissions.get(ip) || [];
  timestamps.push(Date.now());
  submissions.set(ip, timestamps);
}

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const { name, email, subject, message } = await request.json();

    // Validate required fields
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof message !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !message.trim()
    ) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedMessage = message.trim();
    const normalizedSubject =
      typeof subject === 'string'
        ? subject.replace(/[\r\n]+/g, ' ').trim()
        : '';

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Sanitize untrusted values before interpolating into HTML.
    const safeName = escapeHtml(normalizedName);
    const safeEmail = escapeHtml(normalizedEmail);
    const safeSubject = escapeHtml(normalizedSubject);
    const safeMessageHtml = escapeHtml(normalizedMessage).replace(/\n/g, '<br />');

    // Check for Resend API key
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Contact form is not configured. Please try again later.' },
        { status: 500 }
      );
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Jalanea ATS <noreply@jalanea.dev>',
        to: ['ats-support@jalanea.dev'],
        reply_to: normalizedEmail,
        subject: normalizedSubject
          ? `[Contact] ${normalizedSubject}`
          : `[Contact] Message from ${normalizedName}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
          ${safeSubject ? `<p><strong>Subject:</strong> ${safeSubject}</p>` : ''}
          <hr />
          <p>${safeMessageHtml}</p>
          <hr />
          <p style="color: #666; font-size: 12px;">
            This message was sent via the Jalanea ATS contact form.<br />
            Reply directly to this email to respond to ${safeName}.
          </p>
        `,
        text: `
New Contact Form Submission

From: ${normalizedName} (${normalizedEmail})
${normalizedSubject ? `Subject: ${normalizedSubject}` : ''}

${normalizedMessage}

---
This message was sent via the Jalanea ATS contact form.
Reply directly to this email to respond to ${normalizedName}.
        `.trim(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      );
    }

    // Record successful submission for rate limiting
    recordSubmission(ip);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
