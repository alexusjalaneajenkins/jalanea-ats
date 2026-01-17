'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PlainTextPreview } from '@/components/PlainTextPreview';
import { ScoreCard } from '@/components/ScoreCard';
import { FindingsPanel } from '@/components/FindingsPanel';
import { JobDescriptionInput } from '@/components/JobDescriptionInput';
import { KnockoutChecklist } from '@/components/KnockoutChecklist';
import { KeywordCoveragePanel } from '@/components/KeywordCoveragePanel';
import { AiFeaturesPanel } from '@/components/AiFeaturesPanel';
import { ByokKeyModal } from '@/components/ByokKeyModal';
import { ConsentModal } from '@/components/ConsentModal';
import { ExportButtons } from '@/components/ExportButtons';
import { ExportableSession } from '@/lib/export/report';
import { AnalysisSession, scoreToGrade, KnockoutItem, KeywordSet } from '@/lib/types/session';
import { sessionStore } from '@/lib/storage/sessionStore';
import {
  analyzeResume,
  extractKeywords,
  detectKnockouts,
  calculateCoverage,
  calculateKnockoutRisk,
  CoverageResult,
  KnockoutRiskResult,
  Finding,
} from '@/lib/analysis';
import { useLlmConfig } from '@/hooks/useLlmConfig';
import { LlmConfig } from '@/lib/llm/types';

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
  const [activeTab, setActiveTab] = useState<'findings' | 'jobmatch' | 'preview'>('findings');

  // Job description state
  const [jobText, setJobText] = useState('');
  const [isAnalyzingJD, setIsAnalyzingJD] = useState(false);
  const [keywords, setKeywords] = useState<KeywordSet | null>(null);
  const [knockouts, setKnockouts] = useState<KnockoutItem[]>([]);
  const [coverage, setCoverage] = useState<CoverageResult | null>(null);
  const [knockoutRisk, setKnockoutRisk] = useState<KnockoutRiskResult | null>(null);

  // BYOK (AI Features) state
  const { config: llmConfig, updateConfig, setConsent } = useLlmConfig();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Handle LLM config save
  const handleSaveLlmConfig = async (newConfig: LlmConfig) => {
    await updateConfig(newConfig);
  };

  // Handle consent
  const handleConsent = async () => {
    await setConsent(true);
  };

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

      // Detect knockouts
      const detectedKnockouts = detectKnockouts(jobText);
      setKnockouts(detectedKnockouts);

      // Calculate coverage
      const coverageResult = calculateCoverage(
        session.resume.extractedText,
        extractedKeywords
      );
      setCoverage(coverageResult);

      // Calculate initial knockout risk (all unconfirmed)
      const riskResult = calculateKnockoutRisk(detectedKnockouts);
      setKnockoutRisk(riskResult);

      // Switch to job match tab
      setActiveTab('jobmatch');
    } catch (err) {
      console.error('Error analyzing job description:', err);
    } finally {
      setIsAnalyzingJD(false);
    }
  }, [session, jobText]);

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !session || !analysis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Session Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/analyze')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
  const grade = scoreToGrade(scores.parseHealth);

  // Combine findings with JD findings
  const allFindings: Finding[] = [
    ...findings,
    ...(coverage?.findings || []),
    ...(knockoutRisk?.findings || []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a href="/analyze" className="hover:text-gray-700 transition-colors">
              Analyze
            </a>
            <span>/</span>
            <span>Results</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Analysis Results</h1>
            {exportSession && <ExportButtons session={exportSession} compact />}
          </div>
        </div>

        {/* File info card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                resume.fileType === 'pdf' ? 'bg-red-100' : 'bg-blue-100'
              }`}
            >
              <svg
                className={`w-5 h-5 ${
                  resume.fileType === 'pdf' ? 'text-red-600' : 'text-blue-600'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-medium text-gray-900">{resume.fileName}</h2>
              <p className="text-sm text-gray-500">
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
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Score Card & JD Input */}
          <div className="lg:col-span-1 space-y-6">
            <ScoreCard scores={scores} />

            {/* Layout signals (if PDF) */}
            {resume.extractionMeta.pdfSignals && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  PDF Layout Signals
                </h3>
                <div className="space-y-2">
                  <SignalRow
                    label="Columns"
                    value={resume.extractionMeta.pdfSignals.estimatedColumns.toString()}
                    status={
                      resume.extractionMeta.pdfSignals.estimatedColumns === 1
                        ? 'good'
                        : 'warn'
                    }
                  />
                  <SignalRow
                    label="Column Risk"
                    value={capitalize(resume.extractionMeta.pdfSignals.columnMergeRisk)}
                    status={riskToStatus(resume.extractionMeta.pdfSignals.columnMergeRisk)}
                  />
                  <SignalRow
                    label="Header Risk"
                    value={capitalize(resume.extractionMeta.pdfSignals.headerContactRisk)}
                    status={riskToStatus(
                      resume.extractionMeta.pdfSignals.headerContactRisk
                    )}
                  />
                  <SignalRow
                    label="Text Density"
                    value={capitalize(resume.extractionMeta.pdfSignals.textDensity)}
                    status={
                      resume.extractionMeta.pdfSignals.textDensity === 'low'
                        ? 'warn'
                        : 'good'
                    }
                  />
                </div>
              </div>
            )}

            {/* Job Description Input */}
            <JobDescriptionInput
              jobText={jobText}
              onJobTextChange={setJobText}
              onAnalyze={handleAnalyzeJD}
              isLoading={isAnalyzingJD}
              hasResume={true}
            />
          </div>

          {/* Right column - Tabs */}
          <div className="lg:col-span-2">
            {/* Tab buttons */}
            <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('findings')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'findings'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Findings
              </button>
              <button
                onClick={() => setActiveTab('jobmatch')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'jobmatch'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Job Match
                {coverage && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                      coverage.score >= 80
                        ? 'bg-green-100 text-green-700'
                        : coverage.score >= 50
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {coverage.score}%
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Preview
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'findings' && <FindingsPanel findings={findings} />}

            {activeTab === 'jobmatch' && (
              <div className="space-y-6">
                {!coverage ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      No Job Description Analyzed
                    </h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                      Paste a job description in the panel on the left and click
                      "Analyze Job Match" to see how well your resume matches the
                      requirements.
                    </p>
                  </div>
                ) : (
                  <>
                    <KeywordCoveragePanel coverage={coverage} />
                    <KnockoutChecklist
                      knockouts={knockouts}
                      onKnockoutChange={handleKnockoutChange}
                      riskLevel={knockoutRisk?.risk || 'low'}
                      riskExplanation={
                        knockoutRisk?.explanation ||
                        'No disqualifier requirements detected.'
                      }
                    />
                    {/* AI Features Panel (BYOK) */}
                    <AiFeaturesPanel
                      config={llmConfig}
                      resumeText={resume.extractedText}
                      jobDescriptionText={jobText}
                      criticalKeywords={keywords?.critical || []}
                      optionalKeywords={keywords?.optional || []}
                      matchedKeywords={coverage?.foundKeywords || []}
                      missingKeywords={coverage?.missingKeywords || []}
                      onConfigureClick={() => setShowKeyModal(true)}
                      onConsentClick={() => setShowConsentModal(true)}
                    />
                  </>
                )}
              </div>
            )}

            {activeTab === 'preview' && (
              <PlainTextPreview
                text={resume.extractedText}
                title="Extracted Text"
                subtitle="This is what ATS software typically extracts from your resume"
                maxHeight={600}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/analyze')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Analyze Another Resume
          </button>
        </div>

        {/* Privacy reminder */}
        <div className="mt-8 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          Your data stays in your browser. Nothing was uploaded to our servers.
        </div>
      </div>

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
    </div>
  );
}

/**
 * Signal row component for displaying PDF layout signals.
 */
function SignalRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'good' | 'warn' | 'risk';
}) {
  const statusColors = {
    good: 'text-green-600',
    warn: 'text-amber-600',
    risk: 'text-red-600',
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
      <span className="text-gray-600">{label}</span>
      <div className={`flex items-center gap-1 ${statusColors[status]}`}>
        <span className="font-medium">{value}</span>
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
