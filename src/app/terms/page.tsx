import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use - Jalanea ATS',
  description: 'Terms of use for Jalanea ATS resume checker, including free tier, paid plans, and BYOK mode.',
};

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-forge-950 text-gray-100">
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
          Terms of Use
        </h1>
        <p className="text-gray-400 mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          {/* TL;DR */}
          <section className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-indigo-300 mt-0 mb-3">TL;DR</h2>
            <ul className="text-gray-300 space-y-2 mb-0">
              <li><strong>Free to try</strong> &mdash; 3 AI-powered analyses per day, no account needed</li>
              <li><strong>Your data, your control</strong> &mdash; resumes are processed in your browser</li>
              <li><strong>Paid plans are optional</strong> &mdash; $5/month or $15 lifetime for unlimited AI features</li>
              <li><strong>BYOK is free</strong> &mdash; use your own Gemini API key for unlimited analysis</li>
              <li><strong>No guarantees on job outcomes</strong> &mdash; we help optimize, not guarantee placement</li>
            </ul>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-2xl font-semibold text-white">What Jalanea ATS Does</h2>
            <p className="text-gray-300">
              Jalanea ATS (&quot;the Service&quot;) is a resume analysis tool that helps job seekers
              understand how applicant tracking systems (ATS) read their resumes. The Service
              provides parsing analysis, keyword matching, formatting feedback, and AI-powered
              suggestions to help you optimize your resume for ATS compatibility.
            </p>
          </section>

          {/* Free Tier */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Free Tier &amp; Demo Usage</h2>
            <p className="text-gray-300">
              The free tier provides up to 3 AI-powered analyses per day. This limit is tracked
              by IP address and resets daily at midnight UTC.
            </p>
            <ul className="text-gray-300 space-y-2">
              <li>
                <strong>No account required:</strong> You can use the free tier without creating an account.
              </li>
              <li>
                <strong>Rate limiting:</strong> We apply rate limits to prevent abuse. Excessive
                automated requests may be blocked.
              </li>
              <li>
                <strong>No guarantees:</strong> The free tier is provided as-is. We may adjust
                limits, temporarily disable, or discontinue the free tier at any time.
              </li>
            </ul>
          </section>

          {/* Paid Plans */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Paid Plans</h2>
            <p className="text-gray-300">
              Paid plans provide unlimited AI-powered analysis without needing your own API key.
            </p>
            <ul className="text-gray-300 space-y-2">
              <li>
                <strong>Monthly ($5/month):</strong> Billed monthly. You can cancel at any time
                from your account page or by contacting us. Cancellation takes effect at the end
                of your current billing period.
              </li>
              <li>
                <strong>Lifetime ($15 one-time):</strong> A single payment for permanent access.
                No recurring charges. Includes all future updates and features.
              </li>
              <li>
                <strong>Account required:</strong> You must create an account to purchase a paid
                plan. Your subscription is linked to your account.
              </li>
              <li>
                <strong>Payments:</strong> Processed securely through Stripe. We do not store your
                payment information on our servers.
              </li>
              <li>
                <strong>Refunds:</strong> Contact us within 7 days of purchase if you are unsatisfied.
                We will process refunds on a case-by-case basis.
              </li>
            </ul>
          </section>

          {/* BYOK Mode */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Bring Your Own Key (BYOK) Mode</h2>
            <p className="text-gray-300">
              BYOK mode allows you to use your own Google Gemini API key for unlimited AI
              analysis at no cost to you (beyond any charges from Google for API usage).
            </p>
            <ul className="text-gray-300 space-y-2">
              <li>
                <strong>Your responsibility:</strong> You are responsible for your own API key usage
                and any associated costs from Google.
              </li>
              <li>
                <strong>Third-party terms:</strong> Your use of the Gemini API is governed by
                Google&apos;s terms of service, not ours.
              </li>
              <li>
                <strong>Data handling:</strong> When using BYOK mode, your resume text is sent
                directly from your browser to Google&apos;s API. See our{' '}
                <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">
                  Privacy Policy
                </Link>{' '}
                for details.
              </li>
            </ul>
          </section>

          {/* User Conduct */}
          <section>
            <h2 className="text-2xl font-semibold text-white">User Conduct</h2>
            <p className="text-gray-300">When using the Service, you agree not to:</p>
            <ul className="text-gray-300 space-y-2">
              <li>Use automated tools or bots to access the Service beyond normal usage</li>
              <li>Attempt to circumvent rate limits or usage restrictions</li>
              <li>Upload content that is illegal, harmful, or violates others&apos; rights</li>
              <li>Reverse-engineer, decompile, or attempt to extract source code from the Service</li>
              <li>Share or redistribute paid features with others who have not purchased access</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Intellectual Property</h2>
            <ul className="text-gray-300 space-y-2">
              <li>
                <strong>Your content:</strong> You own your resume and all content you upload. We
                claim no rights to your documents.
              </li>
              <li>
                <strong>Our service:</strong> The Jalanea ATS application, including its code,
                design, analysis algorithms, and educational content, is owned by Jalanea.
              </li>
              <li>
                <strong>Analysis output:</strong> The analysis results, scores, and suggestions
                generated by the Service are provided for your personal use.
              </li>
            </ul>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Disclaimers</h2>
            <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-medium mb-2">Important:</p>
              <ul className="text-amber-100/80 space-y-1 text-sm">
                <li>Jalanea ATS does not guarantee that optimizing your resume will result in
                  job interviews or employment</li>
                <li>ATS compatibility scores are estimates based on common parsing patterns
                  and may not reflect the exact behavior of every ATS vendor</li>
                <li>AI-powered suggestions are generated by third-party models and should be
                  reviewed before use</li>
              </ul>
            </div>
            <p className="text-gray-300">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, either express or implied, including but not limited to
              implied warranties of merchantability, fitness for a particular purpose, or
              non-infringement.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Limitation of Liability</h2>
            <p className="text-gray-300">
              To the maximum extent permitted by law, Jalanea shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss
              of profits or revenues, whether incurred directly or indirectly, or any loss of
              data, use, goodwill, or other intangible losses, resulting from your use of the
              Service.
            </p>
            <p className="text-gray-300">
              Our total liability for any claims related to the Service shall not exceed the
              amount you paid us in the 12 months prior to the claim.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Changes to These Terms</h2>
            <p className="text-gray-300">
              We may update these terms from time to time. Changes will be posted on this page
              with an updated &quot;Last updated&quot; date. Continued use of the Service after
              changes constitutes acceptance of the updated terms. For material changes, we will
              make reasonable efforts to notify users.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Contact Us</h2>
            <p className="text-gray-300">
              If you have questions about these terms, please contact us at:
            </p>
            <p className="text-indigo-400 font-medium">
              terms@jalanea.works
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Jalanea. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-gray-300 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/" className="hover:text-gray-300 transition-colors">
                Home
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
