'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, FileText, Shield, ArrowLeft, History, X, Settings, Lock } from 'lucide-react';
import { PlainTextPreview } from '@/components/PlainTextPreview';
import { ScoreCardGrid } from '@/components/scores';
import { FindingsPanel } from '@/components/FindingsPanel';
import { JobDescriptionInput } from '@/components/JobDescriptionInput';
import { JobMatchStepper } from '@/components/JobMatchStepper';
import { ByokKeyModal } from '@/components/ByokKeyModal';
import { ConsentModal } from '@/components/ConsentModal';
import { ExportButtons } from '@/components/ExportButtons';
import { LearnTab } from '@/components/education';
import { VendorGuidance } from '@/components/ats';
import { ExportableSession } from '@/lib/export/report';
import { detectATSVendor, VendorDetectionResult } from '@/lib/ats';
import { historyStore } from '@/lib/storage/historyStore';
import { ScoreSnapshot, JobMetadata } from '@/lib/types/history';
import { HistoryDashboard } from '@/components/history';
import { AnalysisSession, JobArtifact, KnockoutItem, KeywordSet } from '@/lib/types/session';
import type { TargetingArtifact } from '@/lib/types/targeting';
import { sessionStore } from '@/lib/storage/sessionStore';
import {
  analyzeResume,
  extractKeywords,
  detectKnockouts,
  calculateCoverage,
  calculateKnockoutRisk,
  calculateRecruiterSearch,
  calculateSemanticMatch,
  isSemanticMatchAvailable,
  enhanceKnockoutsWithResume,
  detectExperienceKnockout,
  CoverageResult,
  KnockoutRiskResult,
  RecruiterSearchResult,
  SemanticMatchResult,
  EnhancedKnockoutItem,
} from '@/lib/analysis';
import { useLlmConfig } from '@/hooks/useLlmConfig';
import { useProgress } from '@/hooks/useProgress';
import { useFreeTier, FreeTierAnalysisResult } from '@/hooks/useFreeTier';
import { useV2Analysis } from '@/hooks/useV2Analysis';
import { useAuth } from '@/hooks/useAuth';
import { LlmConfig, isAbortError } from '@/lib/llm/types';
import { V2ResultsPanel } from '@/components/V2ResultsPanel';
import { createAnalysisInputRevision } from '@/lib/analysis/inputRevision';
import type { PersistedExternalAnalysis } from '@/lib/analysis/externalAnalysis';
import type { V2AnalysisResult } from '@/lib/v2';
import { Dialog } from '@/components/ui/Dialog';
import { hasVerifiedPaidAccess } from '@/lib/analysis/availability';

/**
 * Extracts a job title from job description text
 */
function extractJobTitle(text: string): string | undefined {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length === 0) return undefined;

  // First non-empty line is often the title
  const firstLine = lines[0].trim();

  // Clean up common patterns
  const cleaned = firstLine
    .replace(/^(job title|position|role):\s*/i, '')
    .replace(/\s*[-|]\s*.*$/, '') // Remove company after dash or pipe
    .trim();

  // Limit length
  if (cleaned.length > 80) {
    return cleaned.substring(0, 77) + '...';
  }

  return cleaned || undefined;
}

/**
 * Extracts company name from job URL (for detected vendors)
 */
function extractCompanyFromVendor(url: string): string | undefined {
  if (!url) return undefined;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    // Greenhouse: boards.greenhouse.io/COMPANY
    if (hostname.includes('greenhouse.io')) {
      const match = pathname.match(/^\/([^/]+)/);
      if (match) return match[1].replace(/-/g, ' ');
    }

    // Lever: jobs.lever.co/COMPANY
    if (hostname.includes('lever.co')) {
      const match = pathname.match(/^\/([^/]+)/);
      if (match) return match[1].replace(/-/g, ' ');
    }

    // Workday: COMPANY.wd5.myworkdayjobs.com
    if (hostname.includes('myworkdayjobs.com')) {
      const match = hostname.match(/^([^.]+)\./);
      if (match) return match[1].replace(/-/g, ' ');
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Results Page
 *
 * Displays the analysis results for a resume.
 * Shows score card, findings, job description matching, and plain text preview.
 */
export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobmatch' | 'details'>('overview');

  // Job description state
  const [jobText, setJobText] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [vendorResult, setVendorResult] = useState<VendorDetectionResult | null>(null);
  const [isAnalyzingJD, setIsAnalyzingJD] = useState(false);
  const [keywords, setKeywords] = useState<KeywordSet | null>(null);
  const [knockouts, setKnockouts] = useState<(KnockoutItem | EnhancedKnockoutItem)[]>([]);
  const [coverage, setCoverage] = useState<CoverageResult | null>(null);
  const [knockoutRisk, setKnockoutRisk] = useState<KnockoutRiskResult | null>(null);
  const [recruiterSearch, setRecruiterSearch] = useState<RecruiterSearchResult | null>(null);
  const [semanticMatch, setSemanticMatch] = useState<SemanticMatchResult | null>(null);
  const [isAnalyzingSemantic, setIsAnalyzingSemantic] = useState(false);

  // Handle job URL change and detect vendor
  const handleJobUrlChange = useCallback((url: string) => {
    setJobUrl(url);
    if (url) {
      const result = detectATSVendor(url);
      setVendorResult(result);
    } else {
      setVendorResult(null);
    }
  }, []);

  // BYOK (AI Features) state
  const {
    user,
    hasAccess,
    isAuthLoading,
    isEntitlementLoading,
    accessError,
  } = useAuth();
  const {
    config: llmConfig,
    isLoading: isLlmConfigLoading,
    updateConfig,
    setConsent,
  } = useLlmConfig(
    user?.id ?? null
  );
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasPendingAiAnalysis, setHasPendingAiAnalysis] = useState(false);

  // Free tier state
  const freeTier = useFreeTier();
  const analyzeFree = freeTier.analyze;
  const [freeTierResult, setFreeTierResult] = useState<FreeTierAnalysisResult | null>(null);
  const [isFreeTierAnalyzing, setIsFreeTierAnalyzing] = useState(false);
  const [freeTierError, setFreeTierError] = useState<string | null>(null);

  // V2 Engine state
  const v2 = useV2Analysis();
  const analyzeV2 = v2.analyze;
  const abortV2 = v2.abort;
  const resetV2 = v2.reset;
  const restoreV2 = v2.restore;
  const inputVersionRef = useRef(0);
  const semanticRequestRef = useRef<AbortController | null>(null);
  const externalRequestRef = useRef<{
    inputRevision: string;
    controller: AbortController;
    promise: Promise<void>;
    isPaid: boolean;
  } | null>(null);

  useEffect(() => {
    return () => {
      semanticRequestRef.current?.abort();
      semanticRequestRef.current = null;
      externalRequestRef.current?.controller.abort();
      externalRequestRef.current = null;
    };
  }, []);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);
  const [isJobInputExpanded, setIsJobInputExpanded] = useState(false);
  const [pendingTargeting, setPendingTargeting] = useState<TargetingArtifact | null>(null);

  // Progress tracking
  const { saveSession } = useProgress();
  const hasVerifiedAccess = hasVerifiedPaidAccess({
    hasAccess,
    isEntitlementLoading,
    accessError,
  });
  const canUseByok = !!user && hasVerifiedAccess;
  const hasByokConfigured = canUseByok && !!(llmConfig?.apiKey && llmConfig?.hasConsented);
  const verifiedPaidAccessRef = useRef(false);
  verifiedPaidAccessRef.current = Boolean(user && hasVerifiedAccess);

  useEffect(() => {
    if (verifiedPaidAccessRef.current) return;

    semanticRequestRef.current?.abort();
    semanticRequestRef.current = null;
    setIsAnalyzingSemantic(false);
    setSemanticMatch(null);

    if (externalRequestRef.current?.isPaid) {
      externalRequestRef.current.controller.abort();
      externalRequestRef.current = null;
    }
    resetV2();
  }, [hasVerifiedAccess, resetV2, user]);

  // Handle LLM config save
  const handleSaveLlmConfig = async (newConfig: LlmConfig) => {
    const gatedConfig = !canUseByok && newConfig.apiKey
      ? {
          ...newConfig,
          apiKey: '',
        }
      : newConfig;

    await updateConfig(gatedConfig);
    // If user added an API key but hasn't consented yet, show consent modal
    if (gatedConfig.apiKey && !gatedConfig.hasConsented) {
      setShowConsentModal(true);
    }
  };

  const runExternalAiAnalysis = useCallback(async (consentGranted: boolean) => {
    if (!session || !jobText.trim() || !consentGranted) return;

    if (user && (isEntitlementLoading || accessError)) {
      setFreeTierError(
        accessError
          ? 'We could not verify your subscription. Try again shortly.'
          : 'Checking your subscription before analysis.'
      );
      return;
    }

    const inputVersion = inputVersionRef.current;
    const resumeText = session.resume.extractedText;
    const analyzedJobText = jobText;
    const usePaidAnalysis = Boolean(user && hasVerifiedAccess);
    const inputRevision = await createAnalysisInputRevision(
      resumeText,
      analyzedJobText
    );

    if (
      inputVersionRef.current !== inputVersion ||
      (usePaidAnalysis && !verifiedPaidAccessRef.current)
    ) {
      return;
    }

    const existingRequest = externalRequestRef.current;
    if (existingRequest?.inputRevision === inputRevision) {
      return existingRequest.promise;
    }

    existingRequest?.controller.abort();
    abortV2();
    const controller = new AbortController();
    setFreeTierError(null);
    setFreeTierResult(null);
    if (!usePaidAnalysis) {
      setIsFreeTierAnalyzing(true);
    }

    const requestPromise = (async () => {
      try {
        const result = usePaidAnalysis
          ? await analyzeV2(
              resumeText,
              analyzedJobText,
              consentGranted,
              inputRevision
            )
          : await analyzeFree(
              resumeText,
              analyzedJobText,
              consentGranted,
              undefined,
              controller.signal
            );

        if (
          !result ||
          controller.signal.aborted ||
          inputVersionRef.current !== inputVersion ||
          (usePaidAnalysis && !verifiedPaidAccessRef.current)
        ) {
          return;
        }

        if (!usePaidAnalysis) {
          setFreeTierResult(result as FreeTierAnalysisResult);
        }

        const persistedAnalysis: PersistedExternalAnalysis = usePaidAnalysis
          ? {
              version: 1,
              inputRevision,
              completedAt: new Date().toISOString(),
              mode: 'paid-v2',
              result: result as V2AnalysisResult,
            }
          : {
              version: 1,
              inputRevision,
              completedAt: new Date().toISOString(),
              mode: 'free',
              result: result as FreeTierAnalysisResult,
            };

        const persistedSession = await sessionStore.updateIf(
          session.id,
          (storedSession) =>
            storedSession.job?.rawText === analyzedJobText,
          {
            externalAnalysis: persistedAnalysis,
          }
        );
        if (
          !persistedSession ||
          controller.signal.aborted ||
          inputVersionRef.current !== inputVersion ||
          (usePaidAnalysis && !verifiedPaidAccessRef.current)
        ) {
          return;
        }

        setSession((previous) =>
          previous?.job?.rawText === analyzedJobText
            ? { ...previous, externalAnalysis: persistedAnalysis }
            : previous
        );
      } catch (requestError) {
        if (controller.signal.aborted) return;
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Analysis failed';
        setFreeTierError(message);
        console.error('External analysis request failed', {
          name:
            requestError instanceof Error
              ? requestError.name
              : 'UnknownError',
        });
      } finally {
        if (
          externalRequestRef.current?.inputRevision === inputRevision
        ) {
          externalRequestRef.current = null;
          setIsFreeTierAnalyzing(false);
        }
      }
    })();

    externalRequestRef.current = {
      inputRevision,
      controller,
      promise: requestPromise,
      isPaid: usePaidAnalysis,
    };
    return requestPromise;
  }, [
    abortV2,
    accessError,
    analyzeFree,
    analyzeV2,
    hasVerifiedAccess,
    isEntitlementLoading,
    jobText,
    session,
    user,
  ]);

  const handleConsent = async () => {
    await setConsent(true);

    if (hasPendingAiAnalysis) {
      setHasPendingAiAnalysis(false);
      await runExternalAiAnalysis(true);
    }
  };

  const requestExternalAiAnalysis = useCallback(async () => {
    if (!llmConfig?.hasConsented) {
      setHasPendingAiAnalysis(true);
      setShowConsentModal(true);
      return;
    }

    await runExternalAiAnalysis(true);
  }, [llmConfig?.hasConsented, runExternalAiAnalysis]);

  const handleJobTextChange = useCallback((nextJobText: string) => {
    inputVersionRef.current += 1;
    semanticRequestRef.current?.abort();
    semanticRequestRef.current = null;
    setIsAnalyzingSemantic(false);
    externalRequestRef.current?.controller.abort();
    externalRequestRef.current = null;
    resetV2();
    setJobText(nextJobText);
    setKeywords(null);
    setKnockouts([]);
    setCoverage(null);
    setKnockoutRisk(null);
    setRecruiterSearch(null);
    setSemanticMatch(null);
    setFreeTierResult(null);
    setFreeTierError(null);
    setIsFreeTierAnalyzing(false);
    setPendingTargeting(null);
    setHasPendingAiAnalysis(false);
    setSession((previous) =>
      previous
        ? {
            ...previous,
            job: undefined,
            targeting: undefined,
            externalAnalysis: undefined,
          }
        : previous
    );
    void sessionStore.update(sessionId, {
      job: undefined,
      targeting: undefined,
      externalAnalysis: undefined,
    });
  }, [resetV2, sessionId]);

  const buildJobArtifact = useCallback((
    rawText: string,
    extractedKeywords: KeywordSet | null,
    detectedKnockouts: (KnockoutItem | EnhancedKnockoutItem)[]
  ): JobArtifact | undefined => {
    if (!rawText.trim()) return undefined;

    return {
      rawText,
      extractedKeywords: extractedKeywords || { critical: [], optional: [], all: [] },
      detectedKnockouts: detectedKnockouts.map((knockout) => ({
        id: knockout.id,
        label: knockout.label,
        category: knockout.category,
        evidence: knockout.evidence,
        userConfirmed: knockout.userConfirmed,
      })),
    };
  }, []);

  const buildCurrentJobMeta = useCallback((): JobMetadata | undefined => {
    if (!jobText.trim()) return undefined;

    return {
      title: extractJobTitle(jobText),
      company: vendorResult?.vendor ? extractCompanyFromVendor(jobUrl) : undefined,
      url: jobUrl || undefined,
      atsVendor: vendorResult?.vendor || undefined,
      keywordCount: keywords?.all.length,
    };
  }, [jobText, vendorResult, jobUrl, keywords]);

  const saveHistoryEntry = useCallback(async ({
    parseHealth,
    risk,
    semanticScore,
    recruiterScore,
    keywordCoverageScore,
    jobMeta,
    sessionOverride,
  }: {
    parseHealth: number;
    risk: KnockoutRiskResult['risk'];
    semanticScore?: number;
    recruiterScore?: number;
    keywordCoverageScore?: number;
    jobMeta?: JobMetadata;
    sessionOverride?: AnalysisSession;
  }) => {
    const sourceSession = sessionOverride || session;
    if (!sourceSession) return;

    try {
      const scoreSnapshot: ScoreSnapshot = {
        parseHealth,
        knockoutRisk: risk,
        semanticMatch: semanticScore,
        recruiterSearch: recruiterScore,
        keywordCoverage: keywordCoverageScore,
      };

      await historyStore.upsertFromSession(sourceSession, scoreSnapshot, jobMeta);
      setHistorySaved(true);
    } catch (err) {
      console.error('Failed to save to history:', err);
    }
  }, [session]);

  // Load session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const loadedSession = await sessionStore.get(sessionId);
        if (loadedSession) {
          setSession(loadedSession);
        } else {
          setError('Session not found. It may have expired or been deleted.');
        }
      } catch (err) {
        console.error('Error loading session:', err);
        setError('Failed to load session data.');
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId]);

  useEffect(() => {
    if (!session?.job || coverage || jobText.trim()) return;

    const storedJob = session.job;
    const restoredKeywords = storedJob.extractedKeywords;
    const restoredKnockouts = storedJob.detectedKnockouts as (KnockoutItem | EnhancedKnockoutItem)[];

    setJobText(storedJob.rawText);
    setKeywords(restoredKeywords);
    setKnockouts(restoredKnockouts);
    setCoverage(calculateCoverage(session.resume.extractedText, restoredKeywords));
    setRecruiterSearch(
      calculateRecruiterSearch(session.resume.extractedText, storedJob.rawText, restoredKeywords)
    );
    setKnockoutRisk(calculateKnockoutRisk(restoredKnockouts));
    setIsJobInputExpanded(true);

  }, [coverage, jobText, session]);

  useEffect(() => {
    if (
      !session?.job ||
      !session.externalAnalysis ||
      jobText !== session.job.rawText
    ) {
      return;
    }

    let cancelled = false;
    void createAnalysisInputRevision(
      session.resume.extractedText,
      session.job.rawText
    ).then((inputRevision) => {
      if (
        cancelled ||
        session.externalAnalysis?.inputRevision !== inputRevision
      ) {
        return;
      }

      if (session.externalAnalysis.mode === 'paid-v2') {
        if (!verifiedPaidAccessRef.current) return;
        restoreV2(session.externalAnalysis.result, inputRevision);
      } else {
        setFreeTierResult(session.externalAnalysis.result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hasVerifiedAccess, jobText, restoreV2, session, user]);

  // Run resume analysis (memoized)
  const analysis = useMemo(() => {
    if (!session) return null;
    return analyzeResume(session.resume);
  }, [session]);

  // Create exportable session with computed analysis data
  const exportSession = useMemo((): ExportableSession | null => {
    if (!session || !analysis) return null;
    return {
      ...session,
      externalAnalysis:
        session.job?.rawText === jobText &&
        (
          session.externalAnalysis?.mode !== 'paid-v2' ||
          Boolean(user && hasVerifiedAccess)
        )
          ? session.externalAnalysis
          : undefined,
      findings: analysis.findings,
      scores: {
        ...analysis.scores,
        keywordCoverage: coverage?.score,
        knockoutRisk: knockoutRisk?.risk,
      },
      job: jobText.trim()
        ? {
            rawText: jobText,
            extractedKeywords: keywords || { critical: [], optional: [], all: [] },
            detectedKnockouts: knockouts,
          }
        : undefined,
    };
  }, [
    session,
    analysis,
    coverage,
    knockoutRisk,
    jobText,
    keywords,
    knockouts,
    hasVerifiedAccess,
    user,
  ]);

  // Analyze job description
  const handleAnalyzeJD = useCallback(async () => {
    if (!session || !jobText.trim()) return;

    semanticRequestRef.current?.abort();
    semanticRequestRef.current = null;
    setIsAnalyzingSemantic(false);
    const inputVersion = inputVersionRef.current;
    const analyzedJobText = jobText;
    setIsAnalyzingJD(true);
    setSemanticMatch(null);

    try {
      // Extract keywords
      const extractedKeywords = extractKeywords(analyzedJobText);
      setKeywords(extractedKeywords);

      // Detect knockouts and enhance with resume analysis
      const detectedKnockouts = detectKnockouts(analyzedJobText);

      // Enhance knockouts with auto-assessment based on resume
      const enhancedKnockouts = enhanceKnockoutsWithResume(
        detectedKnockouts,
        session.resume.extractedText,
        analyzedJobText
      );

      // Check for experience requirement knockout
      const experienceKnockout = detectExperienceKnockout(
        session.resume.extractedText,
        analyzedJobText
      );

      // Combine all knockouts
      const allKnockouts = experienceKnockout
        ? [...enhancedKnockouts, experienceKnockout]
        : enhancedKnockouts;

      setKnockouts(allKnockouts);

      // Calculate coverage
      const coverageResult = calculateCoverage(
        session.resume.extractedText,
        extractedKeywords
      );
      setCoverage(coverageResult);

      // Calculate recruiter search score
      const recruiterSearchResult = calculateRecruiterSearch(
        session.resume.extractedText,
        analyzedJobText,
        extractedKeywords
      );
      setRecruiterSearch(recruiterSearchResult);

      // Calculate initial knockout risk (all unconfirmed)
      const riskResult = calculateKnockoutRisk(allKnockouts);
      setKnockoutRisk(riskResult);

      const nextJobArtifact = buildJobArtifact(
        analyzedJobText,
        extractedKeywords,
        allKnockouts
      );
      if (nextJobArtifact) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                job: nextJobArtifact,
                targeting: undefined,
                externalAnalysis: undefined,
              }
            : prev
        );
        await sessionStore.update(session.id, {
          job: nextJobArtifact,
          targeting: undefined,
          externalAnalysis: undefined,
        });
      }

      if (inputVersionRef.current !== inputVersion) return;

      let semanticScore: number | undefined;

      // Calculate semantic match if BYOK is configured
      if (
        hasByokConfigured &&
        verifiedPaidAccessRef.current &&
        llmConfig &&
        isSemanticMatchAvailable(llmConfig)
      ) {
        const semanticController = new AbortController();
        semanticRequestRef.current = semanticController;
        setIsAnalyzingSemantic(true);
        try {
          const semanticResult = await calculateSemanticMatch(
            session.resume.extractedText,
            analyzedJobText,
            llmConfig,
            semanticController.signal
          );
          if (
            !semanticController.signal.aborted &&
            verifiedPaidAccessRef.current &&
            inputVersionRef.current === inputVersion
          ) {
            setSemanticMatch(semanticResult);
            semanticScore = semanticResult.success
              ? semanticResult.score
              : undefined;
          }
        } catch (err) {
          if (isAbortError(err, semanticController.signal)) return;
          console.error('Error calculating semantic match:', err);
        } finally {
          if (semanticRequestRef.current === semanticController) {
            semanticRequestRef.current = null;
          }
          if (
            !semanticController.signal.aborted &&
            inputVersionRef.current === inputVersion
          ) {
            setIsAnalyzingSemantic(false);
          }
        }
      }

      if (inputVersionRef.current !== inputVersion) return;

      // Switch to job match tab
      setActiveTab('jobmatch');

      // Update progress tracking (mark that JD was added)
      if (session) {
        saveSession(session.id, session.resume.fileName, true);
      }

      // Save/update history entry with job match data
      const jobMeta: JobMetadata | undefined = analyzedJobText.trim()
        ? {
            title: extractJobTitle(analyzedJobText),
            company: vendorResult?.vendor ? extractCompanyFromVendor(jobUrl) : undefined,
            url: jobUrl || undefined,
            atsVendor: vendorResult?.vendor || undefined,
            keywordCount: extractedKeywords.all.length,
          }
        : undefined;

      await saveHistoryEntry({
        parseHealth: analysis?.scores.parseHealth ?? 0,
        risk: riskResult?.risk || 'low',
        semanticScore,
        recruiterScore: recruiterSearchResult?.score,
        keywordCoverageScore: coverageResult.score,
        jobMeta,
      });

      if (inputVersionRef.current !== inputVersion) return;
      await requestExternalAiAnalysis();
    } catch (err) {
      console.error('Error analyzing job description:', err);
    } finally {
      setIsAnalyzingJD(false);
    }
  }, [
    analysis?.scores.parseHealth,
    buildJobArtifact,
    hasByokConfigured,
    jobText,
    jobUrl,
    llmConfig,
    requestExternalAiAnalysis,
    saveHistoryEntry,
    saveSession,
    session,
    vendorResult,
  ]);

  // Handle knockout confirmation change
  const handleKnockoutChange = useCallback(
    (id: string, confirmed: boolean | undefined) => {
      setKnockouts((prev) => {
        const updated = prev.map((k) =>
          k.id === id ? { ...k, userConfirmed: confirmed } : k
        );

        // Recalculate risk
        const riskResult = calculateKnockoutRisk(updated);
        setKnockoutRisk(riskResult);

        return updated;
      });
    },
    []
  );

  useEffect(() => {
    if (jobText.trim().length > 0) {
      setIsJobInputExpanded(true);
    }
  }, [jobText]);

  useEffect(() => {
    if (!session || !pendingTargeting) return;
    if (JSON.stringify(session.targeting ?? null) === JSON.stringify(pendingTargeting)) return;

    const timeout = window.setTimeout(() => {
      const nextJobArtifact = buildJobArtifact(jobText, keywords, knockouts) || session.job;
      const nextSession: AnalysisSession = {
        ...session,
        job: nextJobArtifact,
        targeting: pendingTargeting,
      };

      setSession(nextSession);

      void (async () => {
        await sessionStore.update(session.id, {
          job: nextJobArtifact,
          targeting: pendingTargeting,
        });

        await saveHistoryEntry({
          parseHealth: analysis?.scores.parseHealth ?? 0,
          risk: knockoutRisk?.risk || 'low',
          semanticScore: semanticMatch?.success ? semanticMatch.score : undefined,
          recruiterScore: recruiterSearch?.score,
          keywordCoverageScore: coverage?.score,
          jobMeta: buildCurrentJobMeta(),
          sessionOverride: nextSession,
        });
      })();
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [
    analysis?.scores.parseHealth,
    buildCurrentJobMeta,
    buildJobArtifact,
    coverage?.score,
    jobText,
    keywords,
    knockouts,
    knockoutRisk?.risk,
    pendingTargeting,
    recruiterSearch?.score,
    saveHistoryEntry,
    semanticMatch,
    session,
  ]);

  useEffect(() => {
    if (!session || !analysis || historySaved) return;

    // Baseline save so History appears right after first resume analysis.
    void saveHistoryEntry({
      parseHealth: analysis.scores.parseHealth,
      risk: 'low',
      semanticScore: undefined,
      recruiterScore: undefined,
      keywordCoverageScore: undefined,
      jobMeta: undefined,
    });
  }, [session, analysis, historySaved, saveHistoryEntry]);

  useEffect(() => {
    if (!coverage && activeTab === 'jobmatch') {
      setActiveTab('overview');
    }
  }, [coverage, activeTab]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-indigo-300">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !session || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Session Not Found</h1>
          <p className="text-indigo-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Analyze New Resume
          </button>
        </div>
      </div>
    );
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleString();
  };

  const { resume } = session;
  const { scores, findings } = analysis;
  const issueCount = findings.filter((finding) => finding.severity !== 'info').length;
  const positiveCount = findings.filter((finding) => finding.severity === 'info').length;
  const isAtsReady = issueCount === 0;
  const hasJobMatchData = !!coverage;
  const scrollToStep2 = () => {
    setIsJobInputExpanded(true);
    window.setTimeout(() => {
      document.getElementById('job-description-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  // Derive the best available AI match score: prefer V2 composite, then BYOK semantic, then free tier
  const effectiveAiScore = v2.result?.composite.score != null
    ? v2.result.composite.score
    : semanticMatch?.success
      ? semanticMatch.score
      : freeTierResult?.score != null
        ? freeTierResult.score
        : undefined;
  const hasAnyAiScore = effectiveAiScore !== undefined;

  const renderScoreCards = () => (
    <ScoreCardGrid
      scores={scores}
      knockoutRisk={knockoutRisk?.risk || 'low'}
      knockoutCount={knockouts.filter(k => k.userConfirmed === false || k.userConfirmed === undefined).length}
      semanticMatch={effectiveAiScore}
      isSemanticLoading={isAnalyzingSemantic || isFreeTierAnalyzing}
      recruiterSearch={recruiterSearch?.score}
      hasByokConfigured={hasByokConfigured || hasAnyAiScore}
      hasJobDescription={jobText.trim().length > 50}
      onConfigureByok={() => setShowKeyModal(true)}
      onAddJobDescription={scrollToStep2}
    />
  );

  return (
    <div className="min-h-screen text-indigo-100 overflow-x-hidden">
      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Link href="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform glow-orange">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <span className="text-2xl font-black tracking-tight">
              <span className="text-white">Jalanea</span>
              <span className="text-orange-400"> ATS</span>
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border transition-colors ${
              hasByokConfigured
                ? 'text-emerald-300 hover:text-emerald-200 bg-emerald-900/30 border-emerald-700/30 hover:border-emerald-500/50'
                : 'text-amber-300 hover:text-amber-200 bg-amber-900/30 border-amber-700/30 hover:border-amber-500/50'
            }`}
            title={hasByokConfigured ? 'AI settings configured' : 'AI settings and Gemini key'}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium hidden sm:inline">
              {hasByokConfigured ? 'AI Settings ✓' : 'AI Settings'}
            </span>
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200 bg-indigo-900/40 px-4 py-2 rounded-full border border-indigo-700/30 hover:border-indigo-500/50 transition-colors"
          >
            <History className="w-4 h-4" />
            <span className="font-medium hidden sm:inline">History</span>
          </button>
        </motion.div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-16 pt-4">
        {/* Header with breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Upload</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-black text-white">Analysis Results</h1>
            {exportSession && <ExportButtons session={exportSession} compact />}
          </div>
        </motion.div>

        {/* File info card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                resume.fileType === 'pdf'
                  ? 'bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30'
                  : 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30'
              }`}
            >
              <FileText
                className={`w-6 h-6 ${
                  resume.fileType === 'pdf' ? 'text-red-400' : 'text-blue-400'
                }`}
              />
            </div>
            <div>
              <h2 className="font-bold text-white">{resume.fileName}</h2>
              <p className="text-sm text-indigo-300">
                {formatFileSize(resume.fileSizeBytes)} •{' '}
                {resume.fileType.toUpperCase()} •{' '}
                {resume.extractionMeta.pageCount
                  ? `${resume.extractionMeta.pageCount} page${
                      resume.extractionMeta.pageCount !== 1 ? 's' : ''
                    } • `
                  : ''}
                Analyzed {formatDate(session.createdAt)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Primary summary */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-6"
        >
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-900/35 p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-indigo-300">
                  Resume Summary
                </p>
                <h2 className="mt-1 text-lg md:text-xl font-bold text-white">
                  {isAtsReady ? 'Your resume is ATS-ready' : `${issueCount} issue${issueCount === 1 ? '' : 's'} to fix first`}
                </h2>
                <p className="mt-2 text-sm text-indigo-200">
                  {issueCount} issue{issueCount === 1 ? '' : 's'} found
                  {positiveCount > 0 ? ` • ${positiveCount} positive` : ''}
                </p>
                <p className="mt-2 text-sm text-indigo-300">
                  Want job-specific matching? Add a job description in the optional section below.
                </p>
              </div>
              <p className="self-start text-xs sm:text-sm text-indigo-300">
                <span className="font-semibold text-indigo-200">Status:</span>{' '}
                <span className={isAtsReady ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
                  {isAtsReady ? 'Ready to apply' : 'Needs fixes'}
                </span>
              </p>
            </div>
          </div>
        </motion.section>

        {/* Job description input (optional) */}
        <motion.section
          id="job-description-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="glass-card rounded-2xl p-4 md:p-5">
            <button
              type="button"
              onClick={() => setIsJobInputExpanded((prev) => !prev)}
              className="w-full text-left flex items-center justify-between gap-3"
              aria-expanded={isJobInputExpanded}
            >
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-indigo-300">
                  Optional Step
                </p>
                <h2 className="text-lg md:text-xl font-bold text-white mt-1">Add Job Description</h2>
                <p className="text-sm text-indigo-300 mt-1">
                  {coverage
                    ? 'Job-specific analysis is ready. Open to update or compare with another role.'
                    : 'Paste a job post from LinkedIn, Indeed, or a careers page to unlock role-specific matching.'}
                </p>
              </div>
              <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                coverage
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-indigo-800/50 border-indigo-500/40 text-indigo-200'
              }`}>
                {isJobInputExpanded ? 'Hide' : coverage || jobText.trim() ? 'Edit' : 'Open'}
              </span>
            </button>

            {isJobInputExpanded && (
              <div className="mt-4">
                <JobDescriptionInput
                  jobText={jobText}
                  onJobTextChange={handleJobTextChange}
                  jobUrl={jobUrl}
                  onJobUrlChange={handleJobUrlChange}
                  vendorResult={vendorResult}
                  onAnalyze={handleAnalyzeJD}
                  isLoading={
                    isAnalyzingJD ||
                    isFreeTierAnalyzing ||
                    v2.isAnalyzing
                  }
                  hasResume={true}
                  onOpenApiKeyModal={() => setShowKeyModal(true)}
                  freeTierStatus={freeTier.status}
                  freeTierLoading={freeTier.isLoading}
                  isSignedIn={Boolean(user)}
                  hasPaidAccess={Boolean(user && hasVerifiedAccess)}
                  entitlementLoading={Boolean(user && isEntitlementLoading)}
                  entitlementError={Boolean(user && accessError)}
                />
              </div>
            )}
          </div>
        </motion.section>

        {/* Score cards (single render path) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <details className="rounded-2xl border border-indigo-500/30 bg-indigo-900/20 p-3 md:p-4">
            <summary className="cursor-pointer text-sm font-semibold text-indigo-200">
              Show detailed score breakdown (optional)
            </summary>
            <div className="mt-4">
              {renderScoreCards()}
            </div>
          </details>
        </motion.div>

        {/* PDF layout signals (secondary) */}
        {resume.extractionMeta.pdfSignals && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6"
          >
            <details className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 overflow-hidden">
              <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-indigo-200 hover:bg-indigo-900/40 transition-colors">
                PDF layout signals (advanced)
              </summary>
              <div className="p-5 space-y-3 border-t border-indigo-500/20">
                <SignalRow
                  label="Columns"
                  value={resume.extractionMeta.pdfSignals.estimatedColumns.toString()}
                  status={
                    resume.extractionMeta.pdfSignals.estimatedColumns === 1
                      ? 'good'
                      : 'warn'
                  }
                  tooltip="Number of text columns detected. Single-column layouts parse most reliably."
                />
                <SignalRow
                  label="Column Risk"
                  value={capitalize(resume.extractionMeta.pdfSignals.columnMergeRisk)}
                  status={riskToStatus(resume.extractionMeta.pdfSignals.columnMergeRisk)}
                  tooltip="Risk that multi-column text gets merged incorrectly, scrambling your content."
                />
                <SignalRow
                  label="Header Risk"
                  value={capitalize(resume.extractionMeta.pdfSignals.headerContactRisk)}
                  status={riskToStatus(
                    resume.extractionMeta.pdfSignals.headerContactRisk
                  )}
                  tooltip="Risk that contact info in headers/footers gets missed by ATS parsers."
                />
                <SignalRow
                  label="Text Density"
                  value={capitalize(resume.extractionMeta.pdfSignals.textDensity)}
                  status={
                    resume.extractionMeta.pdfSignals.textDensity === 'low'
                      ? 'warn'
                      : 'good'
                  }
                  tooltip="Ratio of text to whitespace. Low density may indicate images or graphics with embedded text."
                />
              </div>
            </details>
          </motion.div>
        )}

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* Tab buttons - Simplified to 3 tabs */}
          <div className="flex gap-1 mb-4 bg-indigo-950/80 backdrop-blur-sm rounded-xl p-1.5 border border-indigo-500/20">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/20'
                  : 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-900/50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => {
                if (hasJobMatchData) setActiveTab('jobmatch');
              }}
              disabled={!hasJobMatchData}
              aria-disabled={!hasJobMatchData}
              className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'jobmatch'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/20'
                  : hasJobMatchData
                    ? 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-900/50'
                    : 'text-indigo-500/80 cursor-not-allowed'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {!hasJobMatchData && <Lock className="w-3.5 h-3.5" />}
                Job Match
              </span>
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'details'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/20'
                  : 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-900/50'
              }`}
            >
              Details
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && (
            <FindingsPanel findings={findings} />
          )}

          {activeTab === 'jobmatch' && (
            <div className="space-y-4">
              {/* V2 Engine Results (AI-first multi-layer analysis) */}
              {v2.isAnalyzing && (
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-900/20 p-6 text-center">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-indigo-200 font-semibold">Running V2 ATS Engine...</p>
                  <p className="text-indigo-400 text-sm mt-1">AI parsing resume + job description → 4-layer scoring</p>
                </div>
              )}
              {v2.result && <V2ResultsPanel result={v2.result} />}
              {v2.error && (
                <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3">
                  <p className="text-sm text-red-300">V2 Engine Error: {v2.error}</p>
                </div>
              )}

              {/* Vendor Guidance (if detected) */}
              {vendorResult?.detected && (
                <VendorGuidance
                  vendor={vendorResult.vendor || null}
                  confidence={vendorResult.confidence}
                  compact={!!coverage}
                />
              )}

              {coverage && (
                <JobMatchStepper
                  semanticMatch={semanticMatch || undefined}
                  recruiterSearch={recruiterSearch || undefined}
                  coverage={coverage}
                  knockoutRisk={knockoutRisk || undefined}
                  knockouts={knockouts}
                  keywords={keywords}
                  llmConfig={hasByokConfigured ? llmConfig : null}
                  hasAiConsent={Boolean(llmConfig?.hasConsented)}
                  resumeFileName={resume.fileName}
                  resumeText={resume.extractedText}
                  jobDescriptionText={jobText}
                  onKnockoutChange={handleKnockoutChange}
                  onConfigureClick={() => setShowKeyModal(true)}
                  onConsentClick={() => setShowConsentModal(true)}
                  isAnalyzingSemantic={isAnalyzingSemantic}
                  // Free tier props
                  freeTierStatus={freeTier.status}
                  freeTierLoading={freeTier.isLoading}
                  freeTierResult={freeTierResult}
                  isFreeTierAnalyzing={isFreeTierAnalyzing}
                  freeTierError={freeTierError}
                  onFreeTierAnalyze={requestExternalAiAnalysis}
                  initialTargeting={session.targeting || null}
                  onTargetingArtifactChange={setPendingTargeting}
                />
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Raw text preview */}
              <PlainTextPreview
                text={resume.extractedText}
                title="What ATS Software Sees"
                subtitle="This is the plain text that applicant tracking systems extract from your resume"
                maxHeight={400}
              />

              {/* Learn section - collapsed by default */}
              <details className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 overflow-hidden">
                <summary className="p-4 cursor-pointer text-white font-semibold hover:bg-indigo-900/50 transition-colors">
                  📚 Learn more about ATS systems
                </summary>
                <div className="p-4 pt-0">
                  <LearnTab />
                </div>
              </details>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 flex justify-center"
        >
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50"
          >
            Analyze Another Resume
          </button>
        </motion.div>

        {/* Privacy reminder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center text-xs text-indigo-400 flex items-center justify-center gap-2"
        >
          <Shield className="w-4 h-4" />
          <span>File parsing stays in your browser. AI features send resume text to Google Gemini only after you consent.</span>
        </motion.div>
      </main>

      {/* BYOK Modals */}
      <ByokKeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onSave={handleSaveLlmConfig}
        currentConfig={llmConfig || undefined}
        isAuthenticated={!!user}
        hasActiveSubscription={canUseByok}
        isAuthLoading={isAuthLoading || isEntitlementLoading}
        isConfigLoading={isLlmConfigLoading}
      />

      <ConsentModal
        isOpen={showConsentModal}
        onClose={() => {
          setShowConsentModal(false);
          setHasPendingAiAnalysis(false);
        }}
        onConsent={handleConsent}
        providerName={llmConfig?.provider === 'gemini' ? 'Google Gemini' : 'the AI provider'}
      />

      {/* History Modal */}
      <Dialog
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        labelledBy="history-modal-title"
      >
          <div className="min-h-[100dvh] px-4 py-8">
            <div className="relative max-w-4xl mx-auto">
              <div className="bg-indigo-950 rounded-2xl border border-indigo-500/30 shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-500/20">
                  <h2 id="history-modal-title" className="text-lg font-bold text-white">Analysis History</h2>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    aria-label="Close history modal"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  <HistoryDashboard onClose={() => setShowHistory(false)} />
                </div>
              </div>
            </div>
          </div>
      </Dialog>
    </div>
  );
}

/**
 * Signal row component for displaying PDF layout signals with optional tooltip.
 */
function SignalRow({
  label,
  value,
  status,
  tooltip,
}: {
  label: string;
  value: string;
  status: 'good' | 'warn' | 'risk';
  tooltip?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const statusColors = {
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    risk: 'text-red-400',
  };

  const statusIcons = {
    good: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    warn: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    risk: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="relative">
        <span
          className={`text-indigo-300 ${tooltip ? 'cursor-help border-b border-dashed border-indigo-500/50' : ''}`}
          onMouseEnter={() => tooltip && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {label}
        </span>
        {tooltip && showTooltip && (
          <div className="absolute z-50 bottom-full left-0 mb-2 px-3 py-2 text-xs text-white bg-indigo-900 border border-indigo-500/50 rounded-lg shadow-xl max-w-[200px] whitespace-normal">
            {tooltip}
            <div className="absolute top-full left-4 w-2 h-2 bg-indigo-900 border-r border-b border-indigo-500/50 transform rotate-45 -translate-y-1" />
          </div>
        )}
      </div>
      <div className={`flex items-center gap-1.5 ${statusColors[status]}`}>
        <span className="font-bold">{value}</span>
        {statusIcons[status]}
      </div>
    </div>
  );
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a risk level to a status.
 */
function riskToStatus(risk: 'low' | 'medium' | 'high'): 'good' | 'warn' | 'risk' {
  if (risk === 'low') return 'good';
  if (risk === 'medium') return 'warn';
  return 'risk';
}
