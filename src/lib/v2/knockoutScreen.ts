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

function searchInArray(items: string[], searchTerm: string): string | undefined {
  const normalized = normalizeText(searchTerm);
  const terms = normalized.split(' ').filter(t => t.length > 2);
  return items.find(item => {
    const normItem = normalizeText(item);
    return terms.every(term => normItem.includes(term)) || normItem.includes(normalized);
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
