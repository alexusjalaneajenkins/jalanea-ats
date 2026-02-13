'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, FileText, Shield, ArrowLeft, History, X, Settings, PanelLeftClose, PanelLeft } from 'lucide-react';
import { MobileActionButton } from '@/components/MobileActionButton';
import { PlainTextPreview } from '@/components/PlainTextPreview';
import { ScoreCardGrid } from '@/components/scores';
import { FindingsPanel } from '@/components/FindingsPanel';
import { JobDescriptionInput } from '@/components/JobDescriptionInput';
import { KnockoutChecklist } from '@/components/KnockoutChecklist';
import { KeywordCoveragePanel } from '@/components/KeywordCoveragePanel';
import { RecruiterSearchPanel } from '@/components/RecruiterSearchPanel';
import { SemanticMatchPanel } from '@/components/SemanticMatchPanel';
import { AiFeaturesPanel } from '@/components/AiFeaturesPanel';
import { JobMatchSummary } from '@/components/JobMatchSummary';
import { JobMatchStepper } from '@/components/JobMatchStepper';
import { ByokKeyModal } from '@/components/ByokKeyModal';
import { ConsentModal } from '@/components/ConsentModal';
import { ExportButtons } from '@/components/ExportButtons';
import { LearnTab } from '@/components/education';
import { VendorGuidance } from '@/components/ats';
import { ScoreGuidance } from '@/components/ScoreGuidance';
import { generateGuidance, GuidanceActionTarget } from '@/lib/analysis/scoreGuidance';
import { ExportableSession } from '@/lib/export/report';
import { detectATSVendor, VendorDetectionResult } from '@/lib/ats';
import { historyStore } from '@/lib/storage/historyStore';
import { ScoreSnapshot, JobMetadata } from '@/lib/types/history';
import { HistoryDashboard } from '@/components/history';
import { AnalysisSession, KnockoutItem, KeywordSet } from '@/lib/types/session';
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
import { useAuth } from '@/hooks/useAuth';
import { LlmConfig } from '@/lib/llm/types';

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
  const { config: llmConfig, updateConfig, setConsent } = useLlmConfig();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Free tier state
  const freeTier = useFreeTier();
  const [freeTierResult, setFreeTierResult] = useState<FreeTierAnalysisResult | null>(null);
  const [isFreeTierAnalyzing, setIsFreeTierAnalyzing] = useState(false);
  const [freeTierError, setFreeTierError] = useState<string | null>(null);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Progress tracking
  const { saveSession } = useProgress();
  const { hasAccess } = useAuth();

  // Handle LLM config save
  const handleSaveLlmConfig = async (newConfig: LlmConfig) => {
    await updateConfig(newConfig);
    // If user added an API key but hasn't consented yet, show consent modal
    if (newConfig.apiKey && !newConfig.hasConsented) {
      setShowConsentModal(true);
    }
  };

  // Handle consent
  const handleConsent = async () => {
    await setConsent(true);
  };

  // Handle free tier analysis (called as part of combined analysis)
  const runFreeTierAnalysis = useCallback(async () => {
    if (!session || !jobText.trim()) return;

    // Only run if free tier is available OR user has API key
    const hasApiKey = !!(llmConfig?.apiKey && llmConfig?.hasConsented);
    const canUseFreeT = freeTier.status?.enabled && (freeTier.status.remaining ?? 0) > 0;

    if (!canUseFreeT && !hasApiKey) {
      console.log('Skipping free tier: no uses remaining and no API key');
      return;
    }

    // If user has their own API key, skip free tier (they'll use BYOK)
    if (hasApiKey) {
      console.log('User has API key, skipping free tier');
      return;
    }

    setIsFreeTierAnalyzing(true);
    setFreeTierError(null);

    try {
      const result = await freeTier.analyze(session.resume.extractedText, jobText);
      setFreeTierResult(result);
    } catch (err) {
      console.error('Free tier analysis error:', err);
      setFreeTierError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsFreeTierAnalyzing(false);
    }
  }, [session, jobText, freeTier, llmConfig]);

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

  // Handle Escape key for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHistory) {
        setShowHistory(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showHistory]);

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
  }, [session, analysis, coverage, knockoutRisk, jobText, keywords, knockouts]);

  // Analyze job description
  const handleAnalyzeJD = useCallback(async () => {
    if (!session || !jobText.trim()) return;

    setIsAnalyzingJD(true);

    try {
      // Extract keywords
      const extractedKeywords = extractKeywords(jobText);
      setKeywords(extractedKeywords);

      // Detect knockouts and enhance with resume analysis
      const detectedKnockouts = detectKnockouts(jobText);

      // Enhance knockouts with auto-assessment based on resume
      const enhancedKnockouts = enhanceKnockoutsWithResume(
        detectedKnockouts,
        session.resume.extractedText,
        jobText
      );

      // Check for experience requirement knockout
      const experienceKnockout = detectExperienceKnockout(
        session.resume.extractedText,
        jobText
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
        jobText,
        extractedKeywords
      );
      setRecruiterSearch(recruiterSearchResult);

      // Calculate initial knockout risk (all unconfirmed)
      const riskResult = calculateKnockoutRisk(allKnockouts);
      setKnockoutRisk(riskResult);

      // Calculate semantic match if BYOK is configured
      if (llmConfig && isSemanticMatchAvailable(llmConfig)) {
        setIsAnalyzingSemantic(true);
        try {
          const semanticResult = await calculateSemanticMatch(
            session.resume.extractedText,
            jobText,
            llmConfig
          );
          setSemanticMatch(semanticResult);
        } catch (err) {
          console.error('Error calculating semantic match:', err);
        } finally {
          setIsAnalyzingSemantic(false);
        }
      }

      // Switch to job match tab
      setActiveTab('jobmatch');

      // Update progress tracking (mark that JD was added)
      if (session) {
        saveSession(session.id, session.resume.fileName, true);
      }

      // Auto-save to history
      if (!historySaved && session) {
        try {
          // Get parse health from the resume analysis
          const resumeAnalysis = analyzeResume(session.resume);
          const scoreSnapshot: ScoreSnapshot = {
            parseHealth: resumeAnalysis.scores.parseHealth,
            knockoutRisk: riskResult?.risk || 'low',
            semanticMatch: undefined, // Will be set after semantic analysis
            recruiterSearch: recruiterSearchResult?.score,
            keywordCoverage: coverageResult.score,
          };

          const jobMeta: JobMetadata | undefined = jobText.trim() ? {
            title: extractJobTitle(jobText),
            company: vendorResult?.vendor ? extractCompanyFromVendor(jobUrl) : undefined,
            url: jobUrl || undefined,
            atsVendor: vendorResult?.vendor || undefined,
            keywordCount: extractedKeywords.all.length,
          } : undefined;

          await historyStore.saveFromSession(session, scoreSnapshot, jobMeta);
          setHistorySaved(true);
        } catch (err) {
          console.error('Failed to save to history:', err);
        }
      }

      // Run free tier AI analysis - AWAIT it so user sees full loading state
      await runFreeTierAnalysis();
    } catch (err) {
      console.error('Error analyzing job description:', err);
    } finally {
      setIsAnalyzingJD(false);
    }
  }, [session, jobText, llmConfig, historySaved, vendorResult, jobUrl, runFreeTierAnalysis]);

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

  // Dynamic score-based guidance
  const guidanceItems = useMemo(() => {
    const hasApiKey = !!(llmConfig?.apiKey && llmConfig?.hasConsented);
    return generateGuidance({
      parseHealth: analysis?.scores.parseHealth ?? 0,
      knockoutRisk: knockoutRisk?.risk,
      knockoutCount: knockouts.length,
      semanticMatch: semanticMatch?.score,
      recruiterSearch: recruiterSearch?.score,
      keywordCoverage: coverage?.score,
      hasJobDescription: !!coverage,
      hasApiKey,
      hasAccess,
      freeTierRemaining: freeTier.status?.remaining,
    });
  }, [analysis, knockoutRisk, knockouts.length, semanticMatch, recruiterSearch, coverage, llmConfig, hasAccess, freeTier.status]);

  const handleGuidanceAction = useCallback((target: GuidanceActionTarget) => {
    switch (target) {
      case 'findings':
        setActiveTab('overview');
        break;
      case 'jobmatch':
        setActiveTab('jobmatch');
        break;
      case 'ai-settings':
        setShowKeyModal(true);
        break;
      case 'pricing':
        router.push('/pricing');
        break;
    }
  }, [router]);

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
              llmConfig?.apiKey && llmConfig?.hasConsented
                ? 'text-emerald-300 hover:text-emerald-200 bg-emerald-900/30 border-emerald-700/30 hover:border-emerald-500/50'
                : 'text-amber-300 hover:text-amber-200 bg-amber-900/30 border-amber-700/30 hover:border-amber-500/50'
            }`}
            title={llmConfig?.apiKey ? 'AI settings configured' : 'AI settings and Gemini key'}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium hidden sm:inline">
              {llmConfig?.apiKey && llmConfig?.hasConsented ? 'AI Settings ✓' : 'AI Settings'}
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
      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-32 pt-4">
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

        {/* Score Cards Grid - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <ScoreCardGrid
            scores={scores}
            knockoutRisk={knockoutRisk?.risk || 'low'}
            knockoutCount={knockouts.filter(k => k.userConfirmed === false || k.userConfirmed === undefined).length}
            semanticMatch={semanticMatch?.success ? semanticMatch.score : undefined}
            isSemanticLoading={isAnalyzingSemantic}
            recruiterSearch={recruiterSearch?.score}
            hasByokConfigured={!!llmConfig?.apiKey && !!llmConfig?.hasConsented}
            hasJobDescription={jobText.trim().length > 50}
            onConfigureByok={() => setShowKeyModal(true)}
            onAddJobDescription={() => {
              // Scroll to JD input
              document.getElementById('job-description-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </motion.div>

        {/* Main content grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`grid grid-cols-1 gap-4 md:gap-6 transition-all duration-300 ${
            sidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-3'
          }`}
        >
          {/* Left column - JD Input & PDF Signals (Collapsible) */}
          <div
            className={`transition-all duration-300 ${
              sidebarCollapsed
                ? 'lg:hidden'
                : 'lg:col-span-1 space-y-6'
            }`}
            id="job-description-section"
          >
            {/* Collapse button for desktop - inside sidebar */}
            <div className="hidden lg:flex justify-end mb-2">
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-200 bg-indigo-900/50 hover:bg-indigo-800/50 px-3 py-1.5 rounded-lg transition-colors"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
                <span>Collapse</span>
              </button>
            </div>

            {/* Layout signals (if PDF) */}
            {resume.extractionMeta.pdfSignals && (
              <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-5">
                <h3 className="text-sm font-bold text-white mb-4">
                  PDF Layout Signals
                </h3>
                <div className="space-y-3">
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
              </div>
            )}

            {/* Job Description Input */}
            <JobDescriptionInput
              jobText={jobText}
              onJobTextChange={setJobText}
              jobUrl={jobUrl}
              onJobUrlChange={handleJobUrlChange}
              vendorResult={vendorResult}
              onAnalyze={handleAnalyzeJD}
              isLoading={isAnalyzingJD}
              hasResume={true}
              parseScore={scores.parseHealth}
              hasApiKey={!!llmConfig?.apiKey && !!llmConfig?.hasConsented}
              onOpenApiKeyModal={() => setShowKeyModal(true)}
              freeTierStatus={freeTier.status}
            />
          </div>

          {/* Right column - Tabs */}
          <div className={sidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-2'}>
            {/* Expand sidebar button (when collapsed) */}
            {sidebarCollapsed && (
              <div className="hidden lg:flex mb-4">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-100 bg-indigo-900/50 hover:bg-indigo-800/50 px-4 py-2 rounded-xl border border-indigo-500/30 hover:border-indigo-500/50 transition-colors"
                  aria-label="Expand sidebar"
                >
                  <PanelLeft className="w-4 h-4" />
                  <span>Show Job Description</span>
                </button>
              </div>
            )}

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
                onClick={() => setActiveTab('jobmatch')}
                className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all duration-200 ${
                  activeTab === 'jobmatch'
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/20'
                    : 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-900/50'
                }`}
              >
                Job Match
                {coverage && (
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs rounded-full font-bold ${
                      coverage.score >= 80
                        ? 'bg-emerald-500/30 text-emerald-300'
                        : coverage.score >= 50
                          ? 'bg-yellow-500/30 text-yellow-300'
                          : 'bg-red-500/30 text-red-300'
                    }`}
                  >
                    {coverage.score}%
                  </span>
                )}
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
              <div className="space-y-6">
                {/* Findings Panel - Issues and recommendations */}
                <FindingsPanel findings={findings} />

                {/* Dynamic score-based guidance */}
                <ScoreGuidance items={guidanceItems} onAction={handleGuidanceAction} />
              </div>
            )}

            {activeTab === 'jobmatch' && (
              <div className="space-y-4">
                {/* Vendor Guidance (if detected) */}
                {vendorResult?.detected && (
                  <VendorGuidance
                    vendor={vendorResult.vendor || null}
                    confidence={vendorResult.confidence}
                    compact={!!coverage}
                  />
                )}

                {!coverage ? (
                  <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-8 text-center">
                    <div className="w-16 h-16 bg-indigo-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                      <FileText className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      No Job Description Analyzed
                    </h3>
                    <p className="text-indigo-300 text-sm max-w-md mx-auto mb-4">
                      Paste a job description to see how well your resume matches the requirements.
                    </p>
                    <p className="text-indigo-400 text-xs">
                      Use the input panel on the left (or scroll down on mobile)
                    </p>
                  </div>
                ) : (
                  <JobMatchStepper
                    semanticMatch={semanticMatch || undefined}
                    recruiterSearch={recruiterSearch || undefined}
                    coverage={coverage}
                    knockoutRisk={knockoutRisk || undefined}
                    knockouts={knockouts}
                    keywords={keywords}
                    llmConfig={llmConfig}
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
                    onFreeTierAnalyze={runFreeTierAnalysis}
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
          </div>
        </motion.div>

        {/* Privacy reminder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center text-xs text-indigo-400 flex items-center justify-center gap-2"
        >
          <Shield className="w-4 h-4" />
          <span>Your data stays in your browser. Nothing was uploaded to our servers.</span>
        </motion.div>
      </main>

      {/* Mobile FAB - Shows when job description section is out of view */}
      <MobileActionButton
        targetId="job-description-section"
        isComplete={!!coverage}
        label="Add Job Description"
      />

      {/* Sticky Footer - Analyze Another Resume */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-indigo-950 via-indigo-950/95 to-transparent pt-6 pb-4 pointer-events-none"
      >
        <div className="max-w-6xl mx-auto px-6 flex justify-center pointer-events-auto">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105"
          >
            Analyze Another Resume
          </button>
        </div>
      </motion.div>

      {/* BYOK Modals */}
      <ByokKeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onSave={handleSaveLlmConfig}
        currentConfig={llmConfig || undefined}
      />

      <ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsent={handleConsent}
        providerName={llmConfig?.provider === 'gemini' ? 'Google Gemini' : 'the AI provider'}
      />

      {/* History Modal */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-modal-title"
        >
          <div className="min-h-screen px-4 py-8">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
              aria-hidden="true"
            />

            {/* Modal Content */}
            <div className="relative z-10 max-w-4xl mx-auto">
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
        </div>
      )}
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
