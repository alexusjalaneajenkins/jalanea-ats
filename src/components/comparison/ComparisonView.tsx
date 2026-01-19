'use client';

import { useState, useCallback } from 'react';
import {
  Layers,
  Plus,
  FileText,
  Link2,
  X,
  Loader2,
  Bot,
  Search,
} from 'lucide-react';
import {
  ComparisonJob,
  CommonMissingKeyword,
  ComparisonRecommendation,
  calculateCommonMissing,
  generateRecommendations,
} from '@/lib/types/comparison';
import { detectATSVendor } from '@/lib/ats';
import { JobComparisonTable } from './JobComparisonTable';
import { MissingKeywordsPanel } from './MissingKeywordsPanel';

interface ComparisonViewProps {
  resumeText: string;
  resumeFileName: string;
  /** Function to analyze a job description and get scores/keywords */
  onAnalyzeJob: (jobText: string) => Promise<{
    scores: {
      parseHealth: number;
      knockoutRisk: 'low' | 'medium' | 'high';
      semanticMatch?: number;
      recruiterSearch?: number;
      keywordCoverage?: number;
    };
    matchedKeywords: string[];
    missingKeywords: string[];
  }>;
  /** Whether semantic analysis is available (BYOK configured) */
  hasSemanticAnalysis?: boolean;
}

/**
 * Comparison View
 *
 * Main component for comparing one resume against multiple job descriptions.
 */
export function ComparisonView({
  resumeText,
  resumeFileName,
  onAnalyzeJob,
  hasSemanticAnalysis = false,
}: ComparisonViewProps) {
  const [jobs, setJobs] = useState<ComparisonJob[]>([]);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [newJobText, setNewJobText] = useState('');
  const [newJobUrl, setNewJobUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calculate common missing keywords and recommendations
  const commonMissing: CommonMissingKeyword[] = calculateCommonMissing(jobs);
  const recommendations: ComparisonRecommendation[] = generateRecommendations(jobs, commonMissing);

  // Extract job title from text
  const extractJobTitle = (text: string): string => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return 'Untitled Job';

    const firstLine = lines[0].trim()
      .replace(/^(job title|position|role):\s*/i, '')
      .replace(/\s*[-|]\s*.*$/, '')
      .trim();

    if (firstLine.length > 60) {
      return firstLine.substring(0, 57) + '...';
    }

    return firstLine || 'Untitled Job';
  };

  // Extract company from URL
  const extractCompany = (url: string): string | undefined => {
    if (!url) return undefined;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;

      if (hostname.includes('greenhouse.io')) {
        const match = pathname.match(/^\/([^/]+)/);
        if (match) return match[1].replace(/-/g, ' ');
      }

      if (hostname.includes('lever.co')) {
        const match = pathname.match(/^\/([^/]+)/);
        if (match) return match[1].replace(/-/g, ' ');
      }

      if (hostname.includes('myworkdayjobs.com')) {
        const match = hostname.match(/^([^.]+)\./);
        if (match) return match[1].replace(/-/g, ' ');
      }

      return undefined;
    } catch {
      return undefined;
    }
  };

  // Add a new job to comparison
  const handleAddJob = useCallback(async () => {
    if (!newJobText.trim() || isAnalyzing) return;

    setIsAnalyzing(true);

    try {
      // Detect ATS vendor from URL
      const vendorResult = newJobUrl ? detectATSVendor(newJobUrl) : null;

      // Analyze the job
      const result = await onAnalyzeJob(newJobText);

      // Create new comparison job
      const newJob: ComparisonJob = {
        id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: extractJobTitle(newJobText),
        company: extractCompany(newJobUrl),
        url: newJobUrl || undefined,
        atsVendor: vendorResult?.vendor || undefined,
        rawText: newJobText,
        scores: result.scores,
        matchedKeywords: result.matchedKeywords,
        missingKeywords: result.missingKeywords,
        addedAt: new Date().toISOString(),
      };

      setJobs(prev => [...prev, newJob]);
      setNewJobText('');
      setNewJobUrl('');
      setIsAddingJob(false);
    } catch (error) {
      console.error('Failed to analyze job:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [newJobText, newJobUrl, onAnalyzeJob, isAnalyzing]);

  // Delete a job from comparison
  const handleDeleteJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
              <Layers className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Multi-Job Comparison
              </h2>
              <p className="text-sm text-indigo-300">
                Compare <span className="text-white font-medium">{resumeFileName}</span> against multiple jobs
              </p>
            </div>
          </div>

          {!isAddingJob && (
            <button
              onClick={() => setIsAddingJob(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Job
            </button>
          )}
        </div>

        {/* BYOK Notice */}
        {!hasSemanticAnalysis && jobs.length === 0 && (
          <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <p className="text-sm text-purple-200">
              <span className="font-medium">Tip:</span> Configure your AI API key for semantic matching scores.
              Without it, comparison will use keyword matching only.
            </p>
          </div>
        )}
      </div>

      {/* Add Job Form */}
      {isAddingJob && (
        <div className="bg-indigo-900/30 rounded-2xl border border-indigo-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Add Job Description
            </h3>
            <button
              onClick={() => {
                setIsAddingJob(false);
                setNewJobText('');
                setNewJobUrl('');
              }}
              className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-800/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* URL Input */}
          <div>
            <label className="text-xs text-indigo-400 mb-1 block">
              Job Posting URL (optional - for ATS detection)
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
              <input
                type="url"
                value={newJobUrl}
                onChange={(e) => setNewJobUrl(e.target.value)}
                placeholder="https://boards.greenhouse.io/..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-indigo-950/50 border border-indigo-500/30 rounded-lg text-indigo-100 placeholder-indigo-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
            {newJobUrl && detectATSVendor(newJobUrl).detected && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-indigo-400">Detected:</span>
                <span
                  className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                    ${detectATSVendor(newJobUrl).vendor?.type === 'sorter'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                    }
                  `}
                >
                  <span>{detectATSVendor(newJobUrl).vendor?.icon}</span>
                  <span>{detectATSVendor(newJobUrl).vendor?.name}</span>
                  {detectATSVendor(newJobUrl).vendor?.type === 'sorter' ? (
                    <Bot className="w-3 h-3" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Job Text Input */}
          <div>
            <label className="text-xs text-indigo-400 mb-1 block">
              Job Description Text
            </label>
            <textarea
              value={newJobText}
              onChange={(e) => setNewJobText(e.target.value)}
              placeholder="Paste the full job description here..."
              className="w-full h-40 p-3 text-sm bg-indigo-950/50 border border-indigo-500/30 rounded-lg text-indigo-100 placeholder-indigo-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setIsAddingJob(false);
                setNewJobText('');
                setNewJobUrl('');
              }}
              className="px-4 py-2 text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddJob}
              disabled={!newJobText.trim() || isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add to Comparison
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length > 0 && (
        <JobComparisonTable
          jobs={jobs}
          onDeleteJob={handleDeleteJob}
          highlightBestMatch={jobs.length > 1}
        />
      )}

      {/* Missing Keywords & Recommendations */}
      {jobs.length >= 2 && (
        <MissingKeywordsPanel
          keywords={commonMissing}
          totalJobs={jobs.length}
          recommendations={recommendations}
        />
      )}

      {/* Empty State */}
      {jobs.length === 0 && !isAddingJob && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-indigo-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
            <Layers className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Jobs to Compare</h3>
          <p className="text-indigo-300 text-sm max-w-md mx-auto mb-6">
            Add multiple job descriptions to see which roles match your resume best
            and find common skill gaps.
          </p>
          <button
            onClick={() => setIsAddingJob(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add First Job
          </button>
        </div>
      )}
    </div>
  );
}
