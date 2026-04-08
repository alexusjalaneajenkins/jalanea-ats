/**
 * V2 Engine — Orchestrator
 *
 * Runs the full V2 analysis pipeline:
 * 1. Parse resume with Gemini → structured JSON
 * 2. Parse JD with Gemini → structured JSON
 * 3. Layer 1: Knockout screening
 * 4. Layer 2: Section-aware matching
 * 5. Layer 3: Boolean search simulation
 * 6. Layer 4: AI holistic ranking
 * 7. Composite score calculation
 */

import type { V2AnalysisResult, AIRankingResult, ParsedResume, ParsedJobDescription } from './types';
import { parseResumeWithGemini } from './parseResume';
import { parseJobDescriptionWithGemini } from './parseJobDescription';
import { runKnockoutScreening } from './knockoutScreen';
import { runSectionMatching } from './sectionMatch';
import { runBooleanSearch } from './booleanSearch';

// Composite score weights (from blueprint)
const WEIGHTS = {
  sectionMatch: 0.40,
  booleanSearch: 0.25,
  aiFit: 0.35,
};

const KNOCKOUT_FAIL_CAP = 30;

// ============================================================================
// AI Holistic Ranking (Layer 4)
// ============================================================================

const AI_RANKING_PROMPT = `You are an AI candidate ranking system used by enterprise ATS platforms. Given the parsed resume, job requirements, and screening results from deterministic layers, provide a holistic fit assessment.

Base your assessment on how a senior recruiter would evaluate this candidate. Weight knockout failures heavily — a failed hard requirement is disqualifying.

Return JSON matching this structure:
{
  "fitScore": 0-100,
  "fitLabel": "Strong Match" | "Good Match" | "Partial Match" | "Weak Match",
  "summary": "2-3 sentence assessment",
  "strengths": ["what is well-proven"],
  "gaps": ["what is missing or weak"],
  "conceptualMatches": ["relevant experience even if exact keywords don't match"],
  "recommendations": ["prioritized actions to improve match"]
}

Scoring guidelines:
- 85-100 Strong Match: Meets all requirements, strong evidence
- 65-84 Good Match: Meets most requirements, minor gaps
- 40-64 Partial Match: Some alignment but significant gaps
- 0-39 Weak Match: Poor alignment or disqualifying issues
- If knockout failures exist, cap fitScore at 30 maximum`;

const AI_RANKING_SCHEMA = {
  type: 'object' as const,
  properties: {
    fitScore: { type: 'number' as const },
    fitLabel: { type: 'string' as const, enum: ['Strong Match', 'Good Match', 'Partial Match', 'Weak Match'] },
    summary: { type: 'string' as const },
    strengths: { type: 'array' as const, items: { type: 'string' as const } },
    gaps: { type: 'array' as const, items: { type: 'string' as const } },
    conceptualMatches: { type: 'array' as const, items: { type: 'string' as const } },
    recommendations: { type: 'array' as const, items: { type: 'string' as const } },
  },
  required: ['fitScore', 'fitLabel', 'summary', 'strengths', 'gaps', 'conceptualMatches', 'recommendations'],
};

async function runAIRanking(
  resume: ParsedResume,
  jd: ParsedJobDescription,
  layerResults: { knockoutPassed: boolean; sectionMatchScore: number; booleanSearchScore: number },
  apiKey: string,
  model: string
): Promise<AIRankingResult> {
  const contextPrompt = `${AI_RANKING_PROMPT}

=== PARSED RESUME ===
${JSON.stringify(resume, null, 2)}

=== PARSED JOB REQUIREMENTS ===
${JSON.stringify(jd, null, 2)}

=== DETERMINISTIC SCREENING RESULTS ===
Knockout screening: ${layerResults.knockoutPassed ? 'PASSED' : 'FAILED (hard requirement not met)'}
Section-aware match score: ${layerResults.sectionMatchScore}/100
Boolean search score: ${layerResults.booleanSearchScore}/100`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: contextPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: AI_RANKING_SCHEMA,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini AI ranking failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('').trim();

  if (!text) {
    throw new Error('Gemini returned empty response for AI ranking');
  }

  return JSON.parse(text) as AIRankingResult;
}

// ============================================================================
// Main Engine Entry Point
// ============================================================================

export async function runV2Analysis(
  resumeText: string,
  jobDescriptionText: string,
  apiKey: string,
  model: string = 'gemini-2.5-flash'
): Promise<V2AnalysisResult> {
  // Step 1 & 2: Parse both inputs in parallel
  const [resumeResult, jdResult] = await Promise.all([
    parseResumeWithGemini(resumeText, apiKey, model),
    parseJobDescriptionWithGemini(jobDescriptionText, apiKey, model),
  ]);

  const { parsed: parsedResume, warnings: resumeWarnings } = resumeResult;
  const { parsed: parsedJD, warnings: jdWarnings } = jdResult;
  const parseWarnings = [...resumeWarnings, ...jdWarnings];

  // Step 3: Layer 1 — Knockout screening
  const knockout = runKnockoutScreening(parsedResume, parsedJD);

  // Step 4: Layer 2 — Section-aware matching
  const sectionMatch = runSectionMatching(parsedResume, parsedJD);

  // Step 5: Layer 3 — Boolean search simulation
  const booleanSearch = runBooleanSearch(parsedResume, parsedJD.booleanSearchTerms);

  // Step 6: Layer 4 — AI holistic ranking
  const aiRanking = await runAIRanking(
    parsedResume,
    parsedJD,
    {
      knockoutPassed: knockout.passed,
      sectionMatchScore: sectionMatch.score,
      booleanSearchScore: booleanSearch.score,
    },
    apiKey,
    model
  );

  // Step 7: Composite score calculation
  const sectionMatchWeighted = sectionMatch.score * WEIGHTS.sectionMatch;
  const booleanSearchWeighted = booleanSearch.score * WEIGHTS.booleanSearch;
  const aiFitWeighted = aiRanking.fitScore * WEIGHTS.aiFit;
  let compositeScore = Math.round(sectionMatchWeighted + booleanSearchWeighted + aiFitWeighted);

  // Knockout gate: if any hard requirement failed, cap at 30
  const knockoutGatePassed = knockout.passed;
  if (!knockoutGatePassed) {
    compositeScore = Math.min(compositeScore, KNOCKOUT_FAIL_CAP);
  }

  return {
    parsedResume,
    parsedJD,
    knockout,
    sectionMatch,
    booleanSearch,
    aiRanking,
    composite: {
      score: compositeScore,
      knockoutGatePassed,
      weights: WEIGHTS,
      breakdown: {
        sectionMatchWeighted: Math.round(sectionMatchWeighted),
        booleanSearchWeighted: Math.round(booleanSearchWeighted),
        aiFitWeighted: Math.round(aiFitWeighted),
      },
    },
    parseWarnings,
  };
}
