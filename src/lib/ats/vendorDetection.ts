/**
 * ATS Vendor Detection
 *
 * Detects which ATS vendor a company uses based on their job posting URL.
 * This helps users understand which scores are most relevant.
 */

export type ATSVendorType = 'sorter' | 'processor';

export interface ATSVendor {
  id: string;
  name: string;
  type: ATSVendorType;
  aiAddon?: string;
  description: string;
  guidance: {
    focus: string[];
    explanation: string;
  };
  icon: string; // Emoji for display
}

export interface VendorDetectionResult {
  detected: boolean;
  vendor?: ATSVendor;
  confidence: 'high' | 'medium' | 'low';
  matchedPattern?: string;
}

/**
 * ATS Vendor Database
 *
 * Based on research of common ATS URL patterns.
 */
export const ATS_VENDORS: Record<string, ATSVendor> = {
  greenhouse: {
    id: 'greenhouse',
    name: 'Greenhouse',
    type: 'processor',
    description: 'Pure database system. Recruiters manually search and review candidates.',
    guidance: {
      focus: ['Parse Health', 'Recruiter Search'],
      explanation:
        'Greenhouse does NOT auto-rank candidates. Recruiters use Boolean search to filter. Focus on clean parsing and exact keyword matches.',
    },
    icon: '🌱',
  },
  workday: {
    id: 'workday',
    name: 'Workday',
    type: 'sorter',
    aiAddon: 'HiredScore',
    description: 'AI-powered ranking system. Candidates are scored A/B/C/D based on fit.',
    guidance: {
      focus: ['Semantic Match', 'Parse Health'],
      explanation:
        'Workday uses HiredScore AI to rank candidates. Semantic alignment with the job description is critical. Recruiters see AI-generated scores.',
    },
    icon: '📊',
  },
  lever: {
    id: 'lever',
    name: 'Lever',
    type: 'processor',
    description: 'CRM-style system. Recruiters manually review candidates or search.',
    guidance: {
      focus: ['Parse Health', 'Recruiter Search'],
      explanation:
        'Lever is a CRM for recruiting with no AI ranking. Focus on being findable via search and having a cleanly parsed resume.',
    },
    icon: '🔧',
  },
  icims: {
    id: 'icims',
    name: 'iCIMS',
    type: 'sorter',
    aiAddon: 'Talent Cloud AI',
    description: 'Enterprise ATS with AI-powered Role Fit scoring.',
    guidance: {
      focus: ['Semantic Match', 'Parse Health'],
      explanation:
        'iCIMS uses Role Fit AI to compare candidates to ideal profiles. Skills and experience alignment are weighted heavily.',
    },
    icon: '📋',
  },
  taleo: {
    id: 'taleo',
    name: 'Taleo',
    type: 'sorter',
    aiAddon: 'ACE (Automated Candidate Evaluation)',
    description: 'Legacy Oracle ATS with automated scoring features.',
    guidance: {
      focus: ['Parse Health', 'Recruiter Search'],
      explanation:
        'Taleo is an older system that relies more on exact keyword matching than semantic understanding. Ensure key terms appear verbatim.',
    },
    icon: '⚙️',
  },
  ashby: {
    id: 'ashby',
    name: 'Ashby',
    type: 'processor',
    description: 'Modern ATS focused on recruiter workflow. No AI ranking.',
    guidance: {
      focus: ['Parse Health', 'Recruiter Search'],
      explanation:
        'Ashby prioritizes clean data and recruiter experience. Human recruiters make all decisions. Focus on parse quality and keywords.',
    },
    icon: '✨',
  },
  bamboohr: {
    id: 'bamboohr',
    name: 'BambooHR',
    type: 'processor',
    description: 'HR software with basic ATS functionality. No AI scoring.',
    guidance: {
      focus: ['Parse Health', 'Recruiter Search'],
      explanation:
        'BambooHR is primarily HR software with built-in recruiting. Simple filtering and manual review. Focus on clean formatting.',
    },
    icon: '🎋',
  },
  jazzhr: {
    id: 'jazzhr',
    name: 'JazzHR',
    type: 'processor',
    description: 'SMB-focused ATS. Simple applicant tracking without AI.',
    guidance: {
      focus: ['Parse Health', 'Recruiter Search'],
      explanation:
        'JazzHR is designed for small businesses. Manual review is the norm. Ensure your resume parses cleanly and contains relevant keywords.',
    },
    icon: '🎷',
  },
  jobvite: {
    id: 'jobvite',
    name: 'Jobvite',
    type: 'processor',
    description: 'Recruiting platform focused on referrals and CRM.',
    guidance: {
      focus: ['Parse Health', 'Recruiter Search'],
      explanation:
        'Jobvite emphasizes referrals and candidate relationship management. No AI ranking by default. Focus on searchability.',
    },
    icon: '🗳️',
  },
  smartrecruiters: {
    id: 'smartrecruiters',
    name: 'SmartRecruiters',
    type: 'processor',
    aiAddon: 'SmartAssistant (optional)',
    description: 'Enterprise recruiting platform with optional AI features.',
    guidance: {
      focus: ['Parse Health', 'Semantic Match'],
      explanation:
        'SmartRecruiters has optional AI scoring. If enabled, semantic match matters. Otherwise, focus on keywords and parse quality.',
    },
    icon: '🧠',
  },
  // Job Boards (not traditional ATS, but have their own application systems)
  indeed: {
    id: 'indeed',
    name: 'Indeed',
    type: 'processor',
    description: 'Job board with Easy Apply. Applications go to employer\'s email or their ATS.',
    guidance: {
      focus: ['Parse Health', 'Recruiter Search', 'Knockout Risk'],
      explanation:
        'Indeed is a job board, not an ATS. Your application is forwarded to the employer. Focus on keyword matching and meeting all requirements since the employer may use any ATS.',
    },
    icon: '🔍',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    type: 'processor',
    description: 'Professional network with Easy Apply. Applications forwarded to employer.',
    guidance: {
      focus: ['Parse Health', 'Recruiter Search', 'Knockout Risk'],
      explanation:
        'LinkedIn Easy Apply sends your profile to the employer. The company may use any ATS to process applications. Focus on keywords and requirements.',
    },
    icon: '💼',
  },
  ziprecruiter: {
    id: 'ziprecruiter',
    name: 'ZipRecruiter',
    type: 'sorter',
    aiAddon: 'TrafficBoost AI',
    description: 'Job board with AI matching that ranks candidates for employers.',
    guidance: {
      focus: ['Semantic Match', 'Parse Health'],
      explanation:
        'ZipRecruiter uses AI to match and rank candidates. Semantic alignment with job requirements improves your visibility to employers.',
    },
    icon: '⚡',
  },
  glassdoor: {
    id: 'glassdoor',
    name: 'Glassdoor',
    type: 'processor',
    description: 'Job board with company reviews. Applications forwarded to employer.',
    guidance: {
      focus: ['Parse Health', 'Recruiter Search', 'Knockout Risk'],
      explanation:
        'Glassdoor forwards applications to employers who may use various ATS systems. Focus on universal best practices.',
    },
    icon: '🚪',
  },
};

/**
 * URL patterns for detecting ATS vendors
 *
 * Each pattern includes the vendor ID and a regex to match URLs.
 */
interface URLPattern {
  vendorId: string;
  pattern: RegExp;
  confidence: 'high' | 'medium';
}

const URL_PATTERNS: URLPattern[] = [
  // Greenhouse patterns
  {
    vendorId: 'greenhouse',
    pattern: /boards\.greenhouse\.io/i,
    confidence: 'high',
  },
  {
    vendorId: 'greenhouse',
    pattern: /job-boards\.greenhouse\.io/i,
    confidence: 'high',
  },
  {
    vendorId: 'greenhouse',
    pattern: /greenhouse\.io\/embed\/job_board/i,
    confidence: 'high',
  },

  // Workday patterns
  {
    vendorId: 'workday',
    pattern: /\.wd\d+\.myworkdayjobs\.com/i,
    confidence: 'high',
  },
  {
    vendorId: 'workday',
    pattern: /myworkdayjobs\.com/i,
    confidence: 'high',
  },
  {
    vendorId: 'workday',
    pattern: /workday\.com\/.*\/job/i,
    confidence: 'medium',
  },

  // Lever patterns
  {
    vendorId: 'lever',
    pattern: /jobs\.lever\.co/i,
    confidence: 'high',
  },
  {
    vendorId: 'lever',
    pattern: /lever\.co\/.*\/postings/i,
    confidence: 'high',
  },

  // iCIMS patterns
  {
    vendorId: 'icims',
    pattern: /careers.*\.icims\.com/i,
    confidence: 'high',
  },
  {
    vendorId: 'icims',
    pattern: /\.icims\.com/i,
    confidence: 'high',
  },

  // Taleo patterns
  {
    vendorId: 'taleo',
    pattern: /\.taleo\.net/i,
    confidence: 'high',
  },
  {
    vendorId: 'taleo',
    pattern: /taleo\.com/i,
    confidence: 'medium',
  },

  // Ashby patterns
  {
    vendorId: 'ashby',
    pattern: /jobs\.ashbyhq\.com/i,
    confidence: 'high',
  },
  {
    vendorId: 'ashby',
    pattern: /ashbyhq\.com.*\/jobs/i,
    confidence: 'high',
  },

  // BambooHR patterns
  {
    vendorId: 'bamboohr',
    pattern: /\.bamboohr\.com\/careers/i,
    confidence: 'high',
  },
  {
    vendorId: 'bamboohr',
    pattern: /\.bamboohr\.com\/jobs/i,
    confidence: 'high',
  },

  // JazzHR patterns
  {
    vendorId: 'jazzhr',
    pattern: /\.applytojob\.com/i,
    confidence: 'high',
  },
  {
    vendorId: 'jazzhr',
    pattern: /app\.jazz\.co/i,
    confidence: 'high',
  },

  // Jobvite patterns
  {
    vendorId: 'jobvite',
    pattern: /jobs\.jobvite\.com/i,
    confidence: 'high',
  },
  {
    vendorId: 'jobvite',
    pattern: /\.jobvite\.com/i,
    confidence: 'medium',
  },

  // SmartRecruiters patterns
  {
    vendorId: 'smartrecruiters',
    pattern: /jobs\.smartrecruiters\.com/i,
    confidence: 'high',
  },
  {
    vendorId: 'smartrecruiters',
    pattern: /\.smartrecruiters\.com/i,
    confidence: 'medium',
  },

  // Indeed patterns
  {
    vendorId: 'indeed',
    pattern: /indeed\.com\/viewjob/i,
    confidence: 'high',
  },
  {
    vendorId: 'indeed',
    pattern: /indeed\.com\/job\//i,
    confidence: 'high',
  },
  {
    vendorId: 'indeed',
    pattern: /indeed\.com\/cmp\//i,
    confidence: 'high',
  },
  {
    vendorId: 'indeed',
    pattern: /indeed\.com\/jobs/i,
    confidence: 'medium',
  },
  {
    vendorId: 'indeed',
    pattern: /\.indeed\.com/i,
    confidence: 'medium',
  },

  // LinkedIn patterns
  {
    vendorId: 'linkedin',
    pattern: /linkedin\.com\/jobs\/view/i,
    confidence: 'high',
  },
  {
    vendorId: 'linkedin',
    pattern: /linkedin\.com\/job\//i,
    confidence: 'high',
  },

  // ZipRecruiter patterns
  {
    vendorId: 'ziprecruiter',
    pattern: /ziprecruiter\.com\/jobs/i,
    confidence: 'high',
  },
  {
    vendorId: 'ziprecruiter',
    pattern: /ziprecruiter\.com\/c\//i,
    confidence: 'high',
  },

  // Glassdoor patterns
  {
    vendorId: 'glassdoor',
    pattern: /glassdoor\.com\/job-listing/i,
    confidence: 'high',
  },
  {
    vendorId: 'glassdoor',
    pattern: /glassdoor\.com\/Job/i,
    confidence: 'medium',
  },
];

/**
 * Detect ATS vendor from a job posting URL
 *
 * @param url - The job posting URL to analyze
 * @returns Detection result with vendor info and confidence
 */
export function detectATSVendor(url: string): VendorDetectionResult {
  if (!url || typeof url !== 'string') {
    return { detected: false, confidence: 'low' };
  }

  // Normalize URL
  const normalizedUrl = url.trim().toLowerCase();

  // Try to match against patterns
  for (const pattern of URL_PATTERNS) {
    if (pattern.pattern.test(normalizedUrl)) {
      const vendor = ATS_VENDORS[pattern.vendorId];
      if (vendor) {
        return {
          detected: true,
          vendor,
          confidence: pattern.confidence,
          matchedPattern: pattern.pattern.source,
        };
      }
    }
  }

  return { detected: false, confidence: 'low' };
}

/**
 * Extract company name from job posting URL
 *
 * @param url - The job posting URL
 * @returns Extracted company name or null
 */
export function extractCompanyFromURL(url: string): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    // Greenhouse: boards.greenhouse.io/COMPANY
    if (hostname.includes('greenhouse.io')) {
      const match = pathname.match(/^\/([^/]+)/);
      if (match) return match[1];
    }

    // Lever: jobs.lever.co/COMPANY
    if (hostname.includes('lever.co')) {
      const match = pathname.match(/^\/([^/]+)/);
      if (match) return match[1];
    }

    // Workday: COMPANY.wd5.myworkdayjobs.com
    if (hostname.includes('myworkdayjobs.com')) {
      const match = hostname.match(/^([^.]+)\./);
      if (match) return match[1];
    }

    // Ashby: jobs.ashbyhq.com/COMPANY
    if (hostname.includes('ashbyhq.com')) {
      const match = pathname.match(/^\/([^/]+)/);
      if (match) return match[1];
    }

    // iCIMS: careers-COMPANY.icims.com
    if (hostname.includes('icims.com')) {
      const match = hostname.match(/^careers-?([^.]+)/);
      if (match) return match[1];
    }

    // SmartRecruiters: jobs.smartrecruiters.com/COMPANY
    if (hostname.includes('smartrecruiters.com')) {
      const match = pathname.match(/^\/([^/]+)/);
      if (match) return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get guidance for unknown/undetected ATS
 */
export function getUnknownATSGuidance(): {
  focus: string[];
  explanation: string;
} {
  return {
    focus: ['Parse Health', 'Recruiter Search', 'Knockout Risk'],
    explanation:
      'We couldn\'t detect the ATS vendor. Focus on universal best practices: clean formatting for parsing, exact keyword matches, and verifying you meet all requirements.',
  };
}

/**
 * Get relevant score names based on ATS type
 */
export function getRelevantScores(vendorType: ATSVendorType | null): string[] {
  if (vendorType === 'sorter') {
    return ['parseHealth', 'semanticMatch', 'knockoutRisk'];
  }
  if (vendorType === 'processor') {
    return ['parseHealth', 'recruiterSearch', 'knockoutRisk'];
  }
  // Unknown - return all
  return ['parseHealth', 'knockoutRisk', 'semanticMatch', 'recruiterSearch'];
}

/**
 * Check if semantic match is especially relevant for this vendor
 */
export function isSemanticMatchRelevant(vendor: ATSVendor | null): boolean {
  if (!vendor) return true; // Unknown = all scores relevant
  return vendor.type === 'sorter';
}

/**
 * Check if recruiter search is especially relevant for this vendor
 */
export function isRecruiterSearchRelevant(vendor: ATSVendor | null): boolean {
  if (!vendor) return true; // Unknown = all scores relevant
  return vendor.type === 'processor';
}
