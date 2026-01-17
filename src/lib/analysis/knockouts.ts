/**
 * Knockout Detector
 *
 * Detects potential disqualifier requirements from job descriptions.
 * These are hard requirements that could automatically disqualify candidates.
 */

import { KnockoutItem } from '../types/session';

/**
 * Knockout category types
 */
export type KnockoutCategory =
  | 'authorization'
  | 'location'
  | 'schedule'
  | 'license'
  | 'degree'
  | 'physical'
  | 'other';

/**
 * Regex pattern definition with category and label generator
 */
interface KnockoutPattern {
  category: KnockoutCategory;
  patterns: RegExp[];
  labelGenerator: (match: string) => string;
}

/**
 * All knockout detection patterns
 */
const KNOCKOUT_PATTERNS: KnockoutPattern[] = [
  // Work Authorization
  {
    category: 'authorization',
    patterns: [
      /must be (legally )?authorized to work/i,
      /authorized to work in the (u\.?s\.?|united states)/i,
      /u\.?s\.? citizen(ship)? (required|only)/i,
      /(citizen|green card|permanent resident) (required|only)/i,
      /must be a (u\.?s\.? )?citizen/i,
      /no (visa )?sponsorship/i,
      /sponsorship (is )?not available/i,
      /unable to (provide|offer) (visa )?sponsorship/i,
      /cannot sponsor/i,
      /security clearance required/i,
      /active (security )?clearance required/i,
      /must (have|hold|possess) (an? )?(active )?(security )?clearance/i,
      /ts\/sci (clearance )?(required|must have)/i,
      /secret clearance (required|must have)/i,
    ],
    labelGenerator: (match) => {
      if (/clearance/i.test(match)) {
        return 'Security clearance required';
      }
      if (/sponsorship/i.test(match)) {
        return 'No visa sponsorship available';
      }
      return 'US work authorization required';
    },
  },

  // Location Requirements
  {
    category: 'location',
    patterns: [
      /must (be able to )?(work |come )?on[- ]?site/i,
      /on[- ]?site (only|required|position)/i,
      /100% on[- ]?site/i,
      /in[- ]?office required/i,
      /must be local to/i,
      /must (reside|live|be located) in/i,
      /local candidates (only|preferred)/i,
      /relocation (is )?(not (provided|available|offered)|will not be)/i,
      /no relocation (assistance|package)/i,
      /hybrid.{1,20}days?.{1,10}(in[- ]?office|on[- ]?site)/i,
      /\d+ days? (per week )?(in[- ]?office|on[- ]?site)/i,
    ],
    labelGenerator: (match) => {
      if (/relocation/i.test(match)) {
        return 'Relocation not provided';
      }
      if (/hybrid/i.test(match) || /\d+ days?/i.test(match)) {
        return 'Hybrid work - in-office days required';
      }
      if (/local/i.test(match) || /reside|live|located/i.test(match)) {
        return 'Must be local to area';
      }
      return 'On-site work required';
    },
  },

  // Schedule/Availability
  {
    category: 'schedule',
    patterns: [
      /available (to )?(start )?(immediately|within \d+ (days?|weeks?))/i,
      /start (date|immediately|asap)/i,
      /available (nights|weekends|evenings)/i,
      /must (be )?available (for )?(nights|weekends|evenings)/i,
      /willing to work (overtime|weekends|nights|evenings)/i,
      /on[- ]?call (required|availability)/i,
      /flexible (hours|schedule) required/i,
      /travel.{1,20}(\d+%|percent)/i,
      /up to \d+% travel/i,
      /extensive travel/i,
      /willing to travel/i,
    ],
    labelGenerator: (match) => {
      if (/travel/i.test(match)) {
        const percentMatch = match.match(/(\d+)%/);
        if (percentMatch) {
          return `Travel required (${percentMatch[1]}%)`;
        }
        return 'Travel required';
      }
      if (/immediately|asap/i.test(match)) {
        return 'Immediate start required';
      }
      if (/nights|weekends|evenings/i.test(match)) {
        return 'Non-standard hours required';
      }
      if (/on[- ]?call/i.test(match)) {
        return 'On-call availability required';
      }
      return 'Schedule flexibility required';
    },
  },

  // Physical Requirements
  {
    category: 'physical',
    patterns: [
      /lift.{1,20}(\d+).{1,10}(lbs?|pounds?)/i,
      /able to lift/i,
      /stand for (extended|long) periods/i,
      /standing (for )?\d+ hours/i,
      /valid driver('s)? license required/i,
      /must have (a )?valid driver('s)? license/i,
      /clean driving record/i,
      /physical demands/i,
    ],
    labelGenerator: (match) => {
      if (/driver/i.test(match)) {
        return 'Valid driver\'s license required';
      }
      if (/lift/i.test(match)) {
        const weightMatch = match.match(/(\d+)/);
        if (weightMatch) {
          return `Physical requirement: lift ${weightMatch[1]} lbs`;
        }
        return 'Physical lifting required';
      }
      if (/stand/i.test(match)) {
        return 'Extended standing required';
      }
      return 'Physical requirements apply';
    },
  },

  // Licenses/Certifications
  {
    category: 'license',
    patterns: [
      /cpa (required|license|certification)/i,
      /(rn|registered nurse) license required/i,
      /nursing license required/i,
      /bar admission required/i,
      /licensed (attorney|lawyer)/i,
      /(pmp|project management professional) (certification )?(required|preferred)/i,
      /security\+ (certification )?(required|preferred)/i,
      /cissp (certification )?(required|preferred)/i,
      /aws certified/i,
      /(certification|certified) required/i,
      /professional (license|certification) required/i,
      /state license required/i,
    ],
    labelGenerator: (match) => {
      if (/cpa/i.test(match)) return 'CPA certification required';
      if (/rn|nursing|nurse/i.test(match)) return 'Nursing license required';
      if (/bar|attorney|lawyer/i.test(match)) return 'Bar admission required';
      if (/pmp/i.test(match)) return 'PMP certification required';
      if (/security\+/i.test(match)) return 'Security+ certification required';
      if (/cissp/i.test(match)) return 'CISSP certification required';
      if (/aws/i.test(match)) return 'AWS certification required';
      return 'Professional certification required';
    },
  },

  // Degree Requirements
  {
    category: 'degree',
    patterns: [
      /bachelor('s)? (degree )?(required|in)/i,
      /bs\/ba (required|minimum)/i,
      /undergraduate degree required/i,
      /master('s)? (degree )?(required|in)/i,
      /ms\/ma (required|minimum)/i,
      /graduate degree required/i,
      /mba required/i,
      /phd (required|preferred)/i,
      /doctorate (required|preferred)/i,
      /minimum.{1,20}(bachelor|master|phd|doctorate)/i,
      /\d+ years?.{1,20}degree/i,
    ],
    labelGenerator: (match) => {
      if (/phd|doctorate/i.test(match)) return 'PhD/Doctorate required';
      if (/mba/i.test(match)) return 'MBA required';
      if (/master|ms\/ma|graduate/i.test(match)) return 'Master\'s degree required';
      return 'Bachelor\'s degree required';
    },
  },
];

/**
 * Detects knockout requirements in a job description.
 */
export function detectKnockouts(jobText: string): KnockoutItem[] {
  if (!jobText || jobText.trim().length === 0) {
    return [];
  }

  const knockouts: KnockoutItem[] = [];
  const seenLabels = new Set<string>();

  KNOCKOUT_PATTERNS.forEach(({ category, patterns, labelGenerator }) => {
    patterns.forEach((pattern) => {
      const matches = jobText.match(pattern);
      if (matches) {
        const match = matches[0];
        const label = labelGenerator(match);

        // Avoid duplicate labels
        if (!seenLabels.has(label)) {
          seenLabels.add(label);

          // Get evidence - a snippet of text around the match
          const evidence = getEvidenceSnippet(jobText, match);

          knockouts.push({
            id: crypto.randomUUID(),
            label,
            category,
            evidence,
            userConfirmed: undefined,
          });
        }
      }
    });
  });

  // Sort by category for consistent ordering
  const categoryOrder: KnockoutCategory[] = [
    'authorization',
    'degree',
    'license',
    'location',
    'schedule',
    'physical',
    'other',
  ];

  knockouts.sort((a, b) => {
    return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
  });

  return knockouts;
}

/**
 * Gets a snippet of text around the match for evidence.
 */
function getEvidenceSnippet(text: string, match: string): string {
  const matchIndex = text.toLowerCase().indexOf(match.toLowerCase());
  if (matchIndex === -1) return match;

  // Get surrounding context
  const start = Math.max(0, matchIndex - 30);
  const end = Math.min(text.length, matchIndex + match.length + 30);

  let snippet = text.slice(start, end).trim();

  // Add ellipsis if truncated
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Gets a human-readable label for a knockout category.
 */
export function getCategoryLabel(category: KnockoutCategory): string {
  switch (category) {
    case 'authorization':
      return 'Work Authorization';
    case 'location':
      return 'Location/Commute';
    case 'schedule':
      return 'Schedule/Availability';
    case 'license':
      return 'License/Certification';
    case 'degree':
      return 'Education';
    case 'physical':
      return 'Physical Requirements';
    case 'other':
    default:
      return 'Other Requirements';
  }
}

/**
 * Gets an icon name for a knockout category.
 */
export function getCategoryIcon(category: KnockoutCategory): string {
  switch (category) {
    case 'authorization':
      return 'identification';
    case 'location':
      return 'map-pin';
    case 'schedule':
      return 'clock';
    case 'license':
      return 'academic-cap';
    case 'degree':
      return 'document-text';
    case 'physical':
      return 'user';
    case 'other':
    default:
      return 'exclamation-circle';
  }
}
