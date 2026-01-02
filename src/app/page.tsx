'use client';

import { useState } from 'react';
import { FileText, Briefcase, Sparkles, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface ATSResult {
  score: number;
  summary: string;
  keywordMatches: {
    found: string[];
    missing: string[];
    matchRate: number;
  };
  sections: {
    name: string;
    score: number;
    feedback: string;
  }[];
  formatting: {
    issues: string[];
    suggestions: string[];
  };
  overallSuggestions: string[];
}

// Score Display Component
function ScoreDisplay({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 75) return { stroke: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    if (score >= 50) return { stroke: '#f59e0b', text: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { stroke: '#ef4444', text: 'text-red-500', bg: 'bg-red-500/10' };
  };

  const colors = getScoreColor();
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Needs Work' : 'Poor Match';

  return (
    <div className="flex flex-col items-center animate-scale-in">
      <div className="relative w-40 h-40">
        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(51 65 85)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-score-fill"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${colors.text}`}>{score}</span>
          <span className="text-forge-muted text-sm">/ 100</span>
        </div>
      </div>
      <span className={`mt-3 px-4 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
        {label}
      </span>
    </div>
  );
}

// Keyword Analysis Component
function KeywordAnalysis({ matches }: { matches: ATSResult['keywordMatches'] }) {
  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-forge-text">Keyword Analysis</h3>
        <span className="text-sm text-forge-muted">{matches.matchRate}% match rate</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-forge-800 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-forge-accent to-orange-500 rounded-full transition-all duration-1000"
          style={{ width: `${matches.matchRate}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Found Keywords */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-forge-text">Found ({matches.found.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {matches.found.slice(0, 10).map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20"
              >
                {keyword}
              </span>
            ))}
            {matches.found.length > 10 && (
              <span className="px-2 py-1 text-xs text-forge-muted">
                +{matches.found.length - 10} more
              </span>
            )}
          </div>
        </div>

        {/* Missing Keywords */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-forge-text">Missing ({matches.missing.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {matches.missing.slice(0, 10).map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded-lg border border-red-500/20"
              >
                {keyword}
              </span>
            ))}
            {matches.missing.length > 10 && (
              <span className="px-2 py-1 text-xs text-forge-muted">
                +{matches.missing.length - 10} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Section Breakdown Component
function SectionBreakdown({ sections }: { sections: ATSResult['sections'] }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-500 bg-emerald-500';
    if (score >= 50) return 'text-amber-500 bg-amber-500';
    return 'text-red-500 bg-red-500';
  };

  return (
    <div className="animate-fade-in-up stagger-2">
      <h3 className="text-lg font-semibold text-forge-text mb-4">Section Breakdown</h3>
      <div className="space-y-2">
        {sections.map((section, i) => (
          <div
            key={i}
            className="bg-forge-800/50 rounded-xl border border-forge-700 overflow-hidden"
          >
            <button
              onClick={() => setExpandedSection(expandedSection === section.name ? null : section.name)}
              className="w-full flex items-center justify-between p-4 hover:bg-forge-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${getScoreColor(section.score).split(' ')[0]} bg-opacity-10`}
                  style={{ backgroundColor: `${getScoreColor(section.score).split(' ')[1].replace('bg-', '')}20` }}
                >
                  {section.score}
                </div>
                <span className="font-medium text-forge-text">{section.name}</span>
              </div>
              {expandedSection === section.name ? (
                <ChevronUp className="w-5 h-5 text-forge-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-forge-muted" />
              )}
            </button>
            {expandedSection === section.name && (
              <div className="px-4 pb-4 text-sm text-forge-muted">
                {section.feedback}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Suggestions Component
function SuggestionsList({ suggestions, formatting }: { suggestions: string[]; formatting: ATSResult['formatting'] }) {
  return (
    <div className="animate-fade-in-up stagger-3 space-y-6">
      {/* Formatting Issues */}
      {formatting.issues.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-lg font-semibold text-forge-text">Formatting Issues</h3>
          </div>
          <ul className="space-y-2">
            {formatting.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-forge-muted">
                <span className="text-amber-500 mt-1">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-forge-accent" />
          <h3 className="text-lg font-semibold text-forge-text">Top Suggestions</h3>
        </div>
        <ul className="space-y-3">
          {suggestions.map((suggestion, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-3 bg-forge-accent/5 rounded-xl border border-forge-accent/20"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-forge-accent/20 text-forge-accent text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm text-forge-text">{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Main Page Component
export default function Home() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState<ATSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      setError('Please enter both your resume and the job description');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setResume('');
    setJobDescription('');
    setResult(null);
    setError('');
  };

  return (
    <main className="min-h-screen bg-forge-950">
      {/* Header */}
      <header className="border-b border-forge-700 bg-forge-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forge-accent to-orange-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-forge-text">Jalanea ATS</h1>
              <p className="text-xs text-forge-muted">AI Resume Score Checker</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        {!result && (
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-forge-text mb-4">
              Check Your <span className="text-forge-accent">ATS Score</span>
            </h2>
            <p className="text-forge-muted text-lg max-w-2xl mx-auto">
              See how well your resume matches the job description. Get actionable suggestions to optimize your resume before applying.
            </p>
          </div>
        )}

        <div className={`grid gap-8 ${result ? 'lg:grid-cols-2' : 'lg:grid-cols-2'}`}>
          {/* Input Section */}
          <div className="space-y-6">
            {/* Resume Input */}
            <div className="bg-forge-900 rounded-2xl border border-forge-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-forge-accent" />
                <label className="font-semibold text-forge-text">Your Resume</label>
                <span className="ml-auto text-xs text-forge-muted">{resume.length} chars</span>
              </div>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste your resume text here..."
                className="w-full h-48 bg-forge-800 border border-forge-700 rounded-xl p-4 text-forge-text placeholder-forge-muted resize-none focus:outline-none focus:border-forge-accent transition-colors"
              />
            </div>

            {/* Job Description Input */}
            <div className="bg-forge-900 rounded-2xl border border-forge-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-forge-accent" />
                <label className="font-semibold text-forge-text">Job Description</label>
                <span className="ml-auto text-xs text-forge-muted">{jobDescription.length} chars</span>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-48 bg-forge-800 border border-forge-700 rounded-xl p-4 text-forge-text placeholder-forge-muted resize-none focus:outline-none focus:border-forge-accent transition-colors"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={loading || !resume.trim() || !jobDescription.trim()}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-forge-accent to-orange-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Analyze Resume
                  </>
                )}
              </button>
              {(resume || jobDescription) && (
                <button
                  onClick={handleClear}
                  className="py-4 px-6 bg-forge-800 text-forge-text font-semibold rounded-xl hover:bg-forge-700 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {loading && (
              <div className="bg-forge-900 rounded-2xl border border-forge-700 p-12 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-forge-700 border-t-forge-accent animate-spin" />
                  <Sparkles className="w-6 h-6 text-forge-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-4 text-forge-muted">Analyzing your resume...</p>
                <p className="text-sm text-forge-muted/60">This may take a few seconds</p>
              </div>
            )}

            {result && (
              <>
                {/* Score Card */}
                <div className="bg-forge-900 rounded-2xl border border-forge-700 p-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <ScoreDisplay score={result.score} />
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-xl font-semibold text-forge-text mb-2">ATS Compatibility Score</h3>
                      <p className="text-forge-muted">{result.summary}</p>
                    </div>
                  </div>
                </div>

                {/* Keyword Analysis */}
                <div className="bg-forge-900 rounded-2xl border border-forge-700 p-6">
                  <KeywordAnalysis matches={result.keywordMatches} />
                </div>

                {/* Section Breakdown */}
                <div className="bg-forge-900 rounded-2xl border border-forge-700 p-6">
                  <SectionBreakdown sections={result.sections} />
                </div>

                {/* Suggestions */}
                <div className="bg-forge-900 rounded-2xl border border-forge-700 p-6">
                  <SuggestionsList
                    suggestions={result.overallSuggestions}
                    formatting={result.formatting}
                  />
                </div>
              </>
            )}

            {!loading && !result && (
              <div className="bg-forge-900 rounded-2xl border border-forge-700 border-dashed p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-forge-800 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-forge-muted" />
                </div>
                <h3 className="text-lg font-semibold text-forge-text mb-2">Ready to Analyze</h3>
                <p className="text-forge-muted text-sm max-w-xs">
                  Paste your resume and the job description, then click "Analyze Resume" to get your ATS score.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-forge-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-forge-muted">
          <p>Powered by AI. Built by Jalanea.</p>
        </div>
      </footer>
    </main>
  );
}
