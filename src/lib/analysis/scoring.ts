/**
 * Parse Health Scoring Engine
 *
 * Calculates a 0-100 Parse Health score based on resume parsability factors.
 * Score reflects how well ATS systems can extract and understand the resume.
 *
 * Based on research from ATS parsing documentation including:
 * - Sovren/Textkernel parsing architecture
 * - Oracle Taleo, Workday, Greenhouse scoring mechanisms
 * - O*NET and Lightcast taxonomy standards
 */

import { ResumeArtifact, Scores, PdfLayoutSignals } from '../types/session';
import { Finding, FindingCategory, FindingSeverity } from './findings';

/**
 * Configuration for score penalties
 */
const PENALTIES = {
  // Layout penalties (PDF-specific)
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
  missingLocation: 3,

  // Section penalties
  missingSectionHeaders: 10,
  unclearSectionStructure: 5,

  // Date format penalties
  inconsistentDateFormats: 5,
  noDateAnchors: 8,

  // General parsing penalties
  veryShortContent: 25,
  shortContent: 10,
  extractionWarnings: 5,

  // New research-based penalties
  potentialTableContent: 8,
  keywordStuffing: 10,
  noActionVerbs: 5,
};

/**
 * Standard section header patterns based on ATS research
 * These are the heuristic markers that parsers look for during segmentation
 */
const SECTION_PATTERNS = {
  experience: [
    /\b(work\s+)?experience\b/i,
    /\bwork\s+history\b/i,
    /\bemployment(\s+history)?\b/i,
    /\bprofessional\s+(experience|background|history)\b/i,
    /\bcareer\s+(history|summary)\b/i,
    /\bjob\s+history\b/i,
  ],
  education: [
    /\beducation(al)?\s*(background|history)?\b/i,
    /\bacademic\s*(background|history|credentials)?\b/i,
    /\bdegrees?\b/i,
    /\bqualifications?\b/i,
    /\bcertifications?\s*(and|&)?\s*education\b/i,
  ],
  skills: [
    /\b(technical\s+)?skills\b/i,
    /\bcore\s+competenc(y|ies)\b/i,
    /\btechnolog(y|ies)\b/i,
    /\btools?\s*(and|&)?\s*technolog(y|ies)\b/i,
    /\bproficienc(y|ies)\b/i,
    /\bexpertise\b/i,
    /\bcapabilities\b/i,
    /\bareas?\s+of\s+(expertise|knowledge)\b/i,
  ],
  summary: [
    /\b(professional\s+)?summary\b/i,
    /\bobjective\b/i,
    /\bprofile\b/i,
    /\babout\s+me\b/i,
    /\bcareer\s+objective\b/i,
    /\bpersonal\s+statement\b/i,
  ],
  projects: [
    /\bprojects?\b/i,
    /\bportfolio\b/i,
    /\bkey\s+achievements?\b/i,
    /\baccomplishments?\b/i,
  ],
  certifications: [
    /\bcertifications?\b/i,
    /\blicenses?\s*(and|&)?\s*certifications?\b/i,
    /\bprofessional\s+certifications?\b/i,
    /\bcredentials?\b/i,
  ],
};

/**
 * Action verbs that indicate strong resume content
 * Used to assess content quality
 */
const ACTION_VERBS = [
  'achieved', 'built', 'created', 'delivered', 'developed', 'designed',
  'established', 'executed', 'generated', 'implemented', 'improved',
  'increased', 'launched', 'led', 'managed', 'optimized', 'produced',
  'reduced', 'resolved', 'spearheaded', 'streamlined', 'transformed',
];

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

  // 5. Analyze date formats (temporal anchoring)
  const datePenalty = analyzeDateFormats(text, findings);
  totalPenalty += datePenalty;

  // 6. Analyze content quality
  const qualityPenalty = analyzeContentQuality(text, findings);
  totalPenalty += qualityPenalty;

  // 7. Check extraction warnings
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

  // Positive finding for good content length
  if (wordCount >= 300) {
    findings.push({
      id: 'good-content-length',
      category: 'extraction',
      severity: 'info',
      title: 'Good Content Length',
      description: `${wordCount} words extracted - sufficient detail for ATS analysis.`,
      impact: 'Your resume has enough content for thorough ATS parsing and keyword extraction.',
    });
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
        'Multi-column layouts often cause "gutter jumping" where text from adjacent columns is merged incorrectly (e.g., "Python Manager Java Engineer").',
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
        'Two-column layouts can confuse some ATS parsers. The parser may read across columns, mixing skills with job titles.',
      suggestion:
        'Consider using a single-column layout for maximum compatibility, or ensure column content is clearly separated.',
    });
    penalty += PENALTIES.twoColumnLayout;
  } else {
    findings.push({
      id: 'single-column-layout',
      category: 'layout',
      severity: 'info',
      title: 'Single-Column Layout',
      description: 'Your resume uses a single-column layout.',
      impact: 'Single-column layouts have the highest parsing accuracy across all ATS systems.',
    });
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
        'Job titles may merge with dates, skills with descriptions, creating garbled output that fails keyword matching.',
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

  // Header/Footer risk
  if (signals.headerContactRisk === 'high') {
    findings.push({
      id: 'high-header-risk',
      category: 'contact',
      severity: 'high',
      title: 'Contact Info May Be In Header/Footer',
      description: 'Important content appears to be in the document header or footer.',
      impact:
        'ATS parsers are programmed to ignore headers/footers to avoid parsing page numbers. Your contact info may be discarded.',
      suggestion:
        'Move all contact information into the main document body, not the header/footer area.',
    });
    penalty += PENALTIES.highHeaderRisk;
  } else if (signals.headerContactRisk === 'medium') {
    findings.push({
      id: 'medium-header-risk',
      category: 'contact',
      severity: 'medium',
      title: 'Some Content May Be In Header',
      description: 'Some content appears to be positioned in header regions.',
      impact: 'This content may not be extracted by all ATS systems.',
      suggestion: 'Consider moving important information lower on the page.',
    });
    penalty += PENALTIES.mediumHeaderRisk;
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
        'Your resume may contain significant content in images, graphics, text boxes, or skill bars that ATS cannot read.',
      suggestion:
        'Ensure all important content is in actual text, not images. Remove skill bar graphics and replace with text.',
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

  // Email pattern - standard format
  const emailPattern = /[\w.-]+@[\w.-]+\.\w{2,}/;
  // Phone patterns - supports multiple formats including international
  const phonePattern = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  // LinkedIn URL pattern
  const linkedInPattern = /linkedin\.com\/in\/[\w-]+/i;
  // Location pattern (City, State or City, ST)
  const locationPattern = /\b[A-Z][a-z]+,?\s*[A-Z]{2}\b|\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/;

  const hasEmail = emailPattern.test(text);
  const hasPhone = phonePattern.test(text);
  const hasLinkedIn = linkedInPattern.test(text);
  const hasLocation = locationPattern.test(text);

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
        'Add your email address in plain text in the document body (not as an image or in the PDF header/footer).',
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
        'Add your phone number in a standard format: (555) 123-4567 or 555-123-4567.',
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

  if (!hasLocation) {
    findings.push({
      id: 'missing-location',
      category: 'contact',
      severity: 'low',
      title: 'No Location Found',
      description: 'No city/state location was detected.',
      impact:
        'Some recruiters filter by location. Missing location may exclude you from local searches.',
      suggestion:
        'Add your city and state (e.g., "Orlando, FL") in your contact section.',
    });
    penalty += PENALTIES.missingLocation;
  }

  // If all essential contact info found, add a positive finding
  if (hasEmail && hasPhone) {
    findings.push({
      id: 'contact-info-complete',
      category: 'contact',
      severity: 'info',
      title: 'Essential Contact Info Found',
      description: 'Your email and phone number were successfully extracted.',
      impact: 'Recruiters can easily reach you through multiple channels.',
    });
  }

  return penalty;
}

/**
 * Analyzes section structure and adds findings.
 * Uses expanded pattern matching based on ATS research.
 */
function analyzeSectionStructure(text: string, findings: Finding[]): number {
  let penalty = 0;

  // Check for the three core sections that ATS systems look for
  const coreSections = [
    { name: 'Experience', patterns: SECTION_PATTERNS.experience },
    { name: 'Education', patterns: SECTION_PATTERNS.education },
    { name: 'Skills', patterns: SECTION_PATTERNS.skills },
  ];

  const foundSections: string[] = [];
  const missingSections: string[] = [];

  coreSections.forEach(({ name, patterns }) => {
    const found = patterns.some((pattern) => pattern.test(text));
    if (found) {
      foundSections.push(name);
    } else {
      missingSections.push(name);
    }
  });

  // Check for optional but valuable sections
  const hasSummary = SECTION_PATTERNS.summary.some((p) => p.test(text));
  const hasProjects = SECTION_PATTERNS.projects.some((p) => p.test(text));
  const hasCertifications = SECTION_PATTERNS.certifications.some((p) => p.test(text));

  if (foundSections.length === 0) {
    findings.push({
      id: 'no-section-headers',
      category: 'structure',
      severity: 'high',
      title: 'No Standard Section Headers Found',
      description:
        'Could not identify standard resume sections like Experience, Education, or Skills.',
      impact:
        'ATS systems rely on header keywords for segmentation. Without them, your entire resume may be categorized as "Unstructured" and excluded from scoring.',
      suggestion:
        'Use clear, standard section headers: "Experience" (not "My Journey"), "Education" (not "Academic Background"), "Skills" (not "What I Know").',
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
        'ATS may not properly categorize all your information. Missing sections could mean missing keyword matches.',
      suggestion: `Add a clear "${missingSections[0]}" section header if applicable to your background.`,
    });
    penalty += PENALTIES.unclearSectionStructure;
  } else {
    findings.push({
      id: 'sections-complete',
      category: 'structure',
      severity: 'info',
      title: 'All Core Sections Detected',
      description: `Found all three core sections: ${foundSections.join(', ')}.`,
      impact: 'ATS systems should be able to properly categorize and index your information.',
    });
  }

  // Bonus info for having summary
  if (hasSummary) {
    findings.push({
      id: 'has-summary',
      category: 'structure',
      severity: 'info',
      title: 'Summary/Objective Section Found',
      description: 'Your resume includes a summary or objective section.',
      impact: 'This helps recruiters quickly understand your background and career goals.',
    });
  }

  return penalty;
}

/**
 * Analyzes date formats for temporal anchoring.
 * ATS systems need consistent dates to calculate experience duration.
 */
function analyzeDateFormats(text: string, findings: Finding[]): number {
  let penalty = 0;

  // Standard date patterns ATS can parse
  const standardDatePatterns = [
    /\b\d{1,2}\/\d{4}\b/g,           // MM/YYYY
    /\b\d{1,2}-\d{4}\b/g,            // MM-YYYY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\b/gi, // Month YYYY
    /\b\d{4}\s*[-–]\s*(Present|Current)\b/gi,  // YYYY - Present
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\s*[-–]\s*(Present|Current)\b/gi,
  ];

  // Ambiguous date patterns that may cause parsing issues
  const ambiguousDatePatterns = [
    /\b(Summer|Fall|Winter|Spring)\s*\d{4}\b/gi,  // Season YYYY
    /\b\d{4}\b/g,  // Just year alone
  ];

  let standardDateCount = 0;
  let ambiguousDateCount = 0;

  standardDatePatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) standardDateCount += matches.length;
  });

  ambiguousDatePatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) ambiguousDateCount += matches.length;
  });

  // Check for "Present" or "Current" keywords indicating active employment
  const hasCurrentRole = /\b(Present|Current)\b/i.test(text);

  if (standardDateCount === 0 && ambiguousDateCount === 0) {
    findings.push({
      id: 'no-date-anchors',
      category: 'structure',
      severity: 'high',
      title: 'No Date Information Found',
      description: 'Could not detect any employment or education dates.',
      impact:
        'ATS systems calculate "Years of Experience" from dates. Without dates, you may appear to have 0 experience.',
      suggestion:
        'Add dates to your experience entries in MM/YYYY format (e.g., "06/2023 - Present").',
    });
    penalty += PENALTIES.noDateAnchors;
  } else if (standardDateCount < ambiguousDateCount) {
    findings.push({
      id: 'inconsistent-dates',
      category: 'structure',
      severity: 'medium',
      title: 'Inconsistent Date Formats',
      description: 'Found ambiguous date formats (e.g., "Summer 2023" instead of "06/2023").',
      impact:
        'ATS parsers may fail to calculate accurate experience duration from non-standard dates.',
      suggestion:
        'Use consistent MM/YYYY format for all dates (e.g., "06/2023 - 08/2023" not "Summer 2023").',
    });
    penalty += PENALTIES.inconsistentDateFormats;
  } else {
    findings.push({
      id: 'good-date-formats',
      category: 'structure',
      severity: 'info',
      title: 'Date Formats Look Good',
      description: `Found ${standardDateCount} well-formatted dates.`,
      impact: 'ATS systems should accurately calculate your experience duration.',
    });
  }

  return penalty;
}

/**
 * Analyzes content quality for potential parsing issues.
 */
function analyzeContentQuality(text: string, findings: Finding[]): number {
  let penalty = 0;
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = words.length;

  // Check for action verbs (indicator of strong resume content)
  const actionVerbCount = ACTION_VERBS.filter((verb) =>
    text.toLowerCase().includes(verb)
  ).length;

  if (wordCount > 100 && actionVerbCount === 0) {
    findings.push({
      id: 'no-action-verbs',
      category: 'structure',
      severity: 'low',
      title: 'Few Action Verbs Detected',
      description: 'Your resume may lack strong action verbs.',
      impact:
        'Action verbs (achieved, developed, implemented) help ATS and recruiters identify your accomplishments.',
      suggestion:
        'Start bullet points with action verbs: "Developed...", "Implemented...", "Led..."',
    });
    penalty += PENALTIES.noActionVerbs;
  } else if (actionVerbCount >= 5) {
    findings.push({
      id: 'good-action-verbs',
      category: 'structure',
      severity: 'info',
      title: 'Strong Action Verbs Found',
      description: `Found ${actionVerbCount} action verbs in your resume.`,
      impact: 'Good use of action verbs helps convey accomplishments clearly.',
    });
  }

  // Check for potential keyword stuffing (>5% density of any single word)
  const wordFreq: Record<string, number> = {};
  words.forEach((word) => {
    if (word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const suspiciouslyHighFreq = Object.entries(wordFreq).filter(
    ([word, count]) => count / wordCount > 0.05 && count > 5
  );

  if (suspiciouslyHighFreq.length > 0) {
    findings.push({
      id: 'keyword-stuffing',
      category: 'structure',
      severity: 'medium',
      title: 'Potential Keyword Stuffing Detected',
      description: `Some words appear unusually frequently: ${suspiciouslyHighFreq.map(([w]) => w).join(', ')}.`,
      impact:
        'ATS systems may flag resumes with abnormally high keyword density as spam.',
      suggestion:
        'Use keywords naturally within context. Avoid repeating the same terms excessively.',
    });
    penalty += PENALTIES.keywordStuffing;
  }

  // Check for very long lines (potential table content that got linearized)
  const lines = text.split('\n');
  const veryLongLines = lines.filter((line) => line.length > 200).length;

  if (veryLongLines > 3) {
    findings.push({
      id: 'potential-table-content',
      category: 'extraction',
      severity: 'medium',
      title: 'Possible Table or Complex Layout',
      description: `Found ${veryLongLines} unusually long text lines.`,
      impact:
        'This may indicate table content that was linearized, potentially scrambling dates with job titles.',
      suggestion:
        'If you used tables in your resume, consider converting to a simple list format.',
    });
    penalty += PENALTIES.potentialTableContent;
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

  if (signals.headerContactRisk === 'high') score -= 15;
  else if (signals.headerContactRisk === 'medium') score -= 8;

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
  const locationPattern = /\b[A-Z][a-z]+,?\s*[A-Z]{2}\b|\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/;

  if (!emailPattern.test(text)) score -= 40;
  if (!phonePattern.test(text)) score -= 30;
  if (!linkedInPattern.test(text)) score -= 15;
  if (!locationPattern.test(text)) score -= 10;

  return Math.max(0, score);
}

/**
 * Calculates a section structure sub-score (0-100).
 */
function calculateSectionScore(text: string): number {
  let score = 100;

  // Check core sections with expanded patterns
  const coreSectionGroups = [
    SECTION_PATTERNS.experience,
    SECTION_PATTERNS.education,
    SECTION_PATTERNS.skills,
  ];

  let foundCount = 0;
  coreSectionGroups.forEach((patterns) => {
    if (patterns.some((p) => p.test(text))) foundCount++;
  });

  if (foundCount === 0) score -= 40;
  else if (foundCount === 1) score -= 25;
  else if (foundCount === 2) score -= 10;

  // Bonus for having dates (temporal anchoring)
  const hasStandardDates = /\b\d{1,2}\/\d{4}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\b/i.test(text);
  if (!hasStandardDates) score -= 10;

  return Math.max(0, score);
}
