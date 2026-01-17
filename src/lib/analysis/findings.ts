/**
 * Finding Types and Utilities
 *
 * Defines the structure for analysis findings/recommendations.
 */

/**
 * Categories of findings
 */
export type FindingCategory =
  | 'extraction' // Text extraction issues
  | 'layout' // Layout/column issues
  | 'contact' // Contact information
  | 'structure' // Section structure
  | 'keyword' // Keyword-related (for job matching)
  | 'formatting'; // Formatting issues

/**
 * Severity levels for findings
 */
export type FindingSeverity =
  | 'critical' // Blocks ATS parsing
  | 'high' // Significantly impacts parsing
  | 'medium' // May cause issues
  | 'low' // Minor optimization
  | 'info'; // Informational/positive

/**
 * A single finding from the analysis
 */
export interface Finding {
  /** Unique identifier for the finding */
  id: string;
  /** Category of the finding */
  category: FindingCategory;
  /** Severity level */
  severity: FindingSeverity;
  /** Short title for the finding */
  title: string;
  /** Detailed description of what was found */
  description: string;
  /** Impact on ATS parsing/job search */
  impact: string;
  /** Suggestion for how to fix (optional for info findings) */
  suggestion?: string;
  /** Location in the document if applicable */
  location?: {
    page?: number;
    section?: string;
  };
}

/**
 * Gets a human-readable label for a severity level.
 */
export function getSeverityLabel(severity: FindingSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High Impact';
    case 'medium':
      return 'Medium Impact';
    case 'low':
      return 'Low Impact';
    case 'info':
      return 'Good';
    default:
      return 'Unknown';
  }
}

/**
 * Gets a color class for a severity level.
 */
export function getSeverityColor(severity: FindingSeverity): {
  bg: string;
  text: string;
  border: string;
} {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
      };
    case 'high':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
      };
    case 'low':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
      };
    case 'info':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
      };
  }
}

/**
 * Gets a category label.
 */
export function getCategoryLabel(category: FindingCategory): string {
  switch (category) {
    case 'extraction':
      return 'Text Extraction';
    case 'layout':
      return 'Layout';
    case 'contact':
      return 'Contact Info';
    case 'structure':
      return 'Structure';
    case 'keyword':
      return 'Keywords';
    case 'formatting':
      return 'Formatting';
    default:
      return 'Other';
  }
}

/**
 * Gets an icon name for a category.
 */
export function getCategoryIcon(category: FindingCategory): string {
  switch (category) {
    case 'extraction':
      return 'document-text';
    case 'layout':
      return 'view-columns';
    case 'contact':
      return 'user';
    case 'structure':
      return 'bars-3';
    case 'keyword':
      return 'key';
    case 'formatting':
      return 'paint-brush';
    default:
      return 'information-circle';
  }
}

/**
 * Filters findings by severity.
 */
export function filterFindingsBySeverity(
  findings: Finding[],
  severities: FindingSeverity[]
): Finding[] {
  return findings.filter((f) => severities.includes(f.severity));
}

/**
 * Groups findings by category.
 */
export function groupFindingsByCategory(
  findings: Finding[]
): Map<FindingCategory, Finding[]> {
  const groups = new Map<FindingCategory, Finding[]>();

  findings.forEach((finding) => {
    if (!groups.has(finding.category)) {
      groups.set(finding.category, []);
    }
    groups.get(finding.category)!.push(finding);
  });

  return groups;
}

/**
 * Counts findings by severity.
 */
export function countFindingsBySeverity(
  findings: Finding[]
): Record<FindingSeverity, number> {
  const counts: Record<FindingSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  findings.forEach((f) => {
    counts[f.severity]++;
  });

  return counts;
}
