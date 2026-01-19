/**
 * Semantic Match Analysis Module
 *
 * Calculates semantic alignment between resume and job description
 * using embeddings and LLM analysis.
 *
 * Sub-scores:
 * - Skills Match (35%): Technical and soft skills alignment
 * - Experience Fit (25%): Seniority level and years alignment
 * - Domain Relevance (25%): Industry and function match
 * - Role Alignment (15%): Responsibilities overlap
 *
 * Simulates: Workday HiredScore, iCIMS Role Fit, Taleo ACE
 */

import { LlmConfig, fetchWithRetry } from '../llm/types';
import { calculateSemanticSimilarity, generateEmbedding, cosineSimilarity } from '../llm/embeddings';
import { geminiProvider } from '../llm/gemini';

// ============================================================================
// Types
// ============================================================================

export interface SemanticMatchResult {
  /** Overall semantic match score (0-100) */
  score: number;
  /** Whether the analysis was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Individual sub-scores */
  subScores: {
    skillsMatch: SubScore;
    experienceFit: SubScore;
    domainRelevance: SubScore;
    roleAlignment: SubScore;
  };
  /** AI-generated analysis summary */
  analysis: {
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    summary: string;
  };
  /** Token usage for cost tracking */
  usage?: {
    embeddingTokens: number;
    analysisTokens: number;
    totalCost: number;
  };
}

export interface SubScore {
  /** Score value (0-100) */
  score: number;
  /** Weight in overall calculation */
  weight: number;
  /** Brief explanation */
  explanation: string;
  /** Key findings */
  highlights: string[];
}

// Sub-score weights
const WEIGHTS = {
  skillsMatch: 0.35,
  experienceFit: 0.25,
  domainRelevance: 0.25,
  roleAlignment: 0.15,
};

// ============================================================================
// Main Function
// ============================================================================

/**
 * Calculate semantic match score between resume and job description
 */
export async function calculateSemanticMatch(
  resumeText: string,
  jobDescription: string,
  config: LlmConfig
): Promise<SemanticMatchResult> {
  // Validate config
  if (!config.hasConsented) {
    return createErrorResult('User consent required for AI features');
  }

  if (!config.apiKey) {
    return createErrorResult('API key not configured');
  }

  try {
    // Step 1: Calculate overall embedding similarity
    const overallSimilarity = await calculateSemanticSimilarity(
      resumeText,
      jobDescription,
      config
    );

    // Step 2: Extract sections from JD for granular analysis
    const jdSections = extractJDSections(jobDescription);
    const resumeSections = extractResumeSections(resumeText);

    // Step 3: Calculate sub-scores using embeddings
    const [skillsMatch, experienceFit, domainRelevance, roleAlignment] = await Promise.all([
      calculateSkillsMatch(resumeText, resumeSections, jdSections, config),
      calculateExperienceFit(resumeText, resumeSections, jdSections, config),
      calculateDomainRelevance(resumeText, resumeSections, jdSections, config),
      calculateRoleAlignment(resumeText, resumeSections, jdSections, config),
    ]);

    // Step 4: Get AI analysis using LLM
    const analysis = await getAIAnalysis(resumeText, jobDescription, config);

    // Step 5: Calculate weighted overall score
    const overallScore = Math.round(
      skillsMatch.score * WEIGHTS.skillsMatch +
      experienceFit.score * WEIGHTS.experienceFit +
      domainRelevance.score * WEIGHTS.domainRelevance +
      roleAlignment.score * WEIGHTS.roleAlignment
    );

    // Blend with embedding similarity for more accuracy
    const embeddingSimilarityScore = overallSimilarity.success && overallSimilarity.similarity
      ? Math.round(overallSimilarity.similarity * 100)
      : overallScore;

    // 70% sub-score weighted, 30% raw embedding similarity
    const finalScore = Math.round(overallScore * 0.7 + embeddingSimilarityScore * 0.3);

    return {
      score: Math.min(100, Math.max(0, finalScore)),
      success: true,
      subScores: {
        skillsMatch,
        experienceFit,
        domainRelevance,
        roleAlignment,
      },
      analysis,
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : 'Unknown error during semantic analysis'
    );
  }
}

// ============================================================================
// Section Extraction
// ============================================================================

interface JDSections {
  requirements: string;
  responsibilities: string;
  qualifications: string;
  about: string;
  full: string;
}

interface ResumeSections {
  skills: string;
  experience: string;
  education: string;
  full: string;
}

function extractJDSections(jd: string): JDSections {
  const lower = jd.toLowerCase();

  // Find requirements section
  const reqPatterns = [
    /requirements?:?\s*([\s\S]*?)(?=responsibilities|qualifications|about|benefits|$)/i,
    /what you(?:'ll)? need:?\s*([\s\S]*?)(?=what you|about|$)/i,
    /must have:?\s*([\s\S]*?)(?=nice to have|responsibilities|$)/i,
  ];

  let requirements = '';
  for (const pattern of reqPatterns) {
    const match = jd.match(pattern);
    if (match) {
      requirements = match[1].trim();
      break;
    }
  }

  // Find responsibilities section
  const respPatterns = [
    /responsibilities:?\s*([\s\S]*?)(?=requirements|qualifications|about|$)/i,
    /what you(?:'ll)? do:?\s*([\s\S]*?)(?=what you|requirements|$)/i,
    /duties:?\s*([\s\S]*?)(?=requirements|qualifications|$)/i,
  ];

  let responsibilities = '';
  for (const pattern of respPatterns) {
    const match = jd.match(pattern);
    if (match) {
      responsibilities = match[1].trim();
      break;
    }
  }

  // Find qualifications section
  const qualPatterns = [
    /qualifications?:?\s*([\s\S]*?)(?=responsibilities|requirements|about|$)/i,
    /preferred:?\s*([\s\S]*?)(?=requirements|about|$)/i,
  ];

  let qualifications = '';
  for (const pattern of qualPatterns) {
    const match = jd.match(pattern);
    if (match) {
      qualifications = match[1].trim();
      break;
    }
  }

  // Find about section
  const aboutPatterns = [
    /about (?:the )?(?:role|position|job):?\s*([\s\S]*?)(?=requirements|responsibilities|$)/i,
    /overview:?\s*([\s\S]*?)(?=requirements|responsibilities|$)/i,
  ];

  let about = '';
  for (const pattern of aboutPatterns) {
    const match = jd.match(pattern);
    if (match) {
      about = match[1].trim();
      break;
    }
  }

  return {
    requirements: requirements || jd.slice(0, 2000),
    responsibilities: responsibilities || jd.slice(0, 2000),
    qualifications: qualifications || '',
    about: about || '',
    full: jd,
  };
}

function extractResumeSections(resume: string): ResumeSections {
  // Find skills section
  const skillsPatterns = [
    /skills?:?\s*([\s\S]*?)(?=experience|education|projects|$)/i,
    /technical skills?:?\s*([\s\S]*?)(?=experience|education|$)/i,
    /core competenc(?:y|ies):?\s*([\s\S]*?)(?=experience|education|$)/i,
  ];

  let skills = '';
  for (const pattern of skillsPatterns) {
    const match = resume.match(pattern);
    if (match) {
      skills = match[1].trim();
      break;
    }
  }

  // Find experience section
  const expPatterns = [
    /(?:work )?experience:?\s*([\s\S]*?)(?=education|skills|projects|$)/i,
    /employment(?: history)?:?\s*([\s\S]*?)(?=education|skills|$)/i,
    /professional experience:?\s*([\s\S]*?)(?=education|skills|$)/i,
  ];

  let experience = '';
  for (const pattern of expPatterns) {
    const match = resume.match(pattern);
    if (match) {
      experience = match[1].trim();
      break;
    }
  }

  // Find education section
  const eduPatterns = [
    /education:?\s*([\s\S]*?)(?=experience|skills|projects|$)/i,
    /academic background:?\s*([\s\S]*?)(?=experience|skills|$)/i,
  ];

  let education = '';
  for (const pattern of eduPatterns) {
    const match = resume.match(pattern);
    if (match) {
      education = match[1].trim();
      break;
    }
  }

  return {
    skills: skills || resume.slice(0, 2000),
    experience: experience || resume.slice(0, 2000),
    education: education || '',
    full: resume,
  };
}

// ============================================================================
// Sub-Score Calculations
// ============================================================================

async function calculateSkillsMatch(
  resumeText: string,
  resumeSections: ResumeSections,
  jdSections: JDSections,
  config: LlmConfig
): Promise<SubScore> {
  // Compare resume skills with JD requirements
  const skillsText = resumeSections.skills || resumeText;
  const requirementsText = jdSections.requirements || jdSections.full;

  const similarity = await calculateSemanticSimilarity(skillsText, requirementsText, config);

  const score = similarity.success && similarity.similarity
    ? Math.round(similarity.similarity * 100)
    : 50; // Default to neutral if embedding fails

  // Extract highlights based on score
  const highlights = getSkillsHighlights(score, resumeText, jdSections);

  return {
    score,
    weight: WEIGHTS.skillsMatch,
    explanation: getSkillsExplanation(score),
    highlights,
  };
}

async function calculateExperienceFit(
  resumeText: string,
  resumeSections: ResumeSections,
  jdSections: JDSections,
  config: LlmConfig
): Promise<SubScore> {
  // Compare resume experience with JD responsibilities
  const experienceText = resumeSections.experience || resumeText;
  const responsibilitiesText = jdSections.responsibilities || jdSections.full;

  const similarity = await calculateSemanticSimilarity(experienceText, responsibilitiesText, config);

  // Also check for years of experience
  const yearsMatch = checkYearsOfExperience(resumeText, jdSections.full);

  const embeddingScore = similarity.success && similarity.similarity
    ? Math.round(similarity.similarity * 100)
    : 50;

  // Blend embedding score with years match
  const score = Math.round(embeddingScore * 0.7 + yearsMatch * 0.3);

  const highlights = getExperienceHighlights(score, resumeText, jdSections);

  return {
    score,
    weight: WEIGHTS.experienceFit,
    explanation: getExperienceExplanation(score),
    highlights,
  };
}

async function calculateDomainRelevance(
  resumeText: string,
  resumeSections: ResumeSections,
  jdSections: JDSections,
  config: LlmConfig
): Promise<SubScore> {
  // Compare overall domain/industry alignment
  const aboutText = jdSections.about || jdSections.full.slice(0, 1000);

  const similarity = await calculateSemanticSimilarity(resumeText, aboutText, config);

  // Also check for industry keywords
  const industryMatch = checkIndustryKeywords(resumeText, jdSections.full);

  const embeddingScore = similarity.success && similarity.similarity
    ? Math.round(similarity.similarity * 100)
    : 50;

  const score = Math.round(embeddingScore * 0.6 + industryMatch * 0.4);

  const highlights = getDomainHighlights(score, resumeText, jdSections);

  return {
    score,
    weight: WEIGHTS.domainRelevance,
    explanation: getDomainExplanation(score),
    highlights,
  };
}

async function calculateRoleAlignment(
  resumeText: string,
  resumeSections: ResumeSections,
  jdSections: JDSections,
  config: LlmConfig
): Promise<SubScore> {
  // Compare title and responsibilities alignment
  const responsibilitiesText = jdSections.responsibilities || jdSections.full;

  const similarity = await calculateSemanticSimilarity(resumeText, responsibilitiesText, config);

  // Check title alignment
  const titleMatch = checkTitleAlignment(resumeText, jdSections.full);

  const embeddingScore = similarity.success && similarity.similarity
    ? Math.round(similarity.similarity * 100)
    : 50;

  const score = Math.round(embeddingScore * 0.6 + titleMatch * 0.4);

  const highlights = getRoleHighlights(score, resumeText, jdSections);

  return {
    score,
    weight: WEIGHTS.roleAlignment,
    explanation: getRoleExplanation(score),
    highlights,
  };
}

// ============================================================================
// Helper Functions for Sub-Scores
// ============================================================================

function checkYearsOfExperience(resumeText: string, jdText: string): number {
  // Extract years required from JD
  const yearsPattern = /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)?/gi;
  const jdMatches = [...jdText.matchAll(yearsPattern)];
  const requiredYears = jdMatches.length > 0
    ? Math.max(...jdMatches.map(m => parseInt(m[1])))
    : 0;

  if (requiredYears === 0) return 80; // No requirement specified

  // Estimate years from resume (count job entries and dates)
  const datePatterns = [
    /20\d{2}\s*[-–]\s*(?:20\d{2}|present|current)/gi,
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*20\d{2}/gi,
  ];

  let estimatedYears = 0;
  for (const pattern of datePatterns) {
    const matches = resumeText.match(pattern);
    if (matches) {
      estimatedYears = Math.max(estimatedYears, Math.ceil(matches.length / 2));
    }
  }

  if (estimatedYears >= requiredYears) return 100;
  if (estimatedYears >= requiredYears * 0.75) return 80;
  if (estimatedYears >= requiredYears * 0.5) return 60;
  return 40;
}

function checkIndustryKeywords(resumeText: string, jdText: string): number {
  const industries = [
    'healthcare', 'fintech', 'finance', 'banking', 'insurance',
    'e-commerce', 'retail', 'saas', 'enterprise', 'startup',
    'b2b', 'b2c', 'manufacturing', 'logistics', 'education',
    'media', 'entertainment', 'gaming', 'automotive', 'aerospace',
    'real estate', 'hospitality', 'travel', 'food', 'agriculture',
  ];

  const resumeLower = resumeText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  // Find industries mentioned in JD
  const jdIndustries = industries.filter(ind => jdLower.includes(ind));
  if (jdIndustries.length === 0) return 70; // Generic role

  // Check if resume mentions same industries
  const matchedIndustries = jdIndustries.filter(ind => resumeLower.includes(ind));
  const matchRatio = matchedIndustries.length / jdIndustries.length;

  return Math.round(50 + matchRatio * 50);
}

function checkTitleAlignment(resumeText: string, jdText: string): number {
  // Extract job title from JD (usually in first 200 chars)
  const jdTitleSection = jdText.slice(0, 300).toLowerCase();

  // Common title patterns
  const titles = [
    'software engineer', 'developer', 'frontend', 'backend', 'full stack',
    'data scientist', 'data analyst', 'machine learning', 'ml engineer',
    'product manager', 'project manager', 'program manager',
    'designer', 'ux', 'ui', 'graphic', 'visual',
    'marketing', 'sales', 'account', 'customer success',
    'devops', 'sre', 'platform', 'infrastructure',
    'security', 'qa', 'test', 'quality',
    'manager', 'director', 'lead', 'senior', 'staff', 'principal',
    'intern', 'junior', 'associate', 'entry level',
  ];

  const resumeLower = resumeText.toLowerCase();

  // Find titles in JD
  const jdTitles = titles.filter(t => jdTitleSection.includes(t));
  if (jdTitles.length === 0) return 60;

  // Check resume for matching titles
  const matchedTitles = jdTitles.filter(t => resumeLower.includes(t));
  const matchRatio = matchedTitles.length / jdTitles.length;

  return Math.round(40 + matchRatio * 60);
}

// ============================================================================
// Explanation Generators
// ============================================================================

function getSkillsExplanation(score: number): string {
  if (score >= 80) return 'Strong skills alignment with job requirements';
  if (score >= 60) return 'Good skills match with some gaps';
  if (score >= 40) return 'Moderate skills overlap';
  return 'Limited skills alignment detected';
}

function getExperienceExplanation(score: number): string {
  if (score >= 80) return 'Experience closely matches role requirements';
  if (score >= 60) return 'Relevant experience with some differences';
  if (score >= 40) return 'Some transferable experience';
  return 'Experience may require significant adaptation';
}

function getDomainExplanation(score: number): string {
  if (score >= 80) return 'Strong industry and domain alignment';
  if (score >= 60) return 'Good domain relevance';
  if (score >= 40) return 'Partial domain overlap';
  return 'Different industry background';
}

function getRoleExplanation(score: number): string {
  if (score >= 80) return 'Role responsibilities align well';
  if (score >= 60) return 'Good fit for core responsibilities';
  if (score >= 40) return 'Some responsibilities match';
  return 'Role may be a significant transition';
}

// ============================================================================
// Highlights Generators
// ============================================================================

function getSkillsHighlights(score: number, resumeText: string, jdSections: JDSections): string[] {
  const highlights: string[] = [];
  const resumeLower = resumeText.toLowerCase();
  const reqLower = (jdSections.requirements || jdSections.full).toLowerCase();

  // Find common tech skills mentioned in both
  const techSkills = [
    'python', 'javascript', 'typescript', 'react', 'node', 'sql', 'aws',
    'docker', 'kubernetes', 'git', 'api', 'rest', 'graphql', 'mongodb',
    'postgresql', 'redis', 'java', 'c++', 'go', 'rust', 'scala',
  ];

  const matchedSkills = techSkills.filter(
    skill => resumeLower.includes(skill) && reqLower.includes(skill)
  );

  if (matchedSkills.length > 0) {
    highlights.push(`Matching skills: ${matchedSkills.slice(0, 5).join(', ')}`);
  }

  if (score >= 70) {
    highlights.push('Technical skills well-aligned with requirements');
  } else if (score < 50) {
    highlights.push('Consider highlighting more relevant skills');
  }

  return highlights;
}

function getExperienceHighlights(score: number, resumeText: string, jdSections: JDSections): string[] {
  const highlights: string[] = [];

  if (score >= 70) {
    highlights.push('Experience level appears appropriate for role');
  } else if (score < 50) {
    highlights.push('Experience may need emphasis on transferable skills');
  }

  return highlights;
}

function getDomainHighlights(score: number, resumeText: string, jdSections: JDSections): string[] {
  const highlights: string[] = [];

  if (score >= 70) {
    highlights.push('Industry background aligns with role');
  } else if (score < 50) {
    highlights.push('Consider emphasizing relevant domain experience');
  }

  return highlights;
}

function getRoleHighlights(score: number, resumeText: string, jdSections: JDSections): string[] {
  const highlights: string[] = [];

  if (score >= 70) {
    highlights.push('Previous roles similar to target position');
  } else if (score < 50) {
    highlights.push('Highlight accomplishments relevant to this role type');
  }

  return highlights;
}

// ============================================================================
// AI Analysis
// ============================================================================

async function getAIAnalysis(
  resumeText: string,
  jobDescription: string,
  config: LlmConfig
): Promise<SemanticMatchResult['analysis']> {
  // Default analysis if LLM call fails
  const defaultAnalysis = {
    strengths: ['Resume submitted for analysis'],
    gaps: ['AI analysis requires API connection'],
    recommendations: ['Ensure API key is correctly configured'],
    summary: 'Unable to generate detailed analysis. Please check your API configuration.',
  };

  try {
    geminiProvider.setApiKey(config.apiKey);

    const prompt = `Analyze this resume against the job description. Respond with JSON only:
{
  "strengths": ["3-5 specific strengths"],
  "gaps": ["2-4 specific gaps or missing qualifications"],
  "recommendations": ["2-3 actionable recommendations"],
  "summary": "2-3 sentence overall assessment"
}

RESUME:
${resumeText.slice(0, 3000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 2000)}`;

    // Use the model selected in config, default to gemini-2.5-flash
    const modelId = config.geminiModel || 'gemini-2.5-flash';
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: 'application/json' },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData.error as { message?: string })?.message || `HTTP ${response.status}`;

      // Log the error for debugging
      console.log(`[AI Analysis] API error: ${response.status} - ${errorMessage}`);

      // Return more descriptive error for 503
      if (response.status === 503) {
        return {
          ...defaultAnalysis,
          summary: 'The AI model is currently overloaded. Please try again in a few moments.',
        };
      }

      return defaultAnalysis;
    }

    const data = await response.json();
    console.log('[AI Analysis] Raw response:', JSON.stringify(data, null, 2));
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('[AI Analysis] Text content:', textContent);

    if (!textContent) {
      console.log('[AI Analysis] No text content found');
      return defaultAnalysis;
    }

    // With responseMimeType: 'application/json', try direct parse first
    let parsed;
    try {
      parsed = JSON.parse(textContent);
      console.log('[AI Analysis] Direct JSON parse succeeded');
    } catch {
      // Fall back to extracting JSON from response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('[AI Analysis] No JSON found in response');
        return defaultAnalysis;
      }
      parsed = JSON.parse(jsonMatch[0]);
      console.log('[AI Analysis] Regex JSON extraction succeeded');
    }

    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : defaultAnalysis.strengths,
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 4) : defaultAnalysis.gaps,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : defaultAnalysis.recommendations,
      summary: typeof parsed.summary === 'string' ? parsed.summary : defaultAnalysis.summary,
    };
  } catch (error) {
    return defaultAnalysis;
  }
}

// ============================================================================
// Error Helper
// ============================================================================

function createErrorResult(error: string): SemanticMatchResult {
  return {
    score: 0,
    success: false,
    error,
    subScores: {
      skillsMatch: { score: 0, weight: WEIGHTS.skillsMatch, explanation: 'Analysis failed', highlights: [] },
      experienceFit: { score: 0, weight: WEIGHTS.experienceFit, explanation: 'Analysis failed', highlights: [] },
      domainRelevance: { score: 0, weight: WEIGHTS.domainRelevance, explanation: 'Analysis failed', highlights: [] },
      roleAlignment: { score: 0, weight: WEIGHTS.roleAlignment, explanation: 'Analysis failed', highlights: [] },
    },
    analysis: {
      strengths: [],
      gaps: [],
      recommendations: [],
      summary: error,
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if semantic matching is available
 */
export function isSemanticMatchAvailable(config: LlmConfig | null): boolean {
  if (!config) return false;
  return config.hasConsented && !!config.apiKey;
}

/**
 * Get label for semantic match score
 */
export function getSemanticMatchLabel(score: number): string {
  if (score >= 80) return 'Excellent Match';
  if (score >= 65) return 'Strong Match';
  if (score >= 50) return 'Good Match';
  if (score >= 35) return 'Moderate Match';
  return 'Limited Match';
}

/**
 * Get color for semantic match score
 */
export function getSemanticMatchColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 65) return 'text-cyan-400';
  if (score >= 50) return 'text-blue-400';
  if (score >= 35) return 'text-amber-400';
  return 'text-red-400';
}
