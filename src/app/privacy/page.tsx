import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - Jalanea ATS',
  description: 'Learn how Jalanea ATS protects your privacy with on-device processing and zero data collection by default.',
};

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-gray-400 mb-8">Last updated: January 2026</p>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          {/* TL;DR */}
          <section className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-indigo-300 mt-0 mb-3">TL;DR</h2>
            <ul className="text-gray-300 space-y-2 mb-0">
              <li><strong>Your resume never leaves your device</strong> in default mode</li>
              <li><strong>No accounts required</strong> &mdash; no email, no sign-up</li>
              <li><strong>No tracking or analytics</strong> by default</li>
              <li><strong>You control your data</strong> &mdash; delete it anytime</li>
              <li><strong>BYOK mode</strong> sends data to your chosen AI provider, not us</li>
            </ul>
          </section>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Introduction</h2>
            <p className="text-gray-300">
              Jalanea ATS (&quot;we,&quot; &quot;our,&quot; or &quot;the Service&quot;) is built on a privacy-first
              principle. We believe your resume contains sensitive personal information that should
              stay under your control. This policy explains how we handle your data.
            </p>
          </section>

          {/* On-Device Processing */}
          <section>
            <h2 className="text-2xl font-semibold text-white">On-Device Processing (Default Mode)</h2>
            <p className="text-gray-300">
              By default, Jalanea ATS processes your resume <strong>entirely within your browser</strong>.
              This means:
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
                <strong>No network requests with your data:</strong> In default mode, no personal
                information from your documents is transmitted over the internet.
              </li>
            </ul>
          </section>

          {/* Local Storage */}
          <section>
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
              You can delete all locally stored data at any time using the &quot;Delete All History&quot;
              option in the application, or by clearing your browser&apos;s site data.
            </p>
          </section>

          {/* BYOK Mode */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Bring Your Own Key (BYOK) Mode</h2>
            <p className="text-gray-300">
              BYOK mode is an optional feature that uses third-party AI services (like Google Gemini)
              to provide enhanced analysis. <strong>This is the only mode where your data leaves your device.</strong>
            </p>
            <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-4 my-4">
              <p className="text-amber-200 font-medium mb-2">When you enable BYOK mode:</p>
              <ul className="text-amber-100/80 space-y-1 text-sm">
                <li>Your resume text and job description are sent to your chosen AI provider</li>
                <li>The data goes directly from your browser to the provider &mdash; not through our servers</li>
                <li>You are responsible for reviewing the provider&apos;s privacy policy</li>
                <li>You provide your own API key; we never see or store it on our servers</li>
              </ul>
            </div>
            <p className="text-gray-300">
              Before using BYOK mode, you must explicitly consent to data sharing. You can revoke
              this consent at any time by disabling BYOK mode.
            </p>
          </section>

          {/* API Key Handling */}
          <section>
            <h2 className="text-2xl font-semibold text-white">API Key Handling</h2>
            <p className="text-gray-300">
              If you use BYOK mode, your API key is handled with care:
            </p>
            <ul className="text-gray-300 space-y-2">
              <li>
                <strong>Session storage (default):</strong> Your API key is stored only in browser
                memory and is cleared when you close the tab.
              </li>
              <li>
                <strong>Local storage (optional):</strong> If you choose to save your key, it is
                stored in your browser&apos;s localStorage. We recommend using session-only storage.
              </li>
              <li>
                <strong>Never transmitted to Jalanea:</strong> Your API key is sent directly to
                your chosen AI provider and is never sent to our servers.
              </li>
            </ul>
          </section>

          {/* What We Don't Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-white">What We Don&apos;t Collect</h2>
            <p className="text-gray-300">We do not collect:</p>
            <ul className="text-gray-300 space-y-1">
              <li>Your resume content or file</li>
              <li>Job descriptions you analyze</li>
              <li>Personal information (name, email, phone number)</li>
              <li>Analysis results or scores</li>
              <li>API keys or credentials</li>
              <li>IP addresses (for analytics purposes)</li>
              <li>Detailed browsing behavior</li>
            </ul>
          </section>

          {/* Analytics */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Analytics (If Enabled)</h2>
            <p className="text-gray-300">
              We may collect minimal, privacy-preserving analytics to improve the service. If enabled,
              this includes only:
            </p>
            <ul className="text-gray-300 space-y-1">
              <li>Page views (no user identification)</li>
              <li>Feature usage counts (e.g., &quot;export button clicked&quot;)</li>
              <li>Error reports (with no personal data)</li>
            </ul>
            <p className="text-gray-300">
              Analytics never include your resume content, job descriptions, or any personally
              identifiable information.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Your Rights</h2>
            <p className="text-gray-300">You have the right to:</p>
            <ul className="text-gray-300 space-y-2">
              <li>
                <strong>Access your data:</strong> All data is stored locally on your device. You
                can export your analysis history at any time.
              </li>
              <li>
                <strong>Delete your data:</strong> Use the &quot;Delete All History&quot; feature or clear
                your browser&apos;s site data.
              </li>
              <li>
                <strong>Opt out of BYOK:</strong> Simply don&apos;t enable the feature, and your data
                will never leave your device.
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Third-Party Services</h2>
            <p className="text-gray-300">
              If you use BYOK mode, your data is processed by third-party AI providers. Please
              review their privacy policies:
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
              We are not responsible for how third-party providers handle your data once it is
              transmitted to them.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Children&apos;s Privacy</h2>
            <p className="text-gray-300">
              Jalanea ATS is not intended for use by individuals under the age of 13. We do not
              knowingly collect or process data from children.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Changes to This Policy</h2>
            <p className="text-gray-300">
              We may update this privacy policy from time to time. Changes will be posted on this
              page with an updated &quot;Last updated&quot; date. Continued use of the service after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white">Contact Us</h2>
            <p className="text-gray-300">
              If you have questions about this privacy policy or our data practices, please contact us at:
            </p>
            <p className="text-indigo-400 font-medium">
              privacy@jalanea.works
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
