/**
 * Keyword Coverage Scorer
 *
 * Calculates how well a resume matches the keywords from a job description.
 */

import { KeywordSet } from '../types/session';
import { Finding } from './findings';
import { getSynonyms, SKILL_SYNONYMS } from './keywords';

/**
 * Coverage calculation result
 */
export interface CoverageResult {
  /** Coverage score (0-100) */
  score: number;
  /** Keywords found in the resume */
  foundKeywords: string[];
  /** Keywords missing from the resume */
  missingKeywords: string[];
  /** Keywords from optional list that were found */
  bonusKeywords: string[];
  /** Findings for missing keywords */
  findings: Finding[];
}

/**
 * Calculates keyword coverage between a resume and job description keywords.
 */
export function calculateCoverage(
  resumeText: string,
  keywords: KeywordSet
): CoverageResult {
  // Handle edge cases
  if (!resumeText || resumeText.trim().length === 0) {
    return {
      score: 0,
      foundKeywords: [],
      missingKeywords: keywords.critical,
      bonusKeywords: [],
      findings: [
        {
          id: 'empty-resume',
          category: 'extraction',
          severity: 'critical',
          title: 'No Resume Text',
          description: 'No text was extracted from your resume.',
          impact: 'Cannot calculate keyword coverage without resume content.',
        },
      ],
    };
  }

  if (keywords.critical.length === 0 && keywords.optional.length === 0) {
    return {
      score: 100,
      foundKeywords: [],
      missingKeywords: [],
      bonusKeywords: [],
      findings: [
        {
          id: 'no-keywords',
          category: 'keyword',
          severity: 'info',
          title: 'No Specific Keywords Identified',
          description:
            'No specific keywords were extracted from the job description.',
          impact:
            'This may indicate a generic job posting or one without technical requirements.',
        },
      ],
    };
  }

  // Normalize resume text for matching
  const normalizedResume = normalizeForMatching(resumeText);

  // Check critical keywords
  const criticalResults = checkKeywords(
    normalizedResume,
    keywords.critical,
    'critical'
  );

  // Check optional keywords (bonus)
  const optionalResults = checkKeywords(
    normalizedResume,
    keywords.optional,
    'optional'
  );

  // Calculate score based on critical keywords
  const totalCritical = keywords.critical.length;
  const foundCritical = criticalResults.found.length;
  const score =
    totalCritical > 0 ? Math.round((foundCritical / totalCritical) * 100) : 100;

  // Generate findings for missing critical keywords
  const findings: Finding[] = [];

  // Add findings for missing critical keywords
  criticalResults.missing.forEach((keyword, index) => {
    findings.push({
      id: `missing-keyword-${index}`,
      category: 'keyword',
      severity: 'medium',
      title: `Missing Keyword: "${keyword}"`,
      description: `The keyword "${keyword}" was not found in your resume.`,
      impact:
        'ATS systems may not surface your resume if this is a key requirement.',
      suggestion: `If you have this skill or experience, add the exact phrase "${keyword}" to your resume.`,
    });
  });

  // Add summary finding
  if (score === 100) {
    findings.unshift({
      id: 'all-keywords-found',
      category: 'keyword',
      severity: 'info',
      title: 'Excellent Keyword Match',
      description: 'All critical keywords from the job description were found in your resume.',
      impact: 'Your resume is well-aligned with this job posting.',
    });
  } else if (score >= 80) {
    findings.unshift({
      id: 'good-keyword-match',
      category: 'keyword',
      severity: 'info',
      title: 'Good Keyword Coverage',
      description: `Found ${foundCritical} of ${totalCritical} critical keywords (${score}%).`,
      impact: 'Your resume covers most key requirements.',
    });
  } else if (score >= 50) {
    findings.unshift({
      id: 'moderate-keyword-match',
      category: 'keyword',
      severity: 'medium',
      title: 'Moderate Keyword Coverage',
      description: `Found ${foundCritical} of ${totalCritical} critical keywords (${score}%).`,
      impact: 'Consider adding missing keywords if they match your experience.',
    });
  } else {
    findings.unshift({
      id: 'low-keyword-match',
      category: 'keyword',
      severity: 'high',
      title: 'Low Keyword Coverage',
      description: `Found only ${foundCritical} of ${totalCritical} critical keywords (${score}%).`,
      impact:
        'Your resume may not be surfaced by ATS for this role. Consider if this job is a good match.',
    });
  }

  // Add bonus info for optional keywords found
  if (optionalResults.found.length > 0) {
    findings.push({
      id: 'bonus-keywords-found',
      category: 'keyword',
      severity: 'info',
      title: 'Bonus Keywords Found',
      description: `Your resume also includes ${optionalResults.found.length} nice-to-have keywords: ${optionalResults.found.slice(0, 5).join(', ')}${optionalResults.found.length > 5 ? '...' : ''}.`,
      impact: 'These additional matches strengthen your application.',
    });
  }

  return {
    score,
    foundKeywords: criticalResults.found,
    missingKeywords: criticalResults.missing,
    bonusKeywords: optionalResults.found,
    findings,
  };
}

/**
 * Normalizes text for keyword matching.
 */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\/\+\#\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks which keywords are found in the text.
 */
function checkKeywords(
  normalizedText: string,
  keywords: string[],
  _type: 'critical' | 'optional'
): { found: string[]; missing: string[] } {
  const found: string[] = [];
  const missing: string[] = [];

  keywords.forEach((keyword) => {
    if (keywordMatch(normalizedText, keyword)) {
      found.push(keyword);
    } else {
      missing.push(keyword);
    }
  });

  return { found, missing };
}

/**
 * Checks if a keyword (or its synonyms) exists in the text.
 */
function keywordMatch(text: string, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase().trim();

  // Direct match
  if (text.includes(normalizedKeyword)) {
    return true;
  }

  // Check synonyms
  const synonyms = getSynonyms(normalizedKeyword);
  for (const synonym of synonyms) {
    if (text.includes(synonym.toLowerCase())) {
      return true;
    }
  }

  // Check for common variations
  const variations = getVariations(normalizedKeyword);
  for (const variation of variations) {
    if (text.includes(variation)) {
      return true;
    }
  }

  // Word boundary check for shorter terms (avoid false positives)
  if (normalizedKeyword.length <= 4) {
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, 'i');
    if (wordBoundaryRegex.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Gets common variations of a keyword.
 */
function getVariations(keyword: string): string[] {
  const variations: string[] = [];

  // Handle plurals
  if (keyword.endsWith('s')) {
    variations.push(keyword.slice(0, -1)); // Remove 's'
  } else {
    variations.push(keyword + 's'); // Add 's'
  }

  // Handle -ing/-ed forms
  if (keyword.endsWith('ing')) {
    variations.push(keyword.slice(0, -3)); // manage from managing
    variations.push(keyword.slice(0, -3) + 'e'); // manage from managing
    variations.push(keyword.slice(0, -3) + 'ed'); // managed from managing
  }

  if (keyword.endsWith('ed')) {
    variations.push(keyword.slice(0, -2)); // manage from managed
    variations.push(keyword.slice(0, -1)); // manage from managed (doubled consonant)
    variations.push(keyword.slice(0, -2) + 'ing'); // managing from managed
  }

  // Handle hyphenation
  if (keyword.includes('-')) {
    variations.push(keyword.replace(/-/g, ' ')); // "full-stack" -> "full stack"
    variations.push(keyword.replace(/-/g, '')); // "full-stack" -> "fullstack"
  }

  if (keyword.includes(' ')) {
    variations.push(keyword.replace(/ /g, '-')); // "full stack" -> "full-stack"
    variations.push(keyword.replace(/ /g, '')); // "full stack" -> "fullstack"
  }

  return variations;
}

/**
 * Escapes special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Gets the coverage grade based on score.
 */
export function getCoverageGrade(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Low';
}

/**
 * Gets a color class for coverage score.
 */
export function getCoverageColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}
