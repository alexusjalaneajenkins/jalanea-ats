'use client';

import { FormEvent, useMemo, useState } from 'react';
import { BriefcaseBusiness, ExternalLink, MapPin, Search } from 'lucide-react';
import { buildJobSearchUrl } from '@/lib/jobs/search';

export function JobSearchLauncher() {
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [submittedRole, setSubmittedRole] = useState('');
  const [submittedLocation, setSubmittedLocation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const searchLinks = useMemo(() => {
    if (!submittedRole) return null;

    const input = {
      role: submittedRole,
      location: submittedLocation,
    };
    return {
      indeed: buildJobSearchUrl('indeed', input),
      linkedin: buildJobSearchUrl('linkedin', input),
    };
  }, [submittedLocation, submittedRole]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedRole = role.trim();
    if (!normalizedRole) {
      setError('Enter a role or job title.');
      return;
    }

    setError(null);
    setSubmittedRole(normalizedRole);
    setSubmittedLocation(location.trim());
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-3xl border border-indigo-500/30 bg-indigo-950/50 p-5 shadow-2xl shadow-indigo-950/30 sm:p-7"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
              <BriefcaseBusiness className="h-4 w-4 text-orange-400" />
              Role or job title
            </span>
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              maxLength={160}
              autoComplete="organization-title"
              placeholder="e.g. Registered Nurse"
              className="w-full rounded-xl border border-indigo-500/30 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-indigo-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
              <MapPin className="h-4 w-4 text-cyan-400" />
              Location
            </span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={160}
              autoComplete="address-level2"
              placeholder="e.g. Atlanta, GA or Remote"
              className="w-full rounded-xl border border-indigo-500/30 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-indigo-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-pink-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-orange-500/20 transition hover:opacity-90 sm:w-auto"
        >
          <Search className="h-4 w-4" />
          Create job searches
        </button>
      </form>

      {searchLinks && (
        <section
          aria-live="polite"
          className="rounded-3xl border border-cyan-500/25 bg-cyan-950/20 p-5 sm:p-7"
        >
          <h2 className="text-xl font-bold text-white">Your searches are ready</h2>
          <p className="mt-2 text-sm leading-6 text-indigo-200">
            These buttons open live results on the provider&apos;s website.
            Jalanea ATS does not copy, rank, or endorse those listings.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href={searchLinks.indeed}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-900/50 px-5 py-3 font-semibold text-white transition hover:border-indigo-300 hover:bg-indigo-800/60"
            >
              Search Indeed
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={searchLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-900/30 px-5 py-3 font-semibold text-white transition hover:border-cyan-300 hover:bg-cyan-800/40"
            >
              Search LinkedIn
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-5 text-xs leading-5 text-indigo-400">
            When you find a role, copy its job description and paste it into
            Jalanea ATS to compare it with your resume.
          </p>
        </section>
      )}
    </div>
  );
}
