/**
 * V2 Layer 3: Boolean Search Simulation
 *
 * Simulates a recruiter typing a boolean search query into
 * the ATS candidate database. Answers: "Would this resume surface?"
 */

import type { ParsedResume, BooleanSearchLayerResult } from './types';

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s\-\/\+\#\.]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Flatten all resume text into a single searchable string */
function flattenResume(resume: ParsedResume): string {
  const parts: string[] = [
    resume.contactInfo.name || '',
    resume.summary || '',
    ...resume.skills,
    ...resume.certifications,
    ...(resume.languages || []),
    ...resume.workHistory.flatMap(w => [
      w.title, w.company, w.location || '', ...w.bullets
    ]),
    ...resume.education.map(e => `${e.degree} ${e.field || ''} ${e.school}`),
    ...(resume.volunteerWork || []).map(v => `${v.role} ${v.organization} ${v.description || ''}`),
  ];
  return normalize(parts.join(' '));
}

function containsSearchTerm(fullText: string, normalizedTerm: string): boolean {
  if (!normalizedTerm) return false;
  if (normalizedTerm.includes(' ')) {
    return fullText.includes(normalizedTerm);
  }
  return ` ${fullText} `.includes(` ${normalizedTerm} `);
}

export function runBooleanSearch(
  resume: ParsedResume,
  booleanSearchTerms: string[]
): BooleanSearchLayerResult {
  const uniqueTerms = booleanSearchTerms
    .map((term) => ({ term: term.trim(), normalized: normalize(term) }))
    .filter((term) => term.term && term.normalized)
    .filter(
      (term, index, all) =>
        all.findIndex((candidate) => candidate.normalized === term.normalized) ===
        index
    );

  if (uniqueTerms.length === 0) {
    return {
      searchString: '(no search terms)',
      termResults: [],
      score: 0,
      evidenceStatus: 'not-evaluated',
      wouldSurface: null,
    };
  }

  const fullText = flattenResume(resume);
  const termResults = uniqueTerms.map(({ term, normalized }) => {
    const found = containsSearchTerm(fullText, normalized);
    return { term, found, isAndTerm: true };
  });

  // Build the display search string
  const searchString = uniqueTerms.map(({ term }) => `"${term}"`).join(' AND ');

  // Score: percentage of terms found, AND terms weighted more
  const foundCount = termResults.filter(t => t.found).length;
  const total = termResults.length;
  const score = Math.round((foundCount / total) * 100);

  // The displayed expression uses AND, so every term must match.
  const wouldSurface = termResults.every((term) => term.found);

  return {
    searchString,
    termResults,
    score,
    evidenceStatus: 'evaluated',
    wouldSurface,
  };
}
