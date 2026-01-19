/**
 * Enhanced Knockout Analysis Module
 *
 * Extends basic knockout detection with resume-based assessment.
 * Compares detected requirements against resume content to provide
 * automatic confidence assessments.
 */

import { KnockoutItem } from '../types/session';
import { KnockoutCategory } from './knockouts';

// ============================================================================
// Types
// ============================================================================

export interface EnhancedKnockoutItem extends KnockoutItem {
  /** Auto-assessed likelihood of meeting requirement */
  autoAssessment?: {
    likely: boolean;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  };
  /** Supporting evidence from resume */
  resumeEvidence?: string;
}

export interface ExperienceRequirement {
  years: number;
  field?: string;
  isMinimum: boolean;
}

export interface EducationRequirement {
  level: 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd';
  field?: string;
  isRequired: boolean;
}

export interface LocationRequirement {
  type: 'remote' | 'hybrid' | 'onsite';
  location?: string;
  daysInOffice?: number;
}

export interface ResumeProfile {
  yearsOfExperience: number;
  educationLevel: EducationRequirement['level'] | null;
  hasWorkAuthorization: boolean | null;
  location: string | null;
  hasSecurityClearance: boolean;
  certifications: string[];
  skills: string[];
}

// ============================================================================
// Experience Extraction
// ============================================================================

/**
 * Extract years of experience requirement from job description
 */
export function extractExperienceRequirement(jdText: string): ExperienceRequirement | null {
  const patterns = [
    // "5+ years of experience"
    /(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:relevant\s+)?(?:professional\s+)?experience/i,
    // "minimum 5 years"
    /minimum\s+(?:of\s+)?(\d+)\s*(?:years?|yrs?)/i,
    // "at least 5 years"
    /at\s+least\s+(\d+)\s*(?:years?|yrs?)/i,
    // "5-7 years of experience"
    /(\d+)\s*[-–]\s*\d+\s*(?:years?|yrs?)(?:\s+of)?\s+experience/i,
    // "experienced (5+ years)"
    /experienced\s*\((\d+)\+?\s*(?:years?|yrs?)\)/i,
    // "5 years' experience"
    /(\d+)\s*(?:years?|yrs?)['']\s*experience/i,
  ];

  for (const pattern of patterns) {
    const match = jdText.match(pattern);
    if (match) {
      const years = parseInt(match[1]);
      if (years > 0 && years <= 30) {
        // Extract field if mentioned nearby
        const fieldMatch = jdText.slice(
          Math.max(0, match.index! - 50),
          match.index! + match[0].length + 100
        ).match(/experience\s+(?:in|with)\s+([a-z\s,]+?)(?:\.|,|and|or|$)/i);

        return {
          years,
          field: fieldMatch ? fieldMatch[1].trim() : undefined,
          isMinimum: true,
        };
      }
    }
  }

  return null;
}

/**
 * Estimate years of experience from resume
 */
export function extractResumeExperience(resumeText: string): number {
  // Look for date ranges to calculate experience
  const dateRangePattern = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{4})\s*[-–—]\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{4})|present|current|now)/gi;

  const matches = [...resumeText.matchAll(dateRangePattern)];
  let totalMonths = 0;

  for (const match of matches) {
    const startYear = parseInt(match[1]);
    const endYear = match[2] ? parseInt(match[2]) : new Date().getFullYear();

    if (startYear >= 1980 && startYear <= new Date().getFullYear()) {
      const years = endYear - startYear;
      if (years >= 0 && years <= 40) {
        totalMonths += years * 12;
      }
    }
  }

  // Also try year-only patterns like "2018 - 2022"
  const yearOnlyPattern = /\b(20\d{2}|19\d{2})\s*[-–—]\s*(20\d{2}|present|current|now)\b/gi;
  const yearMatches = [...resumeText.matchAll(yearOnlyPattern)];

  for (const match of yearMatches) {
    const startYear = parseInt(match[1]);
    const endYear = match[2].match(/\d{4}/)
      ? parseInt(match[2])
      : new Date().getFullYear();

    if (startYear >= 1980 && startYear <= new Date().getFullYear()) {
      const years = endYear - startYear;
      if (years >= 0 && years <= 40) {
        // Don't double count - only add if significantly different
        if (totalMonths === 0) {
          totalMonths += years * 12;
        }
      }
    }
  }

  // Return years, accounting for overlapping roles
  // Assume ~70% non-overlap for conservative estimate
  return Math.round((totalMonths / 12) * 0.7);
}

// ============================================================================
// Education Extraction
// ============================================================================

/**
 * Extract education requirement from job description
 */
export function extractEducationRequirement(jdText: string): EducationRequirement | null {
  const patterns: Array<{
    pattern: RegExp;
    level: EducationRequirement['level'];
    isRequired: boolean;
  }> = [
    // PhD/Doctorate
    { pattern: /ph\.?d\.?\s+(required|in|preferred)/i, level: 'phd', isRequired: true },
    { pattern: /doctorate\s+(required|degree)/i, level: 'phd', isRequired: true },

    // Master's
    { pattern: /master'?s?\s+(degree\s+)?(required|in)/i, level: 'master', isRequired: true },
    { pattern: /ms\/ma\s+(required|minimum)/i, level: 'master', isRequired: true },
    { pattern: /mba\s+required/i, level: 'master', isRequired: true },
    { pattern: /graduate\s+degree\s+required/i, level: 'master', isRequired: true },

    // Bachelor's
    { pattern: /bachelor'?s?\s+(degree\s+)?(required|in)/i, level: 'bachelor', isRequired: true },
    { pattern: /bs\/ba\s+(required|minimum)/i, level: 'bachelor', isRequired: true },
    { pattern: /undergraduate\s+degree\s+required/i, level: 'bachelor', isRequired: true },
    { pattern: /4[- ]year\s+degree\s+required/i, level: 'bachelor', isRequired: true },

    // Associate
    { pattern: /associate'?s?\s+(degree\s+)?(required|in)/i, level: 'associate', isRequired: true },
    { pattern: /2[- ]year\s+degree\s+required/i, level: 'associate', isRequired: true },

    // High school
    { pattern: /high\s+school\s+(diploma|ged)\s+required/i, level: 'high_school', isRequired: true },

    // "or equivalent experience" makes it less strict
    { pattern: /degree\s+(?:or\s+)?equivalent\s+experience/i, level: 'bachelor', isRequired: false },
  ];

  for (const { pattern, level, isRequired } of patterns) {
    const match = jdText.match(pattern);
    if (match) {
      // Check for field specification
      const fieldMatch = jdText.slice(
        match.index!,
        match.index! + 150
      ).match(/(?:in|degree\s+in)\s+(computer science|engineering|business|mathematics|science|related field|[a-z\s]+?)(?:\s+or|\s+preferred|\.|,|$)/i);

      return {
        level,
        field: fieldMatch ? fieldMatch[1].trim() : undefined,
        isRequired,
      };
    }
  }

  return null;
}

/**
 * Extract education level from resume
 */
export function extractResumeEducation(resumeText: string): EducationRequirement['level'] | null {
  const lower = resumeText.toLowerCase();

  // Check for PhD/Doctorate
  if (/ph\.?d\.?|doctorate|doctor of/i.test(resumeText)) {
    return 'phd';
  }

  // Check for Master's
  if (/master'?s?\s+(degree|of|in)|m\.?s\.?\s+in|m\.?a\.?\s+in|mba|m\.?b\.?a\.?/i.test(resumeText)) {
    return 'master';
  }

  // Check for Bachelor's
  if (/bachelor'?s?\s+(degree|of|in)|b\.?s\.?\s+in|b\.?a\.?\s+in|b\.?sc\.?|undergraduate/i.test(resumeText)) {
    return 'bachelor';
  }

  // Check for Associate
  if (/associate'?s?\s+(degree|of|in)|a\.?s\.?\s+in|a\.?a\.?\s+in/i.test(resumeText)) {
    return 'associate';
  }

  // Check for high school
  if (/high school|ged|diploma/i.test(lower)) {
    return 'high_school';
  }

  return null;
}

/**
 * Compare education levels
 */
export function meetsEducationRequirement(
  resumeLevel: EducationRequirement['level'] | null,
  requiredLevel: EducationRequirement['level']
): boolean {
  if (!resumeLevel) return false;

  const levelOrder: Record<EducationRequirement['level'], number> = {
    high_school: 1,
    associate: 2,
    bachelor: 3,
    master: 4,
    phd: 5,
  };

  return levelOrder[resumeLevel] >= levelOrder[requiredLevel];
}

// ============================================================================
// Work Authorization Detection
// ============================================================================

/**
 * Check if resume indicates work authorization
 */
export function checkWorkAuthorization(resumeText: string): {
  hasAuthorization: boolean | null;
  hasClearance: boolean;
  evidence: string | null;
} {
  const lower = resumeText.toLowerCase();

  // Check for citizenship/authorization mentions
  const authPatterns = [
    /\b(us|u\.s\.)\s+citizen\b/i,
    /\bamerican\s+citizen\b/i,
    /\bauthorized\s+to\s+work\b/i,
    /\bpermanent\s+resident\b/i,
    /\bgreen\s+card\b/i,
  ];

  let hasAuthorization: boolean | null = null;
  let authEvidence: string | null = null;

  for (const pattern of authPatterns) {
    const match = resumeText.match(pattern);
    if (match) {
      hasAuthorization = true;
      authEvidence = match[0];
      break;
    }
  }

  // Check for visa mentions (might indicate need for sponsorship)
  const visaPatterns = [
    /\b(h-?1b|f-?1|opt|cpt|l-?1|tn)\s*(visa)?\b/i,
    /\brequires?\s+sponsorship\b/i,
    /\bvisa\s+holder\b/i,
  ];

  for (const pattern of visaPatterns) {
    if (pattern.test(resumeText)) {
      hasAuthorization = false;
      break;
    }
  }

  // Check for security clearance
  const clearancePatterns = [
    /\b(secret|top secret|ts\/sci|sci)\s+clearance\b/i,
    /\bactive\s+clearance\b/i,
    /\bclearance:\s*(secret|ts|sci)/i,
    /\bholds?\s+(a\s+)?(secret|ts|sci)/i,
  ];

  let hasClearance = false;
  for (const pattern of clearancePatterns) {
    if (pattern.test(resumeText)) {
      hasClearance = true;
      break;
    }
  }

  return { hasAuthorization, hasClearance, evidence: authEvidence };
}

// ============================================================================
// Location/Remote Detection
// ============================================================================

/**
 * Extract location requirement from job description
 */
export function extractLocationRequirement(jdText: string): LocationRequirement | null {
  const lower = jdText.toLowerCase();

  // Check for fully remote
  if (/\b(fully|100%|completely)\s+remote\b/i.test(jdText) ||
      /\bremote[- ]only\b/i.test(jdText) ||
      /\bwork\s+from\s+(home|anywhere)\b/i.test(jdText)) {
    return { type: 'remote' };
  }

  // Check for hybrid
  const hybridMatch = jdText.match(/hybrid\s*(?:\(|\:)?\s*(\d+)\s*days?/i) ||
                      jdText.match(/(\d+)\s*days?\s+(?:in[- ]?office|on[- ]?site)/i);
  if (hybridMatch || /\bhybrid\b/i.test(jdText)) {
    return {
      type: 'hybrid',
      daysInOffice: hybridMatch ? parseInt(hybridMatch[1]) : undefined,
    };
  }

  // Check for onsite
  if (/\b(on[- ]?site|in[- ]?office|in[- ]?person)\s+(only|required|position)\b/i.test(jdText) ||
      /\bmust\s+(work\s+)?on[- ]?site\b/i.test(jdText) ||
      /\b100%\s+on[- ]?site\b/i.test(jdText)) {
    // Try to extract location
    const locMatch = jdText.match(/(?:located\s+in|based\s+in|office\s+in)\s+([A-Z][a-z]+(?:,?\s+[A-Z]{2})?)/);
    return {
      type: 'onsite',
      location: locMatch ? locMatch[1] : undefined,
    };
  }

  return null;
}

/**
 * Check if candidate location matches requirement
 */
export function checkLocationMatch(
  resumeText: string,
  requirement: LocationRequirement
): { matches: boolean; confidence: 'high' | 'medium' | 'low'; reason: string } {
  // Remote jobs - always likely to match
  if (requirement.type === 'remote') {
    return {
      matches: true,
      confidence: 'high',
      reason: 'Role is fully remote',
    };
  }

  // Try to extract location from resume
  const locationPatterns = [
    /\b([A-Z][a-z]+,?\s*[A-Z]{2})\b/, // "Austin, TX" or "Austin TX"
    /\blocated\s+in\s+([A-Z][a-z]+)/i,
    /\b([A-Z][a-z]+)\s+metro\s+area\b/i,
  ];

  let resumeLocation: string | null = null;
  for (const pattern of locationPatterns) {
    const match = resumeText.match(pattern);
    if (match) {
      resumeLocation = match[1];
      break;
    }
  }

  if (requirement.type === 'hybrid') {
    return {
      matches: resumeLocation !== null,
      confidence: 'low',
      reason: resumeLocation
        ? `Hybrid role - candidate appears to be in ${resumeLocation}`
        : 'Hybrid role - unable to determine candidate location',
    };
  }

  // Onsite
  if (requirement.location && resumeLocation) {
    const matches = requirement.location.toLowerCase().includes(resumeLocation.toLowerCase()) ||
                    resumeLocation.toLowerCase().includes(requirement.location.toLowerCase());
    return {
      matches,
      confidence: matches ? 'medium' : 'low',
      reason: matches
        ? `Location appears to match (${resumeLocation})`
        : `Location may not match - job in ${requirement.location}, candidate in ${resumeLocation}`,
    };
  }

  return {
    matches: false,
    confidence: 'low',
    reason: 'On-site role - unable to verify location match',
  };
}

// ============================================================================
// Certification Detection
// ============================================================================

/**
 * Extract certifications from resume
 */
export function extractCertifications(resumeText: string): string[] {
  const certifications: string[] = [];

  const certPatterns = [
    // IT/Security certifications
    { pattern: /\b(cissp|cism|cisa|security\+|sec\+)\b/gi, name: (m: string) => m.toUpperCase() },
    { pattern: /\b(aws)\s+(certified|solutions architect|developer|sysops)/gi, name: () => 'AWS Certified' },
    { pattern: /\b(azure)\s+(certified|administrator|developer)/gi, name: () => 'Azure Certified' },
    { pattern: /\b(gcp|google cloud)\s+certified/gi, name: () => 'GCP Certified' },
    { pattern: /\bpmp\b/gi, name: () => 'PMP' },
    { pattern: /\bscrum\s+master\b/gi, name: () => 'Scrum Master' },
    { pattern: /\bcsm\b/gi, name: () => 'CSM' },

    // Professional certifications
    { pattern: /\bcpa\b/gi, name: () => 'CPA' },
    { pattern: /\bcfa\b/gi, name: () => 'CFA' },
    { pattern: /\b(rn|registered nurse)\b/gi, name: () => 'RN' },
    { pattern: /\bbar\s+(admission|admitted)/gi, name: () => 'Bar Admission' },
    { pattern: /\bpe\s+(license|licensed)/gi, name: () => 'PE License' },
  ];

  for (const { pattern, name } of certPatterns) {
    const matches = resumeText.matchAll(pattern);
    for (const match of matches) {
      const certName = name(match[0]);
      if (!certifications.includes(certName)) {
        certifications.push(certName);
      }
    }
  }

  return certifications;
}

// ============================================================================
// Enhanced Knockout Detection
// ============================================================================

/**
 * Build a resume profile for comparison
 */
export function buildResumeProfile(resumeText: string): ResumeProfile {
  const authCheck = checkWorkAuthorization(resumeText);

  return {
    yearsOfExperience: extractResumeExperience(resumeText),
    educationLevel: extractResumeEducation(resumeText),
    hasWorkAuthorization: authCheck.hasAuthorization,
    hasSecurityClearance: authCheck.hasClearance,
    location: null, // Would need more sophisticated extraction
    certifications: extractCertifications(resumeText),
    skills: [], // Could be enhanced with skill extraction
  };
}

/**
 * Enhance knockout items with auto-assessment based on resume
 */
export function enhanceKnockoutsWithResume(
  knockouts: KnockoutItem[],
  resumeText: string,
  jdText: string
): EnhancedKnockoutItem[] {
  const profile = buildResumeProfile(resumeText);

  return knockouts.map((knockout) => {
    const enhanced: EnhancedKnockoutItem = { ...knockout };

    switch (knockout.category) {
      case 'authorization':
        if (knockout.label.includes('clearance')) {
          enhanced.autoAssessment = {
            likely: profile.hasSecurityClearance,
            confidence: profile.hasSecurityClearance ? 'high' : 'medium',
            reason: profile.hasSecurityClearance
              ? 'Resume indicates active security clearance'
              : 'No security clearance mentioned in resume',
          };
        } else {
          enhanced.autoAssessment = {
            likely: profile.hasWorkAuthorization === true,
            confidence: profile.hasWorkAuthorization !== null ? 'medium' : 'low',
            reason: profile.hasWorkAuthorization === true
              ? 'Resume indicates work authorization'
              : profile.hasWorkAuthorization === false
                ? 'Resume may indicate visa status requiring sponsorship'
                : 'Work authorization status not found in resume',
          };
        }
        break;

      case 'degree':
        const eduReq = extractEducationRequirement(jdText);
        if (eduReq) {
          const meets = meetsEducationRequirement(profile.educationLevel, eduReq.level);
          enhanced.autoAssessment = {
            likely: meets || !eduReq.isRequired,
            confidence: profile.educationLevel ? 'high' : 'low',
            reason: profile.educationLevel
              ? meets
                ? `Resume shows ${formatEducationLevel(profile.educationLevel)} degree`
                : `Resume shows ${formatEducationLevel(profile.educationLevel)}, job requires ${formatEducationLevel(eduReq.level)}`
              : 'Education level not clearly identified in resume',
          };
          if (profile.educationLevel) {
            enhanced.resumeEvidence = formatEducationLevel(profile.educationLevel);
          }
        }
        break;

      case 'license':
        // Check if any resume certifications match
        const hasCert = profile.certifications.some(cert =>
          knockout.label.toLowerCase().includes(cert.toLowerCase()) ||
          cert.toLowerCase().includes(knockout.label.split(' ')[0].toLowerCase())
        );
        enhanced.autoAssessment = {
          likely: hasCert,
          confidence: hasCert ? 'high' : 'medium',
          reason: hasCert
            ? `Matching certification found: ${profile.certifications.join(', ')}`
            : 'Required certification not found in resume',
        };
        if (profile.certifications.length > 0) {
          enhanced.resumeEvidence = profile.certifications.join(', ');
        }
        break;

      case 'location':
        const locReq = extractLocationRequirement(jdText);
        if (locReq) {
          const locCheck = checkLocationMatch(resumeText, locReq);
          enhanced.autoAssessment = {
            likely: locCheck.matches,
            confidence: locCheck.confidence,
            reason: locCheck.reason,
          };
        }
        break;

      default:
        // For other categories, we can't auto-assess
        enhanced.autoAssessment = {
          likely: false,
          confidence: 'low',
          reason: 'Please review this requirement manually',
        };
    }

    return enhanced;
  });
}

/**
 * Add experience knockout if significant gap exists
 */
export function detectExperienceKnockout(
  resumeText: string,
  jdText: string
): EnhancedKnockoutItem | null {
  const requirement = extractExperienceRequirement(jdText);
  if (!requirement) return null;

  const resumeYears = extractResumeExperience(resumeText);
  const meetsRequirement = resumeYears >= requirement.years;
  const gap = requirement.years - resumeYears;

  // Only flag if significant gap (more than 2 years short)
  if (gap <= 2 && !meetsRequirement) {
    return null; // Close enough, don't flag
  }

  return {
    id: crypto.randomUUID(),
    label: `${requirement.years}+ years of experience required`,
    category: 'other',
    evidence: requirement.field
      ? `${requirement.years}+ years of experience in ${requirement.field}`
      : `${requirement.years}+ years of experience required`,
    userConfirmed: undefined,
    autoAssessment: {
      likely: meetsRequirement,
      confidence: 'medium',
      reason: meetsRequirement
        ? `Resume shows approximately ${resumeYears} years of experience`
        : `Resume shows approximately ${resumeYears} years (${gap} years short of requirement)`,
    },
    resumeEvidence: `~${resumeYears} years experience detected`,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function formatEducationLevel(level: EducationRequirement['level']): string {
  switch (level) {
    case 'high_school': return 'High School';
    case 'associate': return "Associate's";
    case 'bachelor': return "Bachelor's";
    case 'master': return "Master's";
    case 'phd': return 'PhD';
  }
}
