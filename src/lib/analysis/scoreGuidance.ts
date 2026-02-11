/**
 * Score Guidance Engine
 *
 * Pure function that maps analysis scores to prioritized "what to do next" guidance.
 * No hooks, no state — just input scores in, guidance items out.
 */

export type GuidancePriority = 'critical' | 'important' | 'suggested';

export type GuidanceActionTarget =
  | 'findings'   // Switch to overview tab / findings panel
  | 'jobmatch'   // Switch to job match tab
  | 'ai-settings' // Open BYOK key modal
  | 'pricing';    // Link to /pricing

export interface GuidanceItem {
  id: string;
  priority: GuidancePriority;
  title: string;
  description: string;
  actionLabel: string;
  actionTarget: GuidanceActionTarget;
}

export interface GuidanceInput {
  parseHealth: number;
  knockoutRisk?: 'low' | 'medium' | 'high';
  knockoutCount?: number;
  semanticMatch?: number;
  recruiterSearch?: number;
  keywordCoverage?: number;
  hasJobDescription: boolean;
  hasApiKey: boolean;
  hasAccess: boolean;
  freeTierRemaining?: number;
}

/**
 * Generates prioritized guidance items based on current analysis state.
 *
 * Rules are evaluated top-to-bottom. Earlier rules = higher priority.
 * Each rule independently decides whether to fire based on the input.
 */
export function generateGuidance(input: GuidanceInput): GuidanceItem[] {
  const items: GuidanceItem[] = [];

  // --- Critical: Fix major issues before applying ---

  if (input.parseHealth < 40) {
    items.push({
      id: 'parse-critical',
      priority: 'critical',
      title: 'Major parsing issues detected',
      description: 'ATS software will struggle to read your resume. Fix layout and formatting issues before submitting applications.',
      actionLabel: 'View issues',
      actionTarget: 'findings',
    });
  }

  if (input.knockoutRisk === 'high' && input.knockoutCount) {
    items.push({
      id: 'knockout-critical',
      priority: 'critical',
      title: `${input.knockoutCount} potential disqualifier${input.knockoutCount > 1 ? 's' : ''} found`,
      description: 'These requirements could auto-reject your application. Review them carefully before applying.',
      actionLabel: 'Review knockouts',
      actionTarget: 'jobmatch',
    });
  }

  // --- Important: Address these to improve your chances ---

  if (input.parseHealth >= 40 && input.parseHealth < 60) {
    items.push({
      id: 'parse-moderate',
      priority: 'important',
      title: 'Moderate parsing issues',
      description: 'Some parts of your resume may not parse correctly. Fix the critical findings first.',
      actionLabel: 'View findings',
      actionTarget: 'findings',
    });
  }

  if (!input.hasJobDescription && input.parseHealth >= 60) {
    items.push({
      id: 'add-jd',
      priority: 'important',
      title: 'Add a job description',
      description: 'Paste the job posting to unlock keyword matching, knockout detection, and compatibility scores.',
      actionLabel: 'Add job description',
      actionTarget: 'jobmatch',
    });
  }

  if (input.keywordCoverage !== undefined && input.keywordCoverage < 50) {
    items.push({
      id: 'keyword-low',
      priority: 'important',
      title: `Only ${input.keywordCoverage}% keyword match`,
      description: 'Your resume is missing many terms from the job description. Add relevant skills and experience.',
      actionLabel: 'See keywords',
      actionTarget: 'jobmatch',
    });
  }

  // --- Suggested: Optimize further ---

  if (
    input.parseHealth >= 60 &&
    input.hasJobDescription &&
    !input.hasApiKey &&
    !input.hasAccess
  ) {
    const freeNote =
      input.freeTierRemaining !== undefined && input.freeTierRemaining > 0
        ? ` ${input.freeTierRemaining} free ${input.freeTierRemaining === 1 ? 'analysis' : 'analyses'} remaining today.`
        : '';
    items.push({
      id: 'unlock-ai',
      priority: 'suggested',
      title: 'Get deeper AI insights',
      description: `Unlock semantic matching and AI-powered suggestions.${freeNote}`,
      actionLabel: 'Configure AI',
      actionTarget: 'ai-settings',
    });
  }

  if (input.semanticMatch !== undefined && input.semanticMatch < 60) {
    items.push({
      id: 'semantic-low',
      priority: 'suggested',
      title: 'Low conceptual alignment',
      description: 'Your experience descriptions don\'t closely match the job\'s language. Rewrite bullets to mirror the posting.',
      actionLabel: 'See match details',
      actionTarget: 'jobmatch',
    });
  }

  if (input.recruiterSearch !== undefined && input.recruiterSearch < 50) {
    items.push({
      id: 'recruiter-low',
      priority: 'suggested',
      title: 'Low searchability score',
      description: 'Recruiters searching for this role may not find you. Use industry-standard job titles and terms.',
      actionLabel: 'See search score',
      actionTarget: 'jobmatch',
    });
  }

  // --- Positive: Everything looks good ---

  if (
    input.parseHealth >= 80 &&
    items.length === 0
  ) {
    items.push({
      id: 'looking-good',
      priority: 'suggested',
      title: 'Resume is in great shape',
      description: input.hasJobDescription
        ? 'Your resume parses well and matches the job description. Fine-tune with AI for the best results.'
        : 'Your resume parses well. Add a job description to see how it matches specific roles.',
      actionLabel: input.hasJobDescription ? 'Fine-tune with AI' : 'Add job description',
      actionTarget: input.hasJobDescription ? 'ai-settings' : 'jobmatch',
    });
  }

  return items;
}
