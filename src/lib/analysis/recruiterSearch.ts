/**
 * Recruiter Search Score Calculator
 *
 * Simulates how likely a resume is to appear in recruiter Boolean searches.
 * This reflects the workflow in "processor" ATS systems like Greenhouse and Lever
 * where recruiters manually filter candidates using keyword searches.
 *
 * Scoring Components:
 * - Exact Keyword Matches (40%): Critical JD keywords found verbatim
 * - Job Title Alignment (25%): Resume titles match target role
 * - Skills Coverage (25%): Technical/soft skills mentioned
 * - Industry Terms (10%): Domain-specific terminology
 */

import { KeywordSet } from '../types/session';

// =============================================================================
// TYPES
// =============================================================================

export interface RecruiterSearchResult {
  /** Overall recruiter search score (0-100) */
  score: number;
  /** Breakdown of score components */
  breakdown: {
    keywordMatch: ComponentScore;
    titleAlignment: ComponentScore;
    skillsCoverage: ComponentScore;
    industryTerms: ComponentScore;
  };
  /** Keywords found in resume */
  matchedKeywords: string[];
  /** Keywords missing from resume */
  missingKeywords: string[];
  /** Job titles found in resume */
  matchedTitles: string[];
  /** Actionable suggestions */
  suggestions: string[];
}

interface ComponentScore {
  score: number;
  weight: number;
  details: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Common job title variations and their canonical forms */
const TITLE_SYNONYMS: Record<string, string[]> = {
  'software engineer': ['software developer', 'swe', 'programmer', 'coder', 'developer'],
  'frontend engineer': ['frontend developer', 'front-end developer', 'ui developer', 'ui engineer'],
  'backend engineer': ['backend developer', 'back-end developer', 'server developer'],
  'full stack engineer': ['full stack developer', 'fullstack developer', 'full-stack engineer'],
  'data scientist': ['data analyst', 'ml engineer', 'machine learning engineer', 'data engineer'],
  'product manager': ['pm', 'product owner', 'product lead'],
  'project manager': ['program manager', 'delivery manager', 'scrum master'],
  'devops engineer': ['sre', 'site reliability engineer', 'platform engineer', 'infrastructure engineer'],
  'qa engineer': ['test engineer', 'quality assurance', 'sdet', 'automation engineer'],
  'ux designer': ['ui designer', 'product designer', 'ux/ui designer', 'interaction designer'],
  'data analyst': ['business analyst', 'analytics specialist', 'bi analyst'],
  'marketing manager': ['marketing lead', 'growth manager', 'digital marketing manager'],
  'sales representative': ['sales rep', 'account executive', 'ae', 'business development'],
  'customer success': ['customer support', 'account manager', 'client success'],
  'intern': ['internship', 'co-op', 'trainee', 'associate'],
};

/** Industry-specific terminology by domain */
const INDUSTRY_TERMS: Record<string, string[]> = {
  tech: ['saas', 'b2b', 'b2c', 'api', 'sdk', 'microservices', 'cloud', 'agile', 'scrum', 'devops', 'ci/cd'],
  finance: ['fintech', 'banking', 'trading', 'risk', 'compliance', 'regulatory', 'portfolio', 'investment'],
  healthcare: ['hipaa', 'ehr', 'clinical', 'patient', 'medical', 'pharmaceutical', 'fda', 'healthcare'],
  ecommerce: ['marketplace', 'retail', 'inventory', 'fulfillment', 'checkout', 'cart', 'payments'],
  marketing: ['seo', 'sem', 'ppc', 'analytics', 'conversion', 'campaign', 'brand', 'content'],
};

/** Seniority level keywords */
const SENIORITY_LEVELS = [
  'intern', 'junior', 'associate', 'mid-level', 'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'vp', 'head of', 'chief'
];

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Calculates the Recruiter Search Score.
 *
 * This score represents how likely a resume is to appear in recruiter
 * Boolean searches based on keyword presence and relevance.
 */
export function calculateRecruiterSearch(
  resumeText: string,
  jobDescription: string,
  extractedKeywords: KeywordSet
): RecruiterSearchResult {
  const normalizedResume = normalizeText(resumeText);
  const normalizedJD = normalizeText(jobDescription);

  // Calculate each component
  const keywordMatch = calculateKeywordMatch(normalizedResume, extractedKeywords);
  const titleAlignment = calculateTitleAlignment(normalizedResume, normalizedJD);
  const skillsCoverage = calculateSkillsCoverage(normalizedResume, extractedKeywords);
  const industryTerms = calculateIndustryTerms(normalizedResume, normalizedJD);

  // Calculate weighted score
  const weightedScore =
    keywordMatch.score * keywordMatch.weight +
    titleAlignment.score * titleAlignment.weight +
    skillsCoverage.score * skillsCoverage.weight +
    industryTerms.score * industryTerms.weight;

  const score = Math.round(Math.max(0, Math.min(100, weightedScore)));

  // Collect matched and missing keywords
  const allKeywords = [...extractedKeywords.critical, ...extractedKeywords.optional];
  const matchedKeywords = allKeywords.filter(kw =>
    normalizedResume.includes(kw.toLowerCase())
  );
  const missingKeywords = extractedKeywords.critical.filter(kw =>
    !normalizedResume.includes(kw.toLowerCase())
  );

  // Extract matched titles
  const matchedTitles = extractMatchedTitles(normalizedResume, normalizedJD);

  // Generate suggestions
  const suggestions = generateSuggestions(
    keywordMatch,
    titleAlignment,
    skillsCoverage,
    missingKeywords
  );

  return {
    score,
    breakdown: {
      keywordMatch,
      titleAlignment,
      skillsCoverage,
      industryTerms,
    },
    matchedKeywords,
    missingKeywords,
    matchedTitles,
    suggestions,
  };
}

// =============================================================================
// COMPONENT CALCULATORS
// =============================================================================

/**
 * Calculates exact keyword match score (40% weight).
 * Recruiters search for exact terms from the job description.
 */
function calculateKeywordMatch(
  resumeText: string,
  keywords: KeywordSet
): ComponentScore {
  const critical = keywords.critical;
  const optional = keywords.optional;

  if (critical.length === 0) {
    return {
      score: 100,
      weight: 0.40,
      details: 'No critical keywords to match',
    };
  }

  // Count matches
  let criticalMatches = 0;
  let optionalMatches = 0;

  for (const keyword of critical) {
    if (keywordExistsInText(resumeText, keyword)) {
      criticalMatches++;
    }
  }

  for (const keyword of optional) {
    if (keywordExistsInText(resumeText, keyword)) {
      optionalMatches++;
    }
  }

  // Critical keywords are worth more
  const criticalScore = critical.length > 0 ? (criticalMatches / critical.length) * 100 : 100;
  const optionalBonus = optional.length > 0 ? (optionalMatches / optional.length) * 10 : 0;

  const score = Math.min(100, criticalScore + optionalBonus);

  return {
    score,
    weight: 0.40,
    details: `${criticalMatches}/${critical.length} critical, ${optionalMatches}/${optional.length} optional`,
  };
}

/**
 * Calculates job title alignment score (25% weight).
 * Recruiters often search by job title.
 */
function calculateTitleAlignment(
  resumeText: string,
  jobDescription: string
): ComponentScore {
  // Extract target title from JD (usually in first few lines)
  const targetTitle = extractJobTitle(jobDescription);

  if (!targetTitle) {
    return {
      score: 50, // Neutral score if we can't extract title
      weight: 0.25,
      details: 'Could not extract target job title',
    };
  }

  // Check if resume contains the target title or synonyms
  const titleVariations = getTitleVariations(targetTitle);
  let bestMatch = 0;
  let matchedTitle = '';

  for (const title of titleVariations) {
    if (resumeText.includes(title.toLowerCase())) {
      // Exact match gets 100, synonym match gets 80
      const matchScore = title.toLowerCase() === targetTitle.toLowerCase() ? 100 : 80;
      if (matchScore > bestMatch) {
        bestMatch = matchScore;
        matchedTitle = title;
      }
    }
  }

  // Also check for seniority alignment
  const jdSeniority = extractSeniority(jobDescription);
  const resumeSeniority = extractSeniority(resumeText);

  let seniorityBonus = 0;
  if (jdSeniority && resumeSeniority) {
    if (jdSeniority === resumeSeniority) {
      seniorityBonus = 10;
    } else if (Math.abs(SENIORITY_LEVELS.indexOf(jdSeniority) - SENIORITY_LEVELS.indexOf(resumeSeniority)) <= 1) {
      seniorityBonus = 5;
    }
  }

  const score = Math.min(100, bestMatch + seniorityBonus);

  return {
    score,
    weight: 0.25,
    details: matchedTitle ? `Matched: "${matchedTitle}"` : `Target: "${targetTitle}" not found`,
  };
}

/**
 * Calculates skills coverage score (25% weight).
 * How many required skills appear in the resume.
 */
function calculateSkillsCoverage(
  resumeText: string,
  keywords: KeywordSet
): ComponentScore {
  // Filter to just skills (typically shorter, technical terms)
  const skillKeywords = [...keywords.critical, ...keywords.optional]
    .filter(kw => kw.length <= 20 && !kw.includes(' ') || isKnownSkill(kw));

  if (skillKeywords.length === 0) {
    return {
      score: 50,
      weight: 0.25,
      details: 'No specific skills identified',
    };
  }

  let matches = 0;
  for (const skill of skillKeywords) {
    if (keywordExistsInText(resumeText, skill)) {
      matches++;
    }
  }

  const score = (matches / skillKeywords.length) * 100;

  return {
    score,
    weight: 0.25,
    details: `${matches}/${skillKeywords.length} skills found`,
  };
}

/**
 * Calculates industry terminology score (10% weight).
 * Domain-specific terms that indicate relevant experience.
 */
function calculateIndustryTerms(
  resumeText: string,
  jobDescription: string
): ComponentScore {
  // Detect which industry the JD is targeting
  const detectedIndustry = detectIndustry(jobDescription);

  if (!detectedIndustry) {
    return {
      score: 50,
      weight: 0.10,
      details: 'Industry not detected',
    };
  }

  const industryKeywords = INDUSTRY_TERMS[detectedIndustry] || [];

  if (industryKeywords.length === 0) {
    return {
      score: 50,
      weight: 0.10,
      details: 'No industry terms defined',
    };
  }

  let matches = 0;
  for (const term of industryKeywords) {
    if (resumeText.includes(term.toLowerCase())) {
      matches++;
    }
  }

  // Only need a few industry terms to score well
  const score = Math.min(100, (matches / Math.min(3, industryKeywords.length)) * 100);

  return {
    score,
    weight: 0.10,
    details: `${matches} ${detectedIndustry} terms found`,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordExistsInText(text: string, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase().trim();

  // Direct match
  if (text.includes(normalizedKeyword)) {
    return true;
  }

  // Word boundary match for short terms
  if (normalizedKeyword.length <= 4) {
    const regex = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, 'i');
    return regex.test(text);
  }

  // Check common variations
  const variations = getKeywordVariations(normalizedKeyword);
  for (const variation of variations) {
    if (text.includes(variation)) {
      return true;
    }
  }

  return false;
}

function getKeywordVariations(keyword: string): string[] {
  const variations: string[] = [];

  // Plural/singular
  if (keyword.endsWith('s')) {
    variations.push(keyword.slice(0, -1));
  } else {
    variations.push(keyword + 's');
  }

  // Hyphenation
  if (keyword.includes('-')) {
    variations.push(keyword.replace(/-/g, ' '));
    variations.push(keyword.replace(/-/g, ''));
  }
  if (keyword.includes(' ')) {
    variations.push(keyword.replace(/ /g, '-'));
  }

  // Common tech variations
  if (keyword.includes('.js')) {
    variations.push(keyword.replace('.js', 'js'));
    variations.push(keyword.replace('.js', ''));
  }

  return variations;
}

function extractJobTitle(jobDescription: string): string | null {
  // Job title is usually in the first line or two
  const firstLines = jobDescription.split('\n').slice(0, 3).join(' ').toLowerCase();

  // Look for common title patterns
  for (const [canonical, synonyms] of Object.entries(TITLE_SYNONYMS)) {
    if (firstLines.includes(canonical)) {
      return canonical;
    }
    for (const synonym of synonyms) {
      if (firstLines.includes(synonym)) {
        return canonical;
      }
    }
  }

  // Try to extract based on common patterns
  const titleMatch = firstLines.match(/^([a-z\s\/\-]+(?:engineer|developer|manager|designer|analyst|specialist|lead|director))/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  return null;
}

function getTitleVariations(title: string): string[] {
  const variations = [title];
  const lowerTitle = title.toLowerCase();

  // Add synonyms
  if (TITLE_SYNONYMS[lowerTitle]) {
    variations.push(...TITLE_SYNONYMS[lowerTitle]);
  }

  // Check if title is a synonym of another
  for (const [canonical, synonyms] of Object.entries(TITLE_SYNONYMS)) {
    if (synonyms.includes(lowerTitle)) {
      variations.push(canonical);
      variations.push(...synonyms);
    }
  }

  return [...new Set(variations)];
}

function extractSeniority(text: string): string | null {
  const lowerText = text.toLowerCase();

  for (const level of SENIORITY_LEVELS) {
    if (lowerText.includes(level)) {
      return level;
    }
  }

  return null;
}

function extractMatchedTitles(resumeText: string, jobDescription: string): string[] {
  const matched: string[] = [];
  const targetTitle = extractJobTitle(jobDescription);

  if (targetTitle) {
    const variations = getTitleVariations(targetTitle);
    for (const title of variations) {
      if (resumeText.includes(title.toLowerCase())) {
        matched.push(title);
      }
    }
  }

  return [...new Set(matched)];
}

function detectIndustry(text: string): string | null {
  const lowerText = text.toLowerCase();

  const industryCounts: Record<string, number> = {};

  for (const [industry, terms] of Object.entries(INDUSTRY_TERMS)) {
    industryCounts[industry] = 0;
    for (const term of terms) {
      if (lowerText.includes(term)) {
        industryCounts[industry]++;
      }
    }
  }

  // Find industry with most matches
  let bestIndustry: string | null = null;
  let bestCount = 0;

  for (const [industry, count] of Object.entries(industryCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestIndustry = industry;
    }
  }

  return bestCount >= 2 ? bestIndustry : null;
}

function isKnownSkill(keyword: string): boolean {
  const knownSkills = [
    'javascript', 'typescript', 'python', 'java', 'react', 'node', 'sql',
    'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'html', 'css',
    'angular', 'vue', 'mongodb', 'postgresql', 'redis', 'graphql', 'rest',
    'tensorflow', 'pytorch', 'machine learning', 'data analysis', 'excel',
    'figma', 'sketch', 'photoshop', 'jira', 'confluence', 'slack',
  ];
  return knownSkills.includes(keyword.toLowerCase());
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateSuggestions(
  keywordMatch: ComponentScore,
  titleAlignment: ComponentScore,
  skillsCoverage: ComponentScore,
  missingKeywords: string[]
): string[] {
  const suggestions: string[] = [];

  // Keyword suggestions
  if (keywordMatch.score < 60 && missingKeywords.length > 0) {
    const topMissing = missingKeywords.slice(0, 3);
    suggestions.push(
      `Add these keywords if applicable: ${topMissing.join(', ')}`
    );
  }

  // Title suggestions
  if (titleAlignment.score < 50) {
    suggestions.push(
      'Include the target job title or similar titles in your experience section'
    );
  }

  // Skills suggestions
  if (skillsCoverage.score < 60) {
    suggestions.push(
      'Ensure your skills section lists specific technologies mentioned in the job posting'
    );
  }

  // General suggestion if score is good
  if (suggestions.length === 0) {
    suggestions.push(
      'Your resume has good keyword coverage for recruiter searches'
    );
  }

  return suggestions;
}
