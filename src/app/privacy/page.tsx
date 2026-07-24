import type { Metadata } from 'next';
import Link from 'next/link';
import { PUBLIC_SUPPORT_EMAIL } from '@/lib/contact/publicSupport';

export const metadata: Metadata = {
  title: 'Privacy Policy - Jalanea ATS',
  description: 'Learn how Jalanea ATS handles local resume parsing and consent-based AI processing.',
};

export default function PrivacyPolicyPage() {
  const sections = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'on-device-processing', label: 'On-Device Processing' },
    { id: 'local-storage', label: 'Local Storage' },
    { id: 'ai-processing', label: 'AI Processing' },
    { id: 'api-key-handling', label: 'API Key Handling' },
    { id: 'service-data', label: 'Service Data' },
    { id: 'what-we-dont-collect', label: 'What We Do Not Collect' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'your-rights', label: 'Your Rights' },
    { id: 'third-party-services', label: 'Third-Party Services' },
    { id: 'children-privacy', label: 'Children\'s Privacy' },
    { id: 'policy-changes', label: 'Policy Changes' },
    { id: 'contact', label: 'Contact' },
  ];

  const sectionClass = 'pt-6 border-t border-gray-800/70';

  return (
    <div className="min-h-screen text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p className="text-gray-400 mb-8">Last updated: July 2026</p>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          {/* TL;DR */}
          <section className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-indigo-300 mt-0 mb-3">TL;DR</h2>
            <ul className="text-gray-300 space-y-2 mb-0">
              <li><strong>Your resume file stays on your device</strong> during local parsing</li>
              <li><strong>No account is required for local analysis or the free demo</strong>; paid and BYOK access use an account</li>
              <li><strong>No tracking or analytics</strong> by default</li>
              <li><strong>You control your data</strong> &mdash; delete it anytime</li>
              <li><strong>AI features require consent</strong> before resume text is sent to Google Gemini</li>
            </ul>
          </section>

          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mt-0 mb-3">Table of Contents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-sm text-indigo-300 hover:text-indigo-200 transition-colors"
                >
                  {section.label}
                </a>
              ))}
            </div>
          </section>

          {/* Introduction */}
          <section id="introduction" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">Introduction</h2>
            <p className="text-gray-300">
              Jalanea ATS (&quot;we,&quot; &quot;our,&quot; or &quot;the Service&quot;) is built on a privacy-first
              principle. We believe your resume contains sensitive personal information that should
              stay under your control. This policy explains how we handle your data.
            </p>
          </section>

          {/* On-Device Processing */}
          <section id="on-device-processing" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">On-Device Processing (Default Mode)</h2>
            <p className="text-gray-300">
              Jalanea ATS parses your resume file <strong>entirely within your browser</strong> before
              any optional AI processing. This means:
            </p>
            <ul className="text-gray-300 space-y-2">
              <li>
                <strong>No upload to our servers:</strong> Your resume file is parsed using JavaScript
                running in your browser. The file never leaves your device.
              </li>
              <li>
                <strong>No cloud storage:</strong> We do not store your resume, job descriptions, or
                analysis results on any server.
              </li>
              <li>
                <strong>Consent before AI sharing:</strong> Resume and job-description text is not
                sent to Google Gemini unless you explicitly enable AI features.
              </li>
            </ul>
          </section>

          {/* Local Storage */}
          <section id="local-storage" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">Local Storage</h2>
            <p className="text-gray-300">
              To provide features like session history and saved analyses, we store data locally on
              your device using browser technologies:
            </p>
            <ul className="text-gray-300 space-y-2">
              <li>
                <strong>IndexedDB:</strong> Stores your analysis sessions, including extracted text,
                scores, and findings. This data exists only on your device.
              </li>
              <li>
                <strong>localStorage:</strong> Stores small pieces of data like your device ID
                (a random identifier) and user preferences.
              </li>
            </ul>
            <p className="text-gray-300">
              This browser storage is not encrypted by Jalanea. Anyone with access to your unlocked
              device or browser profile may be able to read it. If IndexedDB is unavailable, some
              sessions may use temporary in-memory storage and disappear when the page closes.
            </p>
            <p className="text-gray-300">
              You can delete all ATS data stored by this browser at any time using the
              &quot;Clear all local ATS data&quot; option, or by clearing this site&apos;s browser data.
              Removing Jalanea ATS from the Account page performs the same local cleanup after the
              server confirms that product-scoped removal completed.
            </p>
          </section>

          {/* AI Processing */}
          <section id="ai-processing" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">AI Processing and BYOK Mode</h2>
            <p className="text-gray-300">
              AI analysis is optional and uses Google Gemini. Before an AI request is made, you must
              explicitly consent to sending your resume text and job description to Google for processing.
            </p>
            <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-medium mb-2">When you enable AI features:</p>
              <ul className="text-amber-100/80 space-y-1 text-sm">
                <li>Your resume text and job description are sent to Google Gemini</li>
                <li>Free and paid-plan requests pass through Jalanea&apos;s server without being stored there</li>
                <li>BYOK requests go directly from your browser to Google Gemini</li>
                <li>Your BYOK API key remains in your browser and is never sent to Jalanea</li>
              </ul>
            </div>
            <p className="text-gray-300">
              You can revoke consent by disabling AI features. Local parsing and non-AI analysis
              remain available without sharing document text with Google.
            </p>
          </section>

          {/* API Key Handling */}
          <section id="api-key-handling" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">API Key Handling</h2>
            <p className="text-gray-300">
              BYOK is not part of the anonymous free tier. It requires a signed-in account with
              verified paid ATS access; an account with an explicit complimentary administrative
              grant may also qualify. If you use BYOK mode, your API key is handled as follows:
            </p>
            <ul className="text-gray-300 space-y-2">
              <li>
                <strong>Browser persistence:</strong> Your selected provider configuration and API
                key are stored in IndexedDB for the signed-in account on that browser.
              </li>
              <li>
                <strong>Never transmitted to Jalanea:</strong> Your API key is sent directly to
                your chosen AI provider and is never sent to our servers.
              </li>
              <li>
                <strong>Not encrypted by the app:</strong> Jalanea does not encrypt the key before
                browser storage. Remove it in AI settings and avoid saving it on shared devices.
              </li>
            </ul>
          </section>

          <section id="service-data" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">Account, Billing, Contact, and Abuse-Prevention Data</h2>
            <p className="text-gray-300">
              Supabase processes your sign-in email, shared account identity, ATS entitlement, and
              product-scoped account state. Stripe processes checkout and retains customer,
              subscription, invoice, and payment records under its policies and legal obligations.
            </p>
            <p className="text-gray-300">
              If you use the contact form, your name, email, subject, and message are submitted to
              Jalanea through Resend for email delivery. Resend accepting a request does not
              guarantee final delivery. To limit abuse, we store keyed, hashed request identifiers
              rather than raw IP addresses. Free-demo counters normally become eligible for
              deletion after seven days, and fixed-window AI and contact counters after 48 hours;
              bounded scheduled cleanup removes eligible records over subsequent runs.
            </p>
          </section>

          {/* What We Don't Collect */}
          <section id="what-we-dont-collect" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">What We Don&apos;t Store on Jalanea Servers</h2>
            <p className="text-gray-300">Jalanea servers do not store:</p>
            <ul className="text-gray-300 space-y-1">
              <li>Your resume content or file</li>
              <li>Job descriptions you analyze</li>
              <li>Personal information contained in resume or job-description content</li>
              <li>Analysis results or scores</li>
              <li>BYOK API keys; a saved key remains in that browser&apos;s IndexedDB</li>
              <li>Raw IP addresses in abuse-prevention counters; keyed, hashed identifiers are used instead</li>
              <li>Detailed browsing behavior</li>
            </ul>
          </section>

          {/* Analytics */}
          <section id="analytics" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">Analytics and Operational Logs</h2>
            <p className="text-gray-300">
              We do not currently use a product-analytics SDK. Our hosting, authentication,
              payment, AI, and email providers may still create limited technical and security
              logs when they process a request. Those logs can include request timing, status,
              provider identifiers, and network information under each provider&apos;s policies.
            </p>
            <p className="text-gray-300">
              Application error messages are designed not to log resume text, job descriptions,
              contact-message content, API keys, or provider response bodies.
            </p>
          </section>

          {/* Your Rights */}
          <section id="your-rights" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">Your Rights</h2>
            <p className="text-gray-300">You have the right to:</p>
            <ul className="text-gray-300 space-y-2">
              <li>
                <strong>Access your data:</strong> Resume history is stored locally on your device
                and can be exported at any time. Account, entitlement, and usage records are
                product-scoped server data.
              </li>
              <li>
                <strong>Remove ATS data:</strong> Use &quot;Remove Jalanea ATS data&quot; on the Account
                page to cancel active ATS subscriptions and remove product-scoped access, billing
                links, usage records, and browser-local ATS data. Your shared sign-in, profile,
                tutoring records, and Stripe&apos;s payment records remain.
              </li>
              <li>
                <strong>Opt out of AI:</strong> Don&apos;t enable AI features, and resume or
                job-description text will not be sent to Google.
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section id="third-party-services" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">Third-Party Services</h2>
            <p className="text-gray-300">
              If you enable any AI feature, your resume text and job description are processed by
              Google Gemini. Please review its terms and privacy information:
            </p>
            <ul className="text-gray-300 space-y-1">
              <li>
                <a
                  href="https://ai.google.dev/gemini-api/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  Google Gemini API Terms
                </a>
              </li>
            </ul>
            <p className="text-gray-300 mt-4">
              Paid plans use Stripe for checkout and billing. Stripe retains customer, payment, and
              invoice records under its policies and applicable legal obligations. Removing Jalanea
              ATS data deletes our product-scoped billing links and entitlements; it does not delete
              records held by Stripe.
            </p>
            <p className="text-gray-300 mt-4">
              Supabase provides shared authentication and stores ATS account and entitlement
              records. Resend processes contact-form messages so they can reach support.
            </p>
            <p className="text-gray-300 mt-4">
              Third-party providers handle transmitted data under their own terms and privacy
              policies.
            </p>
          </section>

          {/* Children's Privacy */}
          <section id="children-privacy" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">Children&apos;s Privacy</h2>
            <p className="text-gray-300">
              Jalanea ATS is not intended for use by individuals under the age of 13. We do not
              knowingly collect or process data from children.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section id="policy-changes" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">Changes to This Policy</h2>
            <p className="text-gray-300">
              We may update this privacy policy from time to time. Changes will be posted on this
              page with an updated &quot;Last updated&quot; date. Continued use of the service after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section id="contact" className={sectionClass}>
            <h2 className="text-2xl font-semibold text-white">Contact Us</h2>
            <p className="text-gray-300">
              If you have questions about this privacy policy or our data practices, please contact us at:
            </p>
            <a
              href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
              className="text-indigo-400 font-medium hover:text-indigo-300"
            >
              {PUBLIC_SUPPORT_EMAIL}
            </a>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Jalanea. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-gray-300 transition-colors">
                Terms of Use
              </Link>
              <Link href="/help" className="hover:text-gray-300 transition-colors">
                Help & FAQ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
