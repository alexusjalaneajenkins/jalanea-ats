/**
 * Knockout Risk Calculator
 *
 * Assesses the risk level based on knockout requirements and user confirmations.
 */

import { KnockoutItem } from '../types/session';
import { Finding } from './findings';

/**
 * Risk level type
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Knockout risk assessment result
 */
export interface KnockoutRiskResult {
  /** Overall risk level */
  risk: RiskLevel;
  /** Explanation of the risk level */
  explanation: string;
  /** Knockout items where user doesn't meet requirements */
  blockers: KnockoutItem[];
  /** Knockout items that haven't been confirmed */
  unclear: KnockoutItem[];
  /** Knockout items where user meets requirements */
  confirmed: KnockoutItem[];
  /** Findings based on the assessment */
  findings: Finding[];
}

/**
 * Calculates knockout risk based on user confirmations.
 */
export function calculateKnockoutRisk(
  knockouts: KnockoutItem[]
): KnockoutRiskResult {
  // No knockouts = low risk
  if (knockouts.length === 0) {
    return {
      risk: 'low',
      explanation: 'No specific disqualifier requirements were detected in this job posting.',
      blockers: [],
      unclear: [],
      confirmed: [],
      findings: [
        {
          id: 'no-knockouts',
          category: 'structure',
          severity: 'info',
          title: 'No Disqualifiers Detected',
          description:
            'No hard requirements like work authorization, certifications, or location restrictions were found.',
          impact:
            'You are less likely to be auto-rejected for missing basic qualifications.',
        },
      ],
    };
  }

  // Categorize knockouts by user confirmation status
  const blockers: KnockoutItem[] = [];
  const unclear: KnockoutItem[] = [];
  const confirmed: KnockoutItem[] = [];

  knockouts.forEach((knockout) => {
    if (knockout.userConfirmed === true) {
      confirmed.push(knockout);
    } else if (knockout.userConfirmed === false) {
      blockers.push(knockout);
    } else {
      unclear.push(knockout);
    }
  });

  // Calculate risk level
  let risk: RiskLevel;
  let explanation: string;

  if (blockers.length > 0) {
    // Any blocker = high risk
    risk = 'high';
    explanation = `You indicated you don't meet ${blockers.length} requirement(s). This may disqualify you from consideration.`;
  } else if (unclear.length >= 3) {
    // Many unconfirmed = high risk
    risk = 'high';
    explanation = `${unclear.length} requirements haven't been confirmed. Please review them to understand your eligibility.`;
  } else if (unclear.length > 0) {
    // Some unconfirmed = medium risk
    risk = 'medium';
    explanation = `${unclear.length} requirement(s) still need your confirmation. Review them to ensure you qualify.`;
  } else {
    // All confirmed = low risk
    risk = 'low';
    explanation = 'You confirmed that you meet all detected requirements.';
  }

  // Generate findings
  const findings: Finding[] = [];

  // Overall risk finding
  if (risk === 'high') {
    findings.push({
      id: 'knockout-risk-high',
      category: 'structure',
      severity: 'critical',
      title: 'High Disqualification Risk',
      description: explanation,
      impact:
        'Your application may be automatically rejected before reaching a human reviewer.',
      suggestion:
        blockers.length > 0
          ? 'Consider whether this role is a good match given the requirements you cannot meet.'
          : 'Please confirm your eligibility for each requirement below.',
    });
  } else if (risk === 'medium') {
    findings.push({
      id: 'knockout-risk-medium',
      category: 'structure',
      severity: 'medium',
      title: 'Unconfirmed Requirements',
      description: explanation,
      impact:
        'You should verify you meet these requirements before applying.',
      suggestion:
        'Review each requirement and confirm whether you qualify.',
    });
  } else {
    findings.push({
      id: 'knockout-risk-low',
      category: 'structure',
      severity: 'info',
      title: 'Requirements Confirmed',
      description: explanation,
      impact:
        'You are unlikely to be auto-rejected for missing basic qualifications.',
    });
  }

  // Individual blocker findings
  blockers.forEach((blocker) => {
    findings.push({
      id: `blocker-${blocker.id}`,
      category: 'structure',
      severity: 'critical',
      title: `Potential Disqualifier: ${blocker.label}`,
      description: `You indicated you don't meet this requirement: "${blocker.evidence}"`,
      impact:
        'This requirement is typically a hard filter in ATS systems.',
      suggestion:
        'If this is accurate, you may want to reconsider applying or address this in your cover letter.',
    });
  });

  return {
    risk,
    explanation,
    blockers,
    unclear,
    confirmed,
    findings,
  };
}

/**
 * Gets a color class for the risk level.
 */
export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Gets a background color class for the risk level.
 */
export function getRiskBgColor(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return 'bg-green-100';
    case 'medium':
      return 'bg-yellow-100';
    case 'high':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
}

/**
 * Gets a border color class for the risk level.
 */
export function getRiskBorderColor(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return 'border-green-300';
    case 'medium':
      return 'border-yellow-300';
    case 'high':
      return 'border-red-300';
    default:
      return 'border-gray-300';
  }
}

/**
 * Gets a label for the risk level.
 */
export function getRiskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return 'Low Risk';
    case 'medium':
      return 'Medium Risk';
    case 'high':
      return 'High Risk';
    default:
      return 'Unknown';
  }
}
