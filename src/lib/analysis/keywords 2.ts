/**
 * Job Description Keyword Extraction Engine
 *
 * Extracts and categorizes keywords from job descriptions using NLP-lite techniques.
 * Keywords are ranked by frequency and context (requirements sections, caps, etc.)
 */

import { KeywordSet } from '../types/session';

/**
 * Standard English stopwords to filter out
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'our', 'your', 'their', 'its', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'who', 'which', 'what',
  'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'about', 'above', 'after', 'again',
  'against', 'before', 'below', 'between', 'during', 'into', 'through', 'under',
  'until', 'while', 'any', 'here', 'there', 'then', 'once', 'being', 'having',
  'able', 'across', 'within', 'without', 'including', 'including', 'well',
  // Job posting specific stopwords
  'work', 'working', 'job', 'position', 'role', 'company', 'team', 'opportunity',
  'candidate', 'candidates', 'apply', 'application', 'looking', 'seeking', 'join',
  'help', 'support', 'responsible', 'responsibilities', 'duties', 'tasks',
  'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years', 'time',
  'new', 'using', 'used', 'use', 'include', 'includes', 'involved', 'based',
  'strong', 'excellent', 'good', 'great', 'proven', 'demonstrated', 'preferred',
  'required', 'requirements', 'qualifications', 'skills', 'ability', 'abilities',
]);

/**
 * Terms to preserve even though they look like stopwords
 */
const PRESERVED_TERMS = new Set([
  'sql', 'aws', 'gcp', 'api', 'apis', 'css', 'html', 'xml', 'json', 'rest', 'graphql',
  'saas', 'paas', 'iaas', 'ci', 'cd', 'qa', 'ui', 'ux', 'ml', 'ai', 'nlp', 'cv',
  'etl', 'bi', 'kpi', 'crm', 'erp', 'hr', 'pm', 'ba', 'qa', 'devops', 'sre',
  'c#', 'c++', '.net', 'node.js', 'react.js', 'vue.js', 'next.js', 'angular.js',
  'typescript', 'javascript', 'python', 'java', 'golang', 'ruby', 'rust', 'scala',
  'kotlin', 'swift', 'php', 'perl', 'bash', 'shell', 'powershell',
]);

/**
 * Requirement indicator phrases - terms following these get boosted
 */
const REQUIREMENT_INDICATORS = [
  'required', 'must have', 'must be', 'minimum', 'mandatory', 'essential',
  'qualifications', 'requirements', 'you will need', 'you should have',
  'we require', 'we need', 'experience with', 'experience in', 'proficiency in',
  'knowledge of', 'expertise in', 'familiarity with', 'background in',
];

/**
 * Common tech skill synonyms for matching
 */
export const SKILL_SYNONYMS: Record<string, string[]> = {
  'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
  'typescript': ['ts'],
  'python': ['py'],
  'machine learning': ['ml', 'deep learning', 'neural networks'],
  'artificial intelligence': ['ai'],
  'natural language processing': ['nlp'],
  'computer vision': ['cv'],
  'continuous integration': ['ci'],
  'continuous deployment': ['cd'],
  'ci/cd': ['ci', 'cd', 'continuous integration', 'continuous deployment'],
  'amazon web services': ['aws'],
  'google cloud platform': ['gcp', 'google cloud'],
  'microsoft azure': ['azure'],
  'kubernetes': ['k8s'],
  'docker': ['containers', 'containerization'],
  'react': ['reactjs', 'react.js'],
  'angular': ['angularjs', 'angular.js'],
  'vue': ['vuejs', 'vue.js'],
  'node': ['nodejs', 'node.js'],
  'postgresql': ['postgres'],
  'mongodb': ['mongo'],
  'elasticsearch': ['elastic'],
  'user experience': ['ux'],
  'user interface': ['ui'],
  'project management': ['pm'],
  'business analyst': ['ba'],
  'quality assurance': ['qa'],
  'site reliability engineering': ['sre'],
  'extract transform load': ['etl'],
  'business intelligence': ['bi'],
  'customer relationship management': ['crm'],
  'enterprise resource planning': ['erp'],
};

/**
 * Extracts and categorizes keywords from a job description.
 */
export function extractKeywords(jobText: string): KeywordSet {
  if (!jobText || jobText.trim().length === 0) {
    return { critical: [], optional: [], all: [] };
  }

  // Step 1: Normalize text
  const normalizedText = normalizeText(jobText);

  // Step 2: Find requirement sections for boosting
  const requirementZones = findRequirementZones(jobText);

  // Step 3: Extract n-grams
  const unigrams = extractUnigrams(normalizedText);
  const bigrams = extractBigrams(normalizedText);
  const trigrams = extractTrigrams(normalizedText);

  // Step 4: Score and rank terms
  const scoredTerms = scoreTerns(
    [...unigrams, ...bigrams, ...trigrams],
    jobText,
    requirementZones
  );

  // Step 5: Deduplicate and categorize
  const rankedTerms = deduplicateAndRank(scoredTerms);

  // Step 6: Split into critical and optional
  const critical = rankedTerms.slice(0, 15);
  const optional = rankedTerms.slice(15, 30);
  const all = rankedTerms;

  return { critical, optional, all };
}

/**
 * Normalizes text while preserving important terms.
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();

  // Preserve special terms
  normalized = normalized
    .replace(/c\+\+/g, 'cplusplus')
    .replace(/c#/g, 'csharp')
    .replace(/\.net/g, 'dotnet')
    .replace(/node\.js/g, 'nodejs')
    .replace(/react\.js/g, 'reactjs')
    .replace(/vue\.js/g, 'vuejs')
    .replace(/angular\.js/g, 'angularjs')
    .replace(/next\.js/g, 'nextjs');

  // Remove URLs
  normalized = normalized.replace(/https?:\/\/[^\s]+/g, ' ');

  // Remove email addresses
  normalized = normalized.replace(/[\w.-]+@[\w.-]+\.\w+/g, ' ');

  // Keep alphanumeric, spaces, and some punctuation
  normalized = normalized.replace(/[^a-z0-9\s\-\/]/g, ' ');

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Finds text zones that contain requirement indicators.
 */
function findRequirementZones(text: string): Set<number> {
  const zones = new Set<number>();
  const lowerText = text.toLowerCase();

  REQUIREMENT_INDICATORS.forEach((indicator) => {
    let pos = lowerText.indexOf(indicator);
    while (pos !== -1) {
      // Mark 200 characters after the indicator as a "requirement zone"
      for (let i = pos; i < Math.min(pos + 200, text.length); i++) {
        zones.add(i);
      }
      pos = lowerText.indexOf(indicator, pos + 1);
    }
  });

  return zones;
}

/**
 * Extracts unigrams (single words).
 */
function extractUnigrams(text: string): string[] {
  const words = text.split(/\s+/);
  return words.filter((word) => {
    if (word.length < 2) return false;
    if (STOPWORDS.has(word) && !PRESERVED_TERMS.has(word)) return false;
    // Filter out pure numbers
    if (/^\d+$/.test(word)) return false;
    return true;
  });
}

/**
 * Extracts bigrams (two-word phrases).
 */
function extractBigrams(text: string): string[] {
  const words = text.split(/\s+/);
  const bigrams: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    // Only include if neither word is a pure stopword
    const w1 = words[i];
    const w2 = words[i + 1];
    if (w1.length >= 2 && w2.length >= 2) {
      // At least one word should be meaningful
      const w1IsStop = STOPWORDS.has(w1) && !PRESERVED_TERMS.has(w1);
      const w2IsStop = STOPWORDS.has(w2) && !PRESERVED_TERMS.has(w2);
      if (!w1IsStop || !w2IsStop) {
        bigrams.push(bigram);
      }
    }
  }

  return bigrams;
}

/**
 * Extracts trigrams (three-word phrases).
 */
function extractTrigrams(text: string): string[] {
  const words = text.split(/\s+/);
  const trigrams: string[] = [];

  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    const w1 = words[i];
    const w2 = words[i + 1];
    const w3 = words[i + 2];

    if (w1.length >= 2 && w2.length >= 2 && w3.length >= 2) {
      // At least two words should be meaningful
      const stops = [w1, w2, w3].filter(
        (w) => STOPWORDS.has(w) && !PRESERVED_TERMS.has(w)
      ).length;
      if (stops <= 1) {
        trigrams.push(trigram);
      }
    }
  }

  return trigrams;
}

/**
 * Scores terms based on frequency and context.
 */
function scoreTerns(
  terms: string[],
  originalText: string,
  requirementZones: Set<number>
): Map<string, number> {
  const scores = new Map<string, number>();
  const lowerOriginal = originalText.toLowerCase();

  // Count frequency
  const frequency = new Map<string, number>();
  terms.forEach((term) => {
    frequency.set(term, (frequency.get(term) || 0) + 1);
  });

  // Score each unique term
  frequency.forEach((count, term) => {
    let score = count;

    // Boost if in requirement zone
    const termPos = lowerOriginal.indexOf(term);
    if (termPos !== -1 && requirementZones.has(termPos)) {
      score *= 2;
    }

    // Boost if appears in ALL CAPS in original
    const capsPattern = new RegExp(
      term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toUpperCase(),
      'g'
    );
    if (capsPattern.test(originalText)) {
      score *= 1.5;
    }

    // Boost multi-word terms (more specific)
    const wordCount = term.split(' ').length;
    if (wordCount === 2) score *= 1.3;
    if (wordCount === 3) score *= 1.5;

    // Boost tech-related terms
    if (PRESERVED_TERMS.has(term) || Object.keys(SKILL_SYNONYMS).includes(term)) {
      score *= 1.5;
    }

    // Penalize very common generic terms
    const genericTerms = ['experience', 'communication', 'management', 'development'];
    if (genericTerms.includes(term)) {
      score *= 0.5;
    }

    scores.set(term, score);
  });

  return scores;
}

/**
 * Deduplicates terms and returns ranked list.
 */
function deduplicateAndRank(scores: Map<string, number>): string[] {
  // Sort by score descending
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  // Remove duplicates (if a bigram contains a unigram, keep the more specific one)
  const seen = new Set<string>();
  const result: string[] = [];

  for (const [term] of sorted) {
    // Check if this term is a subset of an already-added term
    let isSubset = false;
    for (const existing of seen) {
      if (existing.includes(term) && existing !== term) {
        isSubset = true;
        break;
      }
    }

    if (!isSubset) {
      // Also check if any existing term is a subset of this one
      const subsetsToRemove: string[] = [];
      for (const existing of seen) {
        if (term.includes(existing) && term !== existing) {
          subsetsToRemove.push(existing);
        }
      }

      // Remove subsets from result
      subsetsToRemove.forEach((s) => {
        const idx = result.indexOf(s);
        if (idx !== -1) result.splice(idx, 1);
        seen.delete(s);
      });

      seen.add(term);
      result.push(term);
    }
  }

  // Restore special terms
  return result.map((term) =>
    term
      .replace(/cplusplus/g, 'C++')
      .replace(/csharp/g, 'C#')
      .replace(/dotnet/g, '.NET')
      .replace(/nodejs/g, 'Node.js')
      .replace(/reactjs/g, 'React.js')
      .replace(/vuejs/g, 'Vue.js')
      .replace(/angularjs/g, 'Angular.js')
      .replace(/nextjs/g, 'Next.js')
  );
}

/**
 * Gets all synonyms for a keyword.
 */
export function getSynonyms(keyword: string): string[] {
  const lower = keyword.toLowerCase();

  // Check if keyword is in synonyms map
  if (SKILL_SYNONYMS[lower]) {
    return [lower, ...SKILL_SYNONYMS[lower]];
  }

  // Check if keyword is a synonym value
  for (const [main, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    if (synonyms.includes(lower)) {
      return [main, ...synonyms];
    }
  }

  return [lower];
}
