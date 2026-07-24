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

import type {
  V2AnalysisResult,
  AIRankingResult,
  ParsedResume,
  ParsedJobDescription,
  KnockoutStatus,
} from './types';
import { parseResumeWithGemini } from './parseResume';
import { parseJobDescriptionWithGemini } from './parseJobDescription';
import { runKnockoutScreening } from './knockoutScreen';
import { runSectionMatching } from './sectionMatch';
import { runBooleanSearch } from './booleanSearch';
import { extractGeminiText, parseAIRankingPayload } from './validation';

// Composite score weights (from blueprint)
const WEIGHTS = {
  sectionMatch: 0.40,
  booleanSearch: 0.25,
  aiFit: 0.35,
};

const KNOCKOUT_FAIL_CAP = 30;
const KNOCKOUT_CONFIRMATION_CAP = 64;

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
  layerResults: {
    knockoutStatus: KnockoutStatus;
    sectionMatchScore: number | null;
    booleanSearchScore: number | null;
  },
  apiKey: string,
  model: string,
  signal?: AbortSignal
): Promise<AIRankingResult> {
  const contextPrompt = `${AI_RANKING_PROMPT}

=== PARSED RESUME ===
${JSON.stringify(resume, null, 2)}

=== PARSED JOB REQUIREMENTS ===
${JSON.stringify(jd, null, 2)}

=== DETERMINISTIC SCREENING RESULTS ===
Knockout screening: ${
    layerResults.knockoutStatus === 'pass'
      ? 'PASSED'
      : layerResults.knockoutStatus === 'fail'
        ? 'FAILED (hard requirement not met)'
        : 'NEEDS CONFIRMATION (hard requirement could not be verified)'
  }
Section-aware match score: ${
    layerResults.sectionMatchScore === null
      ? 'NOT EVALUATED'
      : `${layerResults.sectionMatchScore}/100`
  }
Boolean search score: ${
    layerResults.booleanSearchScore === null
      ? 'NOT EVALUATED'
      : `${layerResults.booleanSearchScore}/100`
  }`;

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
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`AI ranking provider request failed (${response.status})`);
  }

  const data: unknown = await response.json();
  const text = extractGeminiText(data);

  if (!text) {
    throw new Error('AI ranking provider returned no usable result');
  }

  return parseAIRankingPayload(text);
}

function fitLabelForScore(score: number): AIRankingResult['fitLabel'] {
  if (score >= 85) return 'Strong Match';
  if (score >= 65) return 'Good Match';
  if (score >= 40) return 'Partial Match';
  return 'Weak Match';
}

// ============================================================================
// Main Engine Entry Point
// ============================================================================

export async function runV2Analysis(
  resumeText: string,
  jobDescriptionText: string,
  apiKey: string,
  model: string = 'gemini-2.5-flash',
  signal?: AbortSignal
): Promise<V2AnalysisResult> {
  signal?.throwIfAborted();

  // Step 1 & 2: Parse both inputs in parallel
  const [resumeResult, jdResult] = await Promise.all([
    parseResumeWithGemini(resumeText, apiKey, model, signal),
    parseJobDescriptionWithGemini(jobDescriptionText, apiKey, model, signal),
  ]);
  signal?.throwIfAborted();

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
  const rawAiRanking = await runAIRanking(
    parsedResume,
    parsedJD,
    {
      knockoutStatus: knockout.overallStatus,
      sectionMatchScore: sectionMatch.score,
      booleanSearchScore:
        booleanSearch.evidenceStatus === 'evaluated'
          ? booleanSearch.score
          : null,
    },
    apiKey,
    model,
    signal
  );
  signal?.throwIfAborted();

  const rankingCap =
    knockout.overallStatus === 'fail'
      ? KNOCKOUT_FAIL_CAP
      : knockout.overallStatus === 'needs-confirmation'
        ? KNOCKOUT_CONFIRMATION_CAP
        : 100;
  const cappedAiFitScore = Math.min(rawAiRanking.fitScore, rankingCap);
  const aiRanking: AIRankingResult = {
    ...rawAiRanking,
    fitScore: cappedAiFitScore,
    fitLabel: fitLabelForScore(cappedAiFitScore),
  };

  // Step 7: Composite score calculation
  const availableWeight =
    (sectionMatch.score === null ? 0 : WEIGHTS.sectionMatch) +
    (booleanSearch.evidenceStatus === 'not-evaluated'
      ? 0
      : WEIGHTS.booleanSearch) +
    WEIGHTS.aiFit;
  const appliedWeights = {
    sectionMatch:
      sectionMatch.score === null ? 0 : WEIGHTS.sectionMatch / availableWeight,
    booleanSearch:
      booleanSearch.evidenceStatus === 'not-evaluated'
        ? 0
        : WEIGHTS.booleanSearch / availableWeight,
    aiFit: WEIGHTS.aiFit / availableWeight,
  };
  const sectionMatchWeighted =
    (sectionMatch.score ?? 0) * appliedWeights.sectionMatch;
  const booleanSearchWeighted =
    booleanSearch.score * appliedWeights.booleanSearch;
  const aiFitWeighted = aiRanking.fitScore * appliedWeights.aiFit;
  let compositeScore = Math.round(sectionMatchWeighted + booleanSearchWeighted + aiFitWeighted);

  // Knockout gate: if any hard requirement failed, cap at 30
  const knockoutGatePassed = knockout.passed;
  if (knockout.overallStatus === 'fail') {
    compositeScore = Math.min(compositeScore, KNOCKOUT_FAIL_CAP);
  } else if (knockout.overallStatus === 'needs-confirmation') {
    compositeScore = Math.min(compositeScore, KNOCKOUT_CONFIRMATION_CAP);
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
      knockoutGateStatus: knockout.overallStatus,
      confidence:
        knockout.overallStatus === 'needs-confirmation' ||
        sectionMatch.evidenceStatus === 'not-evaluated' ||
        booleanSearch.evidenceStatus === 'not-evaluated'
          ? 'limited'
          : 'full',
      weights: appliedWeights,
      breakdown: {
        sectionMatchWeighted: Math.round(sectionMatchWeighted),
        booleanSearchWeighted: Math.round(booleanSearchWeighted),
        aiFitWeighted: Math.round(aiFitWeighted),
      },
    },
    parseWarnings,
  };
}
