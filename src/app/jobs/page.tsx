import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { JobSearchLauncher } from '@/components/jobs/JobSearchLauncher';

export const metadata: Metadata = {
  title: 'Find Jobs | Jalanea ATS',
  description:
    'Create role-and-location job searches on Indeed and LinkedIn, then bring the job description back to Jalanea ATS.',
};

export default function JobsPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-indigo-300 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to resume analysis
        </Link>

        <div className="mb-8 mt-6 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
            Find Jobs
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Search live job boards with a clearer target.
          </h1>
          <p className="mt-4 text-base leading-7 text-indigo-200">
            Enter the role and location you want. We&apos;ll prepare external
            searches on Indeed and LinkedIn; applications happen on those
            providers, not inside Jalanea ATS.
          </p>
        </div>

        <JobSearchLauncher />
      </div>
    </main>
  );
}
