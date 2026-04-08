/**
 * V2 Layer 1: Knockout Screening
 *
 * Checks parsed resume against knockout criteria from parsed JD.
 * Simulates ATS auto-reject / disqualification filters.
 */

import type { ParsedResume, ParsedJobDescription, KnockoutResult, KnockoutLayerResult } from './types';

/** Degree hierarchy for comparison */
const DEGREE_LEVELS: Record<string, number> = {
  'high school': 1, 'high school diploma': 1, 'ged': 1, 'hsd': 1,
  'associate': 2, 'associates': 2, "associate's": 2, 'aa': 2, 'as': 2,
  'bachelor': 3, 'bachelors': 3, "bachelor's": 3, 'ba': 3, 'bs': 3, 'bba': 3,
  'master': 4, 'masters': 4, "master's": 4, 'ma': 4, 'ms': 4, 'mba': 4, 'med': 4,
  'phd': 5, 'doctorate': 5, 'doctoral': 5, 'md': 5, 'jd': 5,
};

function getDegreeLevel(degreeStr: string): number {
  const lower = degreeStr.toLowerCase().trim();
  for (const [key, level] of Object.entries(DEGREE_LEVELS)) {
    if (lower.includes(key)) return level;
  }
  return 0;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Strip qualifiers that JDs add but resumes rarely include */
const QUALIFIER_WORDS = new Set([
  'active', 'current', 'valid', 'required', 'must', 'have', 'possess',
  'maintain', 'hold', 'preferred', 'ability', 'able', 'to',
]);

/** Common suffixes to stem for fuzzy matching */
function stem(word: string): string {
  return word
    .replace(/(ation|tion|sion|ment|ness|ence|ance|ity|ing|ied|ies|ous|ive|ful|able|ible|ist|ism|ly|ed|er|al|ar|or|s)$/, '')
    .replace(/(certif|licens|register).*/, '$1'); // certif* matches certified/certification/certificate
}

/** Extract acronyms from parentheses: "Applied Behavior Analysis (ABA)" → ["ABA"] */
function extractAcronyms(text: string): string[] {
  const matches = text.match(/\(([A-Z]{2,})\)/g) || [];
  return matches.map(m => m.replace(/[()]/g, '').toLowerCase());
}

function searchInArray(items: string[], searchTerm: string): string | undefined {
  const normalized = normalizeText(searchTerm);
  
  // Remove qualifier words to get core terms
  const coreTerms = normalized.split(' ')
    .filter(t => t.length > 1 && !QUALIFIER_WORDS.has(t));
  
  // Also extract acronyms from the search term itself
  const searchAcronyms = extractAcronyms(searchTerm);
  
  // Stem the core terms for fuzzy matching
  const stemmedTerms = coreTerms.map(stem).filter(t => t.length > 2);
  
  return items.find(item => {
    const normItem = normalizeText(item);
    const itemAcronyms = extractAcronyms(item);
    const itemWords = normItem.split(' ');
    const stemmedItem = itemWords.map(stem);
    
    // Direct substring match
    if (normItem.includes(normalized)) return true;
    
    // All core terms present (exact)
    if (coreTerms.length > 0 && coreTerms.every(t => normItem.includes(t))) return true;
    
    // Stemmed match: all stemmed core terms found in stemmed item
    if (stemmedTerms.length > 0 && stemmedTerms.every(st => stemmedItem.some(si => si.includes(st) || st.includes(si)))) return true;
    
    // Acronym cross-match: search acronym found in item, or item acronym found in search
    if (searchAcronyms.some(a => normItem.includes(a))) return true;
    if (itemAcronyms.some(a => normalized.includes(a) || coreTerms.includes(a))) return true;
    
    return false;
  });
}

export function runKnockoutScreening(
  resume: ParsedResume,
  jd: ParsedJobDescription
): KnockoutLayerResult {
  const results: KnockoutResult[] = [];

  for (const criterion of jd.knockoutCriteria) {
    const result = checkSingleKnockout(resume, criterion, jd);
    results.push(result);
  }

  const hardFailCount = results.filter(
    r => r.isHardRequirement && r.status === 'fail'
  ).length;

  return {
    results,
    hardFailCount,
    passed: hardFailCount === 0,
  };
}

function checkSingleKnockout(
  resume: ParsedResume,
  criterion: { requirement: string; category: string; isHardRequirement: boolean },
  jd: ParsedJobDescription
): KnockoutResult {
  const base = {
    requirement: criterion.requirement,
    category: criterion.category as KnockoutResult['category'],
    isHardRequirement: criterion.isHardRequirement,
  };

  switch (criterion.category) {
    case 'education': {
      const reqLevel = getDegreeLevel(criterion.requirement);
      if (reqLevel === 0) {
        // Can't determine required level, flag for confirmation
        return { ...base, status: 'needs-confirmation', checkedSection: 'education', evidence: 'Could not determine required degree level' };
      }
      const maxResumeLevel = Math.max(0, ...resume.education.map(e => getDegreeLevel(e.degree)));
      if (maxResumeLevel >= reqLevel) {
        const match = resume.education.find(e => getDegreeLevel(e.degree) >= reqLevel);
        return { ...base, status: 'pass', checkedSection: 'education', evidence: match ? `${match.degree} — ${match.school}` : undefined };
      }
      if (maxResumeLevel > 0) {
        return { ...base, status: 'fail', checkedSection: 'education', evidence: `Highest found: level ${maxResumeLevel}, required: level ${reqLevel}` };
      }
      return { ...base, status: 'fail', checkedSection: 'education', evidence: 'No education entries found in resume' };
    }

    case 'certification': {
      // Search certifications array
      const certMatch = searchInArray(resume.certifications, criterion.requirement);
      if (certMatch) {
        return { ...base, status: 'pass', checkedSection: 'certifications', evidence: certMatch };
      }
      // Also check skills (some people list certs as skills)
      const skillMatch = searchInArray(resume.skills, criterion.requirement);
      if (skillMatch) {
        return { ...base, status: 'pass', checkedSection: 'skills', evidence: skillMatch };
      }
      // Check work history bullets for cert mentions
      const allBullets = resume.workHistory.flatMap(w => w.bullets);
      const bulletMatch = searchInArray(allBullets, criterion.requirement);
      if (bulletMatch) {
        return { ...base, status: 'pass', checkedSection: 'workHistory', evidence: bulletMatch };
      }
      return { ...base, status: 'fail', checkedSection: 'certifications', evidence: `"${criterion.requirement}" not found in resume` };
    }

    case 'authorization': {
      // Work authorization can rarely be verified from resume text — flag for user
      return { ...base, status: 'needs-confirmation', checkedSection: 'contactInfo', evidence: criterion.requirement };
    }

    case 'physical': {
      // Physical requirements (lifting, standing, driving) — flag for user confirmation
      return { ...base, status: 'needs-confirmation', checkedSection: 'general', evidence: criterion.requirement };
    }

    case 'screening': {
      // Background checks, drug tests — search for explicit mentions
      const allText = [
        resume.summary || '',
        ...resume.certifications,
        ...resume.skills,
        ...resume.workHistory.flatMap(w => w.bullets),
      ].join(' ');
      const normReq = normalizeText(criterion.requirement);
      if (normalizeText(allText).includes(normReq)) {
        return { ...base, status: 'pass', checkedSection: 'general', evidence: `Found mention in resume` };
      }
      // Most screening items need user confirmation
      return { ...base, status: 'needs-confirmation', checkedSection: 'general', evidence: criterion.requirement };
    }

    default:
      return { ...base, status: 'needs-confirmation', checkedSection: 'general', evidence: criterion.requirement };
  }
}
