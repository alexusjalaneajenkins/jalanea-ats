export type JobSearchProvider = 'indeed' | 'linkedin';

export interface JobSearchInput {
  role: string;
  location: string;
}

const MAX_QUERY_LENGTH = 160;

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH);
}

export function buildJobSearchUrl(
  provider: JobSearchProvider,
  input: JobSearchInput
): string {
  const role = normalizeQuery(input.role);
  const location = normalizeQuery(input.location);

  if (!role) {
    throw new Error('Enter a role or job title');
  }

  const url =
    provider === 'indeed'
      ? new URL('https://www.indeed.com/jobs')
      : new URL('https://www.linkedin.com/jobs/search/');

  url.searchParams.set(provider === 'indeed' ? 'q' : 'keywords', role);
  if (location) {
    url.searchParams.set(provider === 'indeed' ? 'l' : 'location', location);
  }

  return url.toString();
}
