import assert from 'node:assert/strict';
import test from 'node:test';

import { buildJobSearchUrl } from '../src/lib/jobs/search.ts';

test('job search URLs preserve role and location in official provider parameters', () => {
  const input = {
    role: 'Registered Nurse',
    location: 'Atlanta, GA',
  };
  const indeed = new URL(buildJobSearchUrl('indeed', input));
  const linkedin = new URL(buildJobSearchUrl('linkedin', input));

  assert.equal(indeed.origin, 'https://www.indeed.com');
  assert.equal(indeed.pathname, '/jobs');
  assert.equal(indeed.searchParams.get('q'), input.role);
  assert.equal(indeed.searchParams.get('l'), input.location);

  assert.equal(linkedin.origin, 'https://www.linkedin.com');
  assert.equal(linkedin.pathname, '/jobs/search/');
  assert.equal(linkedin.searchParams.get('keywords'), input.role);
  assert.equal(linkedin.searchParams.get('location'), input.location);
});

test('job search URLs reject an empty role and cap untrusted input', () => {
  assert.throws(() =>
    buildJobSearchUrl('indeed', { role: '   ', location: 'Remote' })
  );

  const url = new URL(
    buildJobSearchUrl('linkedin', {
      role: `Engineer ${'x'.repeat(500)}`,
      location: '',
    })
  );
  assert.equal(url.searchParams.get('keywords')?.length, 160);
  assert.equal(url.searchParams.has('location'), false);
});
