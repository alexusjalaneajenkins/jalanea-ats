/**
 * Job Description Keyword Extraction Engine v2
 *
 * Uses a dictionary-first approach with pattern-based fallback.
 * Based on research into how real ATS systems extract keywords.
 */

import { KeywordSet } from '../types/session';

// =============================================================================
// SKILLS DICTIONARIES
// =============================================================================

/**
 * Technical tools and platforms - these get highest priority matching
 */
const TOOLS_DICT = new Set([
  // Customer Support / CRM
  'zendesk', 'intercom', 'freshdesk', 'salesforce', 'hubspot', 'zoho',
  'helpscout', 'drift', 'crisp', 'tawk', 'livechat', 'olark', 'kayako',
  'gorgias', 'gladly', 'kustomer', 'front', 'groove', 'helpjuice',

  // Project Management
  'jira', 'asana', 'trello', 'monday', 'notion', 'clickup', 'basecamp',
  'linear', 'shortcut', 'wrike', 'smartsheet', 'airtable', 'coda',

  // Communication
  'slack', 'teams', 'zoom', 'discord', 'webex', 'google meet', 'skype',

  // Cloud Platforms
  'aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'netlify',
  'digitalocean', 'cloudflare', 'firebase',

  // Databases
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'dynamodb', 'sqlite', 'oracle', 'sql server', 'snowflake', 'bigquery',

  // Dev Tools
  'github', 'gitlab', 'bitbucket', 'docker', 'kubernetes', 'jenkins',
  'circleci', 'travis', 'terraform', 'ansible', 'datadog', 'splunk',
  'new relic', 'sentry', 'grafana', 'prometheus',

  // Design
  'figma', 'sketch', 'adobe xd', 'invision', 'zeplin', 'miro', 'canva',

  // Analytics
  'google analytics', 'mixpanel', 'amplitude', 'segment', 'heap', 'hotjar',
  'fullstory', 'tableau', 'looker', 'power bi', 'metabase',

  // Marketing / Sales
  'marketo', 'mailchimp', 'sendgrid', 'twilio', 'stripe', 'shopify',
  'magento', 'wordpress', 'webflow', 'squarespace',

  // AI/ML Tools
  'openai', 'chatgpt', 'claude', 'anthropic', 'langchain', 'huggingface',
  'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
]);

/**
 * Programming languages and frameworks
 */
const TECH_SKILLS_DICT = new Set([
  // Languages
  'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'golang',
  'ruby', 'php', 'swift', 'kotlin', 'rust', 'scala', 'r', 'perl', 'lua',
  'bash', 'shell', 'powershell', 'sql', 'graphql', 'html', 'css', 'sass',

  // Frontend Frameworks
  'react', 'reactjs', 'react.js', 'angular', 'angularjs', 'vue', 'vuejs',
  'vue.js', 'svelte', 'next.js', 'nextjs', 'nuxt', 'gatsby', 'remix',
  'jquery', 'backbone', 'ember',

  // Backend Frameworks
  'node.js', 'nodejs', 'express', 'fastify', 'nest.js', 'nestjs',
  'django', 'flask', 'fastapi', 'rails', 'ruby on rails', 'spring',
  'spring boot', 'laravel', 'symfony', 'asp.net', '.net', 'dotnet',

  // Mobile
  'react native', 'flutter', 'ionic', 'xamarin', 'swiftui', 'android sdk',

  // Data/ML
  'spark', 'hadoop', 'kafka', 'airflow', 'dbt', 'tableau', 'power bi',
  'machine learning', 'deep learning', 'nlp', 'computer vision',

  // DevOps/Infra
  'ci/cd', 'devops', 'sre', 'kubernetes', 'k8s', 'docker', 'aws', 'azure',
  'gcp', 'linux', 'unix', 'windows server', 'nginx', 'apache',

  // APIs/Protocols
  'rest', 'restful', 'api', 'apis', 'graphql', 'grpc', 'websocket', 'oauth',
  'json', 'xml', 'yaml',
]);

/**
 * Soft skills and work-style keywords
 */
const SOFT_SKILLS_DICT = new Set([
  // Communication
  'communication', 'written communication', 'verbal communication',
  'presentation', 'public speaking', 'active listening', 'empathy',

  // Collaboration
  'teamwork', 'collaboration', 'cross-functional', 'stakeholder management',

  // Problem Solving
  'problem solving', 'critical thinking', 'analytical', 'troubleshooting',
  'debugging', 'root cause analysis',

  // Leadership
  'leadership', 'mentorship', 'coaching', 'team management', 'delegation',

  // Organization
  'time management', 'prioritization', 'multitasking', 'attention to detail',
  'organization', 'planning',

  // Customer Focus
  'customer service', 'customer support', 'customer success', 'client facing',
  'customer experience', 'customer satisfaction', 'csat', 'nps',

  // Adaptability
  'adaptability', 'flexibility', 'fast-paced', 'startup', 'high-growth',
  'agile', 'scrum', 'remote', 'hybrid',
]);

/**
 * Compound skill phrases that should be matched as units
 */
const COMPOUND_SKILLS_DICT = new Set([
  // Support-specific
  'customer support', 'customer service', 'customer success', 'customer experience',
  'technical support', 'phone support', 'email support', 'live chat',
  'ticket management', 'ticket resolution', 'escalation management',
  'support platforms', 'help desk', 'service desk',

  // Technical
  'workflow automation', 'process automation', 'task automation',
  'ai-powered', 'ai-powered tools', 'machine learning', 'data analysis',
  'data visualization', 'database management', 'version control',
  'code review', 'unit testing', 'integration testing', 'test automation',

  // Business
  'project management', 'product management', 'account management',
  'stakeholder management', 'vendor management', 'change management',
  'risk management', 'quality assurance', 'quality control',

  // Methodologies
  'agile methodology', 'scrum methodology', 'lean methodology',
  'continuous improvement', 'process improvement',

  // Environment
  'startup environment', 'fast-paced environment', 'remote work',
  'hybrid work', 'cross-functional team',
]);

/**
 * Certifications and qualifications
 */
const CERTIFICATIONS_DICT = new Set([
  // Tech
  'aws certified', 'azure certified', 'google certified', 'pmp',
  'scrum master', 'csm', 'itil', 'comptia', 'cissp', 'cism',

  // Support
  'hdi', 'itil foundation', 'itil practitioner',

  // General
  'six sigma', 'lean six sigma', 'green belt', 'black belt',
]);

/**
 * Degree-related terms
 */
const DEGREE_PATTERNS = [
  /bachelor'?s?\s*(degree)?/gi,
  /master'?s?\s*(degree)?/gi,
  /ph\.?d\.?/gi,
  /mba/gi,
  /associate'?s?\s*(degree)?/gi,
  /b\.?s\.?\s+in/gi,
  /b\.?a\.?\s+in/gi,
  /m\.?s\.?\s+in/gi,
];

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Main keyword extraction function - dictionary-first approach
 */
export function extractKeywords(jobText: string): KeywordSet {
  if (!jobText || jobText.trim().length === 0) {
    return { critical: [], optional: [], all: [] };
  }

  const normalizedText = normalizeText(jobText);
  const foundKeywords = new Map<string, number>(); // keyword -> score

  // Step 1: Extract tools (highest value)
  extractFromDictionary(normalizedText, TOOLS_DICT, foundKeywords, 10);

  // Step 2: Extract compound skills (high value - must come before single words)
  extractFromDictionary(normalizedText, COMPOUND_SKILLS_DICT, foundKeywords, 8);

  // Step 3: Extract tech skills
  extractFromDictionary(normalizedText, TECH_SKILLS_DICT, foundKeywords, 7);

  // Step 4: Extract soft skills
  extractFromDictionary(normalizedText, SOFT_SKILLS_DICT, foundKeywords, 5);

  // Step 5: Extract certifications
  extractFromDictionary(normalizedText, CERTIFICATIONS_DICT, foundKeywords, 9);

  // Step 6: Boost keywords found in requirement sections
  boostRequirementKeywords(jobText, foundKeywords);

  // Step 7: Sort by score and deduplicate
  const rankedKeywords = rankAndDeduplicate(foundKeywords);

  // Step 8: Split into critical and optional
  const critical = rankedKeywords.slice(0, 15);
  const optional = rankedKeywords.slice(15, 30);

  return {
    critical,
    optional,
    all: rankedKeywords,
  };
}

/**
 * Normalize text for matching
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();

  // Normalize special characters
  normalized = normalized
    .replace(/['']/g, "'")  // Smart quotes to regular
    .replace(/[""]/g, '"')
    .replace(/–/g, '-')     // En-dash to hyphen
    .replace(/—/g, '-')     // Em-dash to hyphen
    .replace(/\s+/g, ' ')   // Normalize whitespace
    .trim();

  return normalized;
}

/**
 * Extract keywords from a dictionary with word boundary matching
 */
function extractFromDictionary(
  text: string,
  dictionary: Set<string>,
  results: Map<string, number>,
  baseScore: number
): void {
  for (const term of dictionary) {
    // Create regex with word boundaries
    // Handle special regex characters in the term
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');

    const matches = text.match(regex);
    if (matches) {
      // Score based on frequency and base score
      const frequency = matches.length;
      const score = baseScore * (1 + Math.log(frequency));

      // Use the canonical form from dictionary
      const existingScore = results.get(term) || 0;
      results.set(term, Math.max(existingScore, score));
    }
  }
}

/**
 * Boost keywords found in requirement sections
 */
function boostRequirementKeywords(
  originalText: string,
  keywords: Map<string, number>
): void {
  const lowerText = originalText.toLowerCase();

  const requirementIndicators = [
    'required', 'must have', 'must be', 'minimum', 'mandatory', 'essential',
    'qualifications', 'requirements', 'you will need', 'you should have',
    'experience with', 'experience in', 'proficiency in', 'knowledge of',
    'familiarity with', 'background in', 'expertise in',
  ];

  // Find requirement zones (200 chars after each indicator)
  const requirementZones: Array<[number, number]> = [];
  for (const indicator of requirementIndicators) {
    let pos = lowerText.indexOf(indicator);
    while (pos !== -1) {
      requirementZones.push([pos, pos + 200]);
      pos = lowerText.indexOf(indicator, pos + 1);
    }
  }

  // Boost keywords found in requirement zones
  for (const [keyword, score] of keywords.entries()) {
    const keywordPos = lowerText.indexOf(keyword);
    if (keywordPos !== -1) {
      const inRequirementZone = requirementZones.some(
        ([start, end]) => keywordPos >= start && keywordPos <= end
      );
      if (inRequirementZone) {
        keywords.set(keyword, score * 1.5);
      }
    }
  }
}

/**
 * Rank keywords by score and remove duplicates/subsets
 */
function rankAndDeduplicate(keywords: Map<string, number>): string[] {
  // Sort by score descending
  const sorted = [...keywords.entries()].sort((a, b) => b[1] - a[1]);

  const result: string[] = [];
  const seen = new Set<string>();

  for (const [keyword] of sorted) {
    // Skip if this keyword is a subset of an already-added keyword
    let isSubset = false;
    for (const existing of seen) {
      if (existing.includes(keyword) && existing !== keyword) {
        isSubset = true;
        break;
      }
    }

    if (!isSubset) {
      // Remove any existing keywords that are subsets of this one
      const toRemove: string[] = [];
      for (const existing of seen) {
        if (keyword.includes(existing) && keyword !== existing) {
          toRemove.push(existing);
        }
      }
      toRemove.forEach(k => {
        seen.delete(k);
        const idx = result.indexOf(k);
        if (idx !== -1) result.splice(idx, 1);
      });

      seen.add(keyword);
      result.push(keyword);
    }
  }

  // Capitalize properly for display
  return result.map(k => capitalizeKeyword(k));
}

/**
 * Capitalize keyword for display
 */
function capitalizeKeyword(keyword: string): string {
  // Special cases that should stay uppercase/specific case
  const specialCases: Record<string, string> = {
    'aws': 'AWS',
    'gcp': 'GCP',
    'api': 'API',
    'apis': 'APIs',
    'sql': 'SQL',
    'css': 'CSS',
    'html': 'HTML',
    'ui': 'UI',
    'ux': 'UX',
    'ai': 'AI',
    'ml': 'ML',
    'nlp': 'NLP',
    'ci/cd': 'CI/CD',
    'csat': 'CSAT',
    'nps': 'NPS',
    'saas': 'SaaS',
    'paas': 'PaaS',
    'iaas': 'IaaS',
    'react': 'React',
    'react.js': 'React.js',
    'reactjs': 'ReactJS',
    'vue': 'Vue',
    'vue.js': 'Vue.js',
    'vuejs': 'VueJS',
    'angular': 'Angular',
    'node.js': 'Node.js',
    'nodejs': 'Node.js',
    'next.js': 'Next.js',
    'nextjs': 'Next.js',
    'typescript': 'TypeScript',
    'javascript': 'JavaScript',
    'graphql': 'GraphQL',
    'postgresql': 'PostgreSQL',
    'postgres': 'PostgreSQL',
    'mongodb': 'MongoDB',
    'mysql': 'MySQL',
    'redis': 'Redis',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'k8s': 'K8s',
    'github': 'GitHub',
    'gitlab': 'GitLab',
    'bitbucket': 'Bitbucket',
    'jira': 'Jira',
    'slack': 'Slack',
    'zoom': 'Zoom',
    'figma': 'Figma',
    'zendesk': 'Zendesk',
    'salesforce': 'Salesforce',
    'hubspot': 'HubSpot',
    'shopify': 'Shopify',
    'stripe': 'Stripe',
    'twilio': 'Twilio',
    'linkedin': 'LinkedIn',
    'openai': 'OpenAI',
    'chatgpt': 'ChatGPT',
    'tensorflow': 'TensorFlow',
    'pytorch': 'PyTorch',
  };

  const lower = keyword.toLowerCase();
  if (specialCases[lower]) {
    return specialCases[lower];
  }

  // Title case for multi-word phrases
  return keyword
    .split(' ')
    .map(word => {
      const lowerWord = word.toLowerCase();
      if (specialCases[lowerWord]) {
        return specialCases[lowerWord];
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// =============================================================================
// EXPORTS FOR COVERAGE MATCHING
// =============================================================================

/**
 * Common tech skill synonyms for matching resume to JD
 */
export const SKILL_SYNONYMS: Record<string, string[]> = {
  'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
  'typescript': ['ts'],
  'python': ['py'],
  'react': ['reactjs', 'react.js'],
  'vue': ['vuejs', 'vue.js'],
  'angular': ['angularjs', 'angular.js'],
  'node.js': ['nodejs', 'node'],
  'postgresql': ['postgres', 'psql'],
  'mongodb': ['mongo'],
  'kubernetes': ['k8s'],
  'amazon web services': ['aws'],
  'google cloud platform': ['gcp', 'google cloud'],
  'microsoft azure': ['azure'],
  'continuous integration': ['ci'],
  'continuous deployment': ['cd'],
  'customer support': ['customer service', 'cs', 'support'],
  'customer success': ['cs', 'csm'],
  'customer satisfaction': ['csat'],
  'net promoter score': ['nps'],
};

/**
 * Gets all synonyms for a keyword (for coverage matching)
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
