/**
 * V2 Layer 1: Knockout Screening
 *
 * Checks parsed resume against knockout criteria from parsed JD.
 * Simulates ATS auto-reject / disqualification filters.
 */

import type {
  ParsedResume,
  ParsedJobDescription,
  KnockoutCriterion,
  KnockoutResult,
  KnockoutLayerResult,
  KnockoutStatus,
} from './types';

/** Degree hierarchy for comparison */
const DEGREE_LEVELS: Record<string, number> = {
  'high school': 1, 'high school diploma': 1, 'ged': 1, 'hsd': 1,
  'associate': 2, 'associates': 2, "associate's": 2, 'aa': 2, 'as': 2,
  'bachelor': 3, 'bachelors': 3, "bachelor's": 3, 'ba': 3, 'bs': 3, 'bba': 3,
  'master': 4, 'masters': 4, "master's": 4, 'ma': 4, 'ms': 4, 'mba': 4, 'med': 4,
  'phd': 5, 'doctorate': 5, 'doctoral': 5, 'md': 5, 'jd': 5,
};

const DOTTED_DEGREE_NOTATION: Array<[RegExp, string]> = [
  [/\bph\s*\.?\s*d\b\.?/gi, ' phd '],
  [/\bm\s*\.?\s*b\s*\.?\s*a\b\.?/gi, ' mba '],
  [/\bm\s*\.?\s*s\b\.?/gi, ' ms '],
  [/\bm\s*\.?\s*a\b\.?/gi, ' ma '],
  [/\bb\s*\.?\s*b\s*\.?\s*a\b\.?/gi, ' bba '],
  [/\bb\s*\.?\s*s\b\.?/gi, ' bs '],
  [/\bb\s*\.?\s*a\b\.?/gi, ' ba '],
];

export interface DegreeClassification {
  level: number;
  recognized: boolean;
}

export function classifyDegreeLevel(degreeStr: string): DegreeClassification {
  const canonicalDegree = DOTTED_DEGREE_NOTATION.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    degreeStr
  );
  const normalizedDegree = normalizeText(canonicalDegree);
  const paddedDegree = ` ${normalizedDegree} `;
  const degreeEntries = Object.entries(DEGREE_LEVELS).sort(
    ([left], [right]) => right.length - left.length
  );
  for (const [key, level] of degreeEntries) {
    const normalizedKey = normalizeText(key);
    if (paddedDegree.includes(` ${normalizedKey} `)) {
      return { level, recognized: true };
    }
  }
  return { level: 0, recognized: false };
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function searchInArray(items: string[], searchTerm: string): string | undefined {
  const normalized = normalizeText(searchTerm);
  if (!normalized) return undefined;
  const paddedNeedle = ` ${normalized} `;
  return items.find(item => {
    const normItem = normalizeText(item);
    return (
      normItem === normalized ||
      ` ${normItem} `.includes(paddedNeedle)
    );
  });
}

function hasEquivalentCriterion(
  criteria: KnockoutCriterion[],
  category: KnockoutCriterion['category'],
  requirement: string
): boolean {
  const normalizedRequirement = normalizeText(requirement);
  return criteria.some((criterion) => {
    if (criterion.category !== category) return false;
    const normalizedCriterion = normalizeText(criterion.requirement);
    return (
      normalizedCriterion === normalizedRequirement ||
      normalizedCriterion.includes(normalizedRequirement) ||
      normalizedRequirement.includes(normalizedCriterion)
    );
  });
}

function getEffectiveCriteria(jd: ParsedJobDescription): KnockoutCriterion[] {
  const criteria = [...jd.knockoutCriteria];

  if (jd.requiredEducation) {
    const educationRequirement = [
      jd.requiredEducation.minimumDegree,
      jd.requiredEducation.field
        ? `in ${jd.requiredEducation.field}`
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    if (
      !hasEquivalentCriterion(
        criteria,
        'education',
        educationRequirement
      )
    ) {
      criteria.push({
        requirement: educationRequirement,
        category: 'education',
        isHardRequirement: true,
      });
    }
  }

  for (const certification of jd.requiredCertifications) {
    if (!hasEquivalentCriterion(criteria, 'certification', certification)) {
      criteria.push({
        requirement: certification,
        category: 'certification',
        isHardRequirement: true,
      });
    }
  }

  return criteria;
}

export function runKnockoutScreening(
  resume: ParsedResume,
  jd: ParsedJobDescription
): KnockoutLayerResult {
  const results: KnockoutResult[] = [];

  for (const criterion of getEffectiveCriteria(jd)) {
    const result = checkSingleKnockout(resume, criterion, jd);
    results.push(result);
  }

  const hardFailCount = results.filter(
    r => r.isHardRequirement && r.status === 'fail'
  ).length;
  const needsConfirmationCount = results.filter(
    r => r.isHardRequirement && r.status === 'needs-confirmation'
  ).length;
  const overallStatus: KnockoutStatus =
    hardFailCount > 0
      ? 'fail'
      : needsConfirmationCount > 0
        ? 'needs-confirmation'
        : 'pass';

  return {
    results,
    hardFailCount,
    needsConfirmationCount,
    overallStatus,
    passed: overallStatus === 'pass',
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
      const requiredDegree = classifyDegreeLevel(criterion.requirement);
      if (!requiredDegree.recognized) {
        // Can't determine required level, flag for confirmation
        return { ...base, status: 'needs-confirmation', checkedSection: 'education', evidence: 'Could not determine required degree level' };
      }
      const classifiedEducation = resume.education.map((entry) => ({
        entry,
        classification: classifyDegreeLevel(entry.degree),
      }));
      const recognizedEducation = classifiedEducation.filter(
        ({ classification }) => classification.recognized
      );
      const maxResumeLevel = Math.max(
        0,
        ...recognizedEducation.map(
          ({ classification }) => classification.level
        )
      );
      const reqLevel = requiredDegree.level;
      if (maxResumeLevel >= reqLevel) {
        const requiredField =
          jd.requiredEducation &&
          normalizeText(criterion.requirement).includes(
            normalizeText(jd.requiredEducation.minimumDegree)
          )
            ? jd.requiredEducation.field
            : undefined;
        const matchingDegreeEntries = recognizedEducation
          .filter(
            ({ classification }) => classification.level >= reqLevel
          )
          .map(({ entry }) => entry);
        if (requiredField) {
          const fieldMatch = searchInArray(
            matchingDegreeEntries.map(
              (entry) => `${entry.degree} ${entry.field || ''}`
            ),
            requiredField
          );
          if (!fieldMatch) {
            return {
              ...base,
              status: 'needs-confirmation',
              checkedSection: 'education',
              evidence: `Degree level found; field "${requiredField}" was not clearly identified`,
            };
          }
        }
        const match = matchingDegreeEntries[0];
        return { ...base, status: 'pass', checkedSection: 'education', evidence: match ? `${match.degree} — ${match.school}` : undefined };
      }
      if (maxResumeLevel > 0) {
        return { ...base, status: 'fail', checkedSection: 'education', evidence: `Highest found: level ${maxResumeLevel}, required: level ${reqLevel}` };
      }
      if (resume.education.length === 0) {
        return { ...base, status: 'fail', checkedSection: 'education', evidence: 'No education entries found in resume' };
      }
      return {
        ...base,
        status: 'needs-confirmation',
        checkedSection: 'education',
        evidence: 'Education was found, but the degree notation could not be classified',
      };
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
      if (normReq && normalizeText(allText).includes(normReq)) {
        return { ...base, status: 'pass', checkedSection: 'general', evidence: `Found mention in resume` };
      }
      // Most screening items need user confirmation
      return { ...base, status: 'needs-confirmation', checkedSection: 'general', evidence: criterion.requirement };
    }

    default:
      return { ...base, status: 'needs-confirmation', checkedSection: 'general', evidence: criterion.requirement };
  }
}
