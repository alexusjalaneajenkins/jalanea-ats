/**
 * V2 Layer 2: Section-Aware Keyword Matching
 *
 * Checks each required skill against the correct resume section.
 * Simulates how parsed resume data populates searchable ATS fields.
 */

import type { ParsedResume, ParsedJobDescription, SectionMatchItem, SectionMatchLayerResult } from './types';

const TERM_ALIAS_GROUPS = [
  ['react', 'reactjs', 'react.js'],
  ['javascript', 'js'],
  ['typescript', 'ts'],
  ['nodejs', 'node.js'],
  ['vue', 'vuejs', 'vue.js'],
  ['postgresql', 'postgres'],
  ['sql', 'structured query language'],
  ['r', 'r language', 'r programming'],
  ['cplusplus', 'c++'],
  ['csharp', 'c#'],
  ['dotnet', '.net'],
] as const;

export function normalizeSkillTerm(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/(^|[^a-z0-9])\.net\b/g, '$1 dotnet ')
    .replace(/\bc\s*\+\s*\+/g, ' cplusplus ')
    .replace(/\bc\s*#/g, ' csharp ')
    .replace(/\breact\s*\.?\s*js\b/g, ' reactjs ')
    .replace(/\bnode\s*\.?\s*js\b/g, ' nodejs ')
    .replace(/\bvue\s*\.?\s*js\b/g, ' vuejs ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function aliasCandidates(normalizedTerm: string): string[] {
  for (const group of TERM_ALIAS_GROUPS) {
    const normalizedGroup = group.map(normalizeSkillTerm);
    if (normalizedGroup.includes(normalizedTerm)) {
      return [...new Set(normalizedGroup)];
    }
  }
  return [normalizedTerm];
}

export function matchesSkillTerm(text: string, searchTerm: string): boolean {
  const normalizedText = normalizeSkillTerm(text);
  const normalizedTerm = normalizeSkillTerm(searchTerm);
  if (!normalizedText || !normalizedTerm) return false;

  const paddedText = ` ${normalizedText} `;
  return aliasCandidates(normalizedTerm).some((candidate) =>
    paddedText.includes(` ${candidate} `)
  );
}

function findInStrings(items: string[], searchTerm: string): { found: boolean; match?: string } {
  for (const item of items) {
    if (matchesSkillTerm(item, searchTerm)) {
      return { found: true, match: item };
    }
  }
  return { found: false };
}

function findInBullets(workHistory: ParsedResume['workHistory'], searchTerm: string): { found: boolean; match?: string } {
  for (const job of workHistory) {
    for (const bullet of job.bullets) {
      if (matchesSkillTerm(bullet, searchTerm)) {
        return { found: true, match: `[${job.title}] ${bullet}` };
      }
    }
    // Also check job title
    if (matchesSkillTerm(job.title, searchTerm)) {
      return {
        found: true,
        match: `Job title: ${job.title} at ${job.company}`,
      };
    }
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
  if (resume.summary && matchesSkillTerm(resume.summary, term)) {
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

  const score =
    maxWeight > 0
      ? Math.round(
          Math.min((totalWeight / maxWeight) * 100 + prefBonus, 100)
        )
      : null;

  return {
    matches,
    preferredMatches,
    score,
    evidenceStatus: score === null ? 'not-evaluated' : 'evaluated',
    foundCount: matches.filter(m => m.found).length,
    totalRequired,
  };
}
