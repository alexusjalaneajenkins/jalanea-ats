/**
 * V2 Layer 2: Section-Aware Keyword Matching
 *
 * Checks each required skill against the correct resume section.
 * Simulates how parsed resume data populates searchable ATS fields.
 */

import type { ParsedResume, ParsedJobDescription, SectionMatchItem, SectionMatchLayerResult } from './types';

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s\-\/\+\#\.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findInStrings(items: string[], searchTerm: string): { found: boolean; match?: string } {
  const norm = normalize(searchTerm);
  const terms = norm.split(' ').filter(t => t.length > 1);
  for (const item of items) {
    const normItem = normalize(item);
    // Exact substring match
    if (normItem.includes(norm)) return { found: true, match: item };
    // All significant words present
    if (terms.length > 1 && terms.every(t => normItem.includes(t))) return { found: true, match: item };
  }
  return { found: false };
}

function findInBullets(workHistory: ParsedResume['workHistory'], searchTerm: string): { found: boolean; match?: string } {
  const norm = normalize(searchTerm);
  const terms = norm.split(' ').filter(t => t.length > 1);
  for (const job of workHistory) {
    for (const bullet of job.bullets) {
      const normBullet = normalize(bullet);
      if (normBullet.includes(norm)) return { found: true, match: `[${job.title}] ${bullet}` };
      if (terms.length > 1 && terms.every(t => normBullet.includes(t))) return { found: true, match: `[${job.title}] ${bullet}` };
    }
    // Also check job title
    if (normalize(job.title).includes(norm)) return { found: true, match: `Job title: ${job.title} at ${job.company}` };
  }
  return { found: false };
}

/** Search all resume sections for a term */
function searchAllSections(resume: ParsedResume, term: string): { section: string; match: string } | null {
  // Skills
  const skillResult = findInStrings(resume.skills, term);
  if (skillResult.found) return { section: 'skills', match: skillResult.match! };
  // Certifications
  const certResult = findInStrings(resume.certifications, term);
  if (certResult.found) return { section: 'certifications', match: certResult.match! };
  // Work history bullets
  const bulletResult = findInBullets(resume.workHistory, term);
  if (bulletResult.found) return { section: 'experience', match: bulletResult.match! };
  // Summary
  if (resume.summary && normalize(resume.summary).includes(normalize(term))) {
    return { section: 'summary', match: resume.summary.slice(0, 120) };
  }
  // Education
  const eduStrings = resume.education.map(e => `${e.degree} ${e.field || ''} ${e.school}`);
  const eduResult = findInStrings(eduStrings, term);
  if (eduResult.found) return { section: 'education', match: eduResult.match! };
  return null;
}

function matchSkill(resume: ParsedResume, skill: { skill: string; category: string; matchSection: string }): SectionMatchItem {
  const base: Omit<SectionMatchItem, 'foundInSection' | 'matchingLine' | 'isCorrectSection' | 'found' | 'weight'> = {
    skill: skill.skill,
    category: skill.category as SectionMatchItem['category'],
    expectedSection: skill.matchSection as SectionMatchItem['expectedSection'],
  };

  // Search the expected section first
  let result: { section: string; match: string } | null = null;

  if (skill.matchSection === 'skills') {
    const r = findInStrings(resume.skills, skill.skill);
    if (r.found) result = { section: 'skills', match: r.match! };
  } else if (skill.matchSection === 'certifications') {
    const r = findInStrings(resume.certifications, skill.skill);
    if (r.found) result = { section: 'certifications', match: r.match! };
  } else if (skill.matchSection === 'experience') {
    const r = findInBullets(resume.workHistory, skill.skill);
    if (r.found) result = { section: 'experience', match: r.match! };
  }

  // Found in expected section — full weight
  if (result) {
    return { ...base, foundInSection: result.section, matchingLine: result.match, isCorrectSection: true, found: true, weight: 1.0 };
  }

  // Not found in expected section — search everywhere
  const fallback = searchAllSections(resume, skill.skill);
  if (fallback) {
    const isCorrect = skill.matchSection === 'any' || fallback.section === skill.matchSection;
    return { ...base, foundInSection: fallback.section, matchingLine: fallback.match, isCorrectSection: isCorrect, found: true, weight: isCorrect ? 1.0 : 0.6 };
  }

  // Not found anywhere
  return { ...base, found: false, isCorrectSection: false, weight: 0 };
}

export function runSectionMatching(
  resume: ParsedResume,
  jd: ParsedJobDescription
): SectionMatchLayerResult {
  const matches = jd.requiredSkills.map(skill => matchSkill(resume, skill));

  // Also check preferred qualifications (lower weight)
  const preferredMatches = jd.preferredQualifications.map(pref => {
    const asSkill = { skill: pref, category: 'soft' as const, matchSection: 'any' as const };
    return matchSkill(resume, asSkill);
  });

  const totalRequired = matches.length;
  const totalWeight = matches.reduce((sum, m) => sum + m.weight, 0);
  const maxWeight = totalRequired; // Max possible = 1.0 per skill

  // Add preferred qualification bonus (up to 10%)
  const prefFound = preferredMatches.filter(m => m.found).length;
  const prefTotal = preferredMatches.length;
  const prefBonus = prefTotal > 0 ? (prefFound / prefTotal) * 10 : 0;

  const baseScore = maxWeight > 0 ? (totalWeight / maxWeight) * 100 : 100;
  const score = Math.round(Math.min(baseScore + prefBonus, 100));

  return {
    matches,
    preferredMatches,
    score,
    foundCount: matches.filter(m => m.found).length,
    totalRequired,
  };
}
