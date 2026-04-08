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

/** Extract acronyms from parentheses: "Applied Behavior Analysis (ABA)" → ["aba"] */
function extractAcronyms(text: string): string[] {
  const matches = text.match(/\(([A-Za-z]{2,})\)/g) || [];
  return matches.map(m => m.replace(/[()]/g, '').toLowerCase());
}

/** Extract the core skill name, stripping qualifiers and experience requirements */
const NOISE_WORDS = new Set([
  'experience', 'knowledge', 'proficiency', 'familiarity', 'with',
  'in', 'of', 'or', 'and', 'the', 'a', 'an', 'year', 'years',
  'minimum', 'required', 'preferred', 'strong', 'demonstrated',
  'proven', 'ability', 'to', 'working', 'using',
]);

function getCoreTerms(text: string): string[] {
  return normalize(text).split(' ')
    .filter(t => t.length > 1 && !NOISE_WORDS.has(t) && !/^\d+$/.test(t));
}

function findInStrings(items: string[], searchTerm: string): { found: boolean; match?: string } {
  const norm = normalize(searchTerm);
  const acronyms = extractAcronyms(searchTerm);
  const coreTerms = getCoreTerms(searchTerm);
  
  for (const item of items) {
    const normItem = normalize(item);
    const itemAcronyms = extractAcronyms(item);
    
    // Direct substring match (either direction — item in search or search in item)
    if (normItem.includes(norm) || norm.includes(normItem)) return { found: true, match: item };
    
    // Acronym match: "ABA" from search found in item, or item's acronym in search
    if (acronyms.some(a => normItem === a || normItem.includes(a))) return { found: true, match: item };
    if (itemAcronyms.some(a => norm.includes(a))) return { found: true, match: item };
    
    // Core terms: if most core terms (>= 60%) are present in the item
    if (coreTerms.length > 0) {
      const matchCount = coreTerms.filter(t => normItem.includes(t)).length;
      if (matchCount >= Math.max(1, Math.ceil(coreTerms.length * 0.6))) return { found: true, match: item };
    }
    
    // Reverse: item's core words found in the search term (handles short items matching verbose searches)
    const itemCoreTerms = getCoreTerms(item);
    if (itemCoreTerms.length > 0 && itemCoreTerms.every(t => norm.includes(t))) return { found: true, match: item };
  }
  return { found: false };
}

function findInBullets(workHistory: ParsedResume['workHistory'], searchTerm: string): { found: boolean; match?: string } {
  const norm = normalize(searchTerm);
  const acronyms = extractAcronyms(searchTerm);
  const coreTerms = getCoreTerms(searchTerm);
  
  for (const job of workHistory) {
    for (const bullet of job.bullets) {
      const normBullet = normalize(bullet);
      // Direct match
      if (normBullet.includes(norm)) return { found: true, match: `[${job.title}] ${bullet}` };
      // Acronym match
      if (acronyms.some(a => normBullet.includes(a))) return { found: true, match: `[${job.title}] ${bullet}` };
      // Core terms match (>= 60%)
      if (coreTerms.length > 0) {
        const matchCount = coreTerms.filter(t => normBullet.includes(t)).length;
        if (matchCount >= Math.max(1, Math.ceil(coreTerms.length * 0.6))) return { found: true, match: `[${job.title}] ${bullet}` };
      }
    }
    // Also check job title
    const normTitle = normalize(job.title);
    if (normTitle.includes(norm)) return { found: true, match: `Job title: ${job.title} at ${job.company}` };
    if (acronyms.some(a => normTitle.includes(a))) return { found: true, match: `Job title: ${job.title} at ${job.company}` };
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
