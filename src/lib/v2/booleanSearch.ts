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

export function runBooleanSearch(
  resume: ParsedResume,
  booleanSearchTerms: string[]
): BooleanSearchLayerResult {
  if (booleanSearchTerms.length === 0) {
    return {
      searchString: '(no search terms)',
      termResults: [],
      score: 100,
      wouldSurface: true,
    };
  }

  const fullText = flattenResume(resume);
  const termResults = booleanSearchTerms.map(term => {
    const normTerm = normalize(term);
    // Check for multi-word phrase match and individual word match
    const found = fullText.includes(normTerm) ||
      (normTerm.split(' ').length > 1 && normTerm.split(' ').every(w => w.length > 2 && fullText.includes(w)));
    return { term, found, isAndTerm: true }; // All terms treated as AND by default
  });

  // Build the display search string
  const searchString = booleanSearchTerms.map(t => `"${t}"`).join(' AND ');

  // Score: percentage of terms found, AND terms weighted more
  const foundCount = termResults.filter(t => t.found).length;
  const total = termResults.length;
  const score = Math.round((foundCount / total) * 100);

  // Would surface = at least 60% of terms found (recruiter searches are forgiving)
  const wouldSurface = score >= 60;

  return {
    searchString,
    termResults,
    score,
    wouldSurface,
  };
}
