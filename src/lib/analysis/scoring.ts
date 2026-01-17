/**
 * Parse Health Scoring Engine
 *
 * Calculates a 0-100 Parse Health score based on resume parsability factors.
 * Score reflects how well ATS systems can extract and understand the resume.
 */

import { ResumeArtifact, Scores, PdfLayoutSignals } from '../types/session';
import { Finding, FindingCategory, FindingSeverity } from './findings';

/**
 * Configuration for score penalties
 */
const PENALTIES = {
  // Layout penalties
  twoColumnLayout: 15,
  threeColumnLayout: 25,
  highColumnMergeRisk: 20,
  mediumColumnMergeRisk: 10,

  // Header/Footer penalties
  highHeaderRisk: 15,
  mediumHeaderRisk: 8,

  // Text density penalties
  lowTextDensity: 20,
  mediumTextDensity: 5,

  // Contact info penalties
  missingEmail: 15,
  missingPhone: 10,
  missingLinkedIn: 5,

  // Section penalties
  missingSectionHeaders: 10,
  unclearSectionStructure: 5,

  // General parsing penalties
  veryShortContent: 25,
  shortContent: 10,
  extractionWarnings: 5,
};

/**
 * Analyzes a resume artifact and generates scores and findings.
 */
export function analyzeResume(artifact: ResumeArtifact): {
  scores: Scores;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  let totalPenalty = 0;

  const text = artifact.extractedText;
  const meta = artifact.extractionMeta;

  // 1. Analyze content length
  const contentPenalty = analyzeContentLength(text, findings);
  totalPenalty += contentPenalty;

  // 2. Analyze PDF-specific layout signals
  if (artifact.fileType === 'pdf' && meta.pdfSignals) {
    const layoutPenalty = analyzeLayoutSignals(meta.pdfSignals, findings);
    totalPenalty += layoutPenalty;
  }

  // 3. Analyze contact information
  const contactPenalty = analyzeContactInfo(text, findings);
  totalPenalty += contactPenalty;

  // 4. Analyze section structure
  const sectionPenalty = analyzeSectionStructure(text, findings);
  totalPenalty += sectionPenalty;

  // 5. Check extraction warnings
  if (meta.extractionWarnings && meta.extractionWarnings.length > 0) {
    meta.extractionWarnings.forEach((warning) => {
      findings.push({
        id: `extraction-warning-${findings.length}`,
        category: 'extraction',
        severity: 'medium',
        title: 'Extraction Warning',
        description: warning,
        impact: 'Some content may not have been extracted correctly.',
      });
      totalPenalty += PENALTIES.extractionWarnings;
    });
  }

  // Calculate final score (minimum 0)
  const parseHealth = Math.max(0, 100 - totalPenalty);

  // Calculate sub-scores
  const scores: Scores = {
    parseHealth,
    layoutScore: calculateLayoutScore(meta.pdfSignals),
    contactScore: calculateContactScore(text),
    sectionScore: calculateSectionScore(text),
  };

  // Sort findings by severity
  findings.sort((a, b) => {
    const severityOrder: Record<FindingSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      info: 4,
    };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return { scores, findings };
}

/**
 * Analyzes content length and adds findings.
 */
function analyzeContentLength(text: string, findings: Finding[]): number {
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

  if (charCount < 200) {
    findings.push({
      id: 'very-short-content',
      category: 'extraction',
      severity: 'critical',
      title: 'Very Little Text Extracted',
      description: `Only ${charCount} characters were extracted from your resume.`,
      impact:
        'ATS systems may not be able to parse your resume at all. This often indicates an image-based or scanned PDF.',
      suggestion:
        'Ensure your resume is a text-based PDF (created from Word or similar), not a scanned image. Try re-exporting from your original document.',
    });
    return PENALTIES.veryShortContent;
  }

  if (charCount < 500 || wordCount < 100) {
    findings.push({
      id: 'short-content',
      category: 'extraction',
      severity: 'high',
      title: 'Limited Text Content',
      description: `Only ${wordCount} words were extracted from your resume.`,
      impact:
        'Your resume may appear sparse to ATS systems, potentially missing key qualifications.',
      suggestion:
        'Check that all your experience and skills are being extracted. Consider if content is in images or graphics that cannot be parsed.',
    });
    return PENALTIES.shortContent;
  }

  return 0;
}

/**
 * Analyzes PDF layout signals and adds findings.
 */
function analyzeLayoutSignals(signals: PdfLayoutSignals, findings: Finding[]): number {
  let penalty = 0;

  // Column analysis
  if (signals.estimatedColumns === 3) {
    findings.push({
      id: 'three-column-layout',
      category: 'layout',
      severity: 'high',
      title: 'Three-Column Layout Detected',
      description: 'Your resume appears to use a three-column layout.',
      impact:
        'Multi-column layouts often cause text to be merged incorrectly, mixing content from different sections.',
      suggestion:
        'Convert to a single-column layout for best ATS compatibility. Move sidebar content into the main body.',
    });
    penalty += PENALTIES.threeColumnLayout;
  } else if (signals.estimatedColumns === 2) {
    findings.push({
      id: 'two-column-layout',
      category: 'layout',
      severity: 'medium',
      title: 'Two-Column Layout Detected',
      description: 'Your resume appears to use a two-column layout.',
      impact:
        'Two-column layouts can confuse some ATS parsers, potentially mixing content from left and right columns.',
      suggestion:
        'Consider using a single-column layout for maximum compatibility, or ensure column content is clearly separated.',
    });
    penalty += PENALTIES.twoColumnLayout;
  }

  // Column merge risk
  if (signals.columnMergeRisk === 'high') {
    findings.push({
      id: 'high-column-merge-risk',
      category: 'layout',
      severity: 'high',
      title: 'High Risk of Text Merging',
      description: 'The layout has a high risk of text from different sections being merged.',
      impact:
        'Job titles may merge with dates, skills with descriptions, creating garbled output.',
      suggestion:
        'Use clear visual separation between columns, or restructure to a single-column format.',
    });
    penalty += PENALTIES.highColumnMergeRisk;
  } else if (signals.columnMergeRisk === 'medium') {
    findings.push({
      id: 'medium-column-merge-risk',
      category: 'layout',
      severity: 'medium',
      title: 'Moderate Risk of Text Merging',
      description: 'Some text elements may be merged incorrectly during parsing.',
      impact: 'Certain sections may not parse cleanly in all ATS systems.',
      suggestion: 'Increase spacing between layout elements or simplify the design.',
    });
    penalty += PENALTIES.mediumColumnMergeRisk;
  }

  // Text density
  if (signals.textDensity === 'low') {
    findings.push({
      id: 'low-text-density',
      category: 'extraction',
      severity: 'high',
      title: 'Low Text Density',
      description: 'Very little text relative to file size was extracted.',
      impact:
        'Your resume may contain significant content in images, graphics, or embedded objects that ATS cannot read.',
      suggestion:
        'Ensure all important content is in actual text, not images. Avoid using graphics for headers or skill charts.',
    });
    penalty += PENALTIES.lowTextDensity;
  } else if (signals.textDensity === 'medium') {
    findings.push({
      id: 'medium-text-density',
      category: 'extraction',
      severity: 'low',
      title: 'Moderate Text Density',
      description: 'Some content may be in non-text elements.',
      impact: 'Minor content might be missed by ATS parsers.',
      suggestion: 'Review for any important text in images or graphics.',
    });
    penalty += PENALTIES.mediumTextDensity;
  }

  return penalty;
}

/**
 * Analyzes contact information and adds findings.
 */
function analyzeContactInfo(text: string, findings: Finding[]): number {
  let penalty = 0;

  const emailPattern = /[\w.-]+@[\w.-]+\.\w{2,}/;
  const phonePattern = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const linkedInPattern = /linkedin\.com\/in\/[\w-]+/i;

  const hasEmail = emailPattern.test(text);
  const hasPhone = phonePattern.test(text);
  const hasLinkedIn = linkedInPattern.test(text);

  if (!hasEmail) {
    findings.push({
      id: 'missing-email',
      category: 'contact',
      severity: 'critical',
      title: 'No Email Address Found',
      description: 'No email address was detected in the extracted text.',
      impact:
        'Recruiters cannot contact you. ATS systems may flag your application as incomplete.',
      suggestion:
        'Add your email address in plain text (not as an image or in the PDF header/footer).',
    });
    penalty += PENALTIES.missingEmail;
  }

  if (!hasPhone) {
    findings.push({
      id: 'missing-phone',
      category: 'contact',
      severity: 'high',
      title: 'No Phone Number Found',
      description: 'No phone number was detected in the extracted text.',
      impact:
        'Recruiters may prefer to call for initial screening. Some ATS systems require a phone number.',
      suggestion:
        'Add your phone number in a standard format like (555) 123-4567 or 555-123-4567.',
    });
    penalty += PENALTIES.missingPhone;
  }

  if (!hasLinkedIn) {
    findings.push({
      id: 'missing-linkedin',
      category: 'contact',
      severity: 'low',
      title: 'No LinkedIn Profile Found',
      description: 'No LinkedIn URL was detected in the extracted text.',
      impact:
        'Recruiters often check LinkedIn profiles. Having your URL makes it easier for them.',
      suggestion:
        'Consider adding your LinkedIn profile URL (e.g., linkedin.com/in/yourname).',
    });
    penalty += PENALTIES.missingLinkedIn;
  }

  // If all contact info found, add a positive finding
  if (hasEmail && hasPhone) {
    findings.push({
      id: 'contact-info-complete',
      category: 'contact',
      severity: 'info',
      title: 'Contact Information Complete',
      description: 'Your email and phone number were successfully extracted.',
      impact: 'Recruiters can easily reach you through multiple channels.',
    });
  }

  return penalty;
}

/**
 * Analyzes section structure and adds findings.
 */
function analyzeSectionStructure(text: string, findings: Finding[]): number {
  let penalty = 0;

  // Common section headers to look for
  const sectionPatterns = [
    { name: 'Experience', patterns: [/\bexperience\b/i, /\bwork history\b/i, /\bemployment\b/i] },
    { name: 'Education', patterns: [/\beducation\b/i, /\bacademic\b/i, /\bdegree\b/i] },
    { name: 'Skills', patterns: [/\bskills\b/i, /\btechnical skills\b/i, /\bcompetencies\b/i] },
  ];

  const foundSections: string[] = [];
  const missingSections: string[] = [];

  sectionPatterns.forEach(({ name, patterns }) => {
    const found = patterns.some((pattern) => pattern.test(text));
    if (found) {
      foundSections.push(name);
    } else {
      missingSections.push(name);
    }
  });

  if (foundSections.length === 0) {
    findings.push({
      id: 'no-section-headers',
      category: 'structure',
      severity: 'high',
      title: 'No Standard Section Headers Found',
      description:
        'Could not identify standard resume sections like Experience, Education, or Skills.',
      impact:
        'ATS systems may struggle to categorize your information correctly, potentially missing key qualifications.',
      suggestion:
        'Use clear, standard section headers like "Experience", "Education", and "Skills" to help ATS parse your resume.',
    });
    penalty += PENALTIES.missingSectionHeaders;
  } else if (missingSections.length > 0) {
    findings.push({
      id: 'missing-some-sections',
      category: 'structure',
      severity: 'medium',
      title: 'Some Standard Sections Not Detected',
      description: `Found: ${foundSections.join(', ')}. Not found: ${missingSections.join(', ')}.`,
      impact:
        'ATS may not properly categorize all your information. Missing sections could mean missing keywords.',
      suggestion: `Consider adding clear "${missingSections[0]}" section if applicable to your background.`,
    });
    penalty += PENALTIES.unclearSectionStructure;
  } else {
    findings.push({
      id: 'sections-complete',
      category: 'structure',
      severity: 'info',
      title: 'Standard Sections Detected',
      description: `Found sections: ${foundSections.join(', ')}.`,
      impact: 'ATS systems should be able to categorize your information correctly.',
    });
  }

  return penalty;
}

/**
 * Calculates a layout sub-score (0-100).
 */
function calculateLayoutScore(signals?: PdfLayoutSignals): number {
  if (!signals) return 100; // DOCX files get full layout score

  let score = 100;

  if (signals.estimatedColumns === 3) score -= 30;
  else if (signals.estimatedColumns === 2) score -= 15;

  if (signals.columnMergeRisk === 'high') score -= 25;
  else if (signals.columnMergeRisk === 'medium') score -= 10;

  if (signals.textDensity === 'low') score -= 25;
  else if (signals.textDensity === 'medium') score -= 10;

  return Math.max(0, score);
}

/**
 * Calculates a contact info sub-score (0-100).
 */
function calculateContactScore(text: string): number {
  let score = 100;

  const emailPattern = /[\w.-]+@[\w.-]+\.\w{2,}/;
  const phonePattern = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const linkedInPattern = /linkedin\.com\/in\/[\w-]+/i;

  if (!emailPattern.test(text)) score -= 40;
  if (!phonePattern.test(text)) score -= 30;
  if (!linkedInPattern.test(text)) score -= 15;

  return Math.max(0, score);
}

/**
 * Calculates a section structure sub-score (0-100).
 */
function calculateSectionScore(text: string): number {
  let score = 100;

  const sectionPatterns = [
    [/\bexperience\b/i, /\bwork history\b/i, /\bemployment\b/i],
    [/\beducation\b/i, /\bacademic\b/i],
    [/\bskills\b/i, /\btechnical skills\b/i, /\bcompetencies\b/i],
  ];

  let foundCount = 0;
  sectionPatterns.forEach((patterns) => {
    if (patterns.some((p) => p.test(text))) foundCount++;
  });

  if (foundCount === 0) score -= 40;
  else if (foundCount === 1) score -= 25;
  else if (foundCount === 2) score -= 10;

  return Math.max(0, score);
}
