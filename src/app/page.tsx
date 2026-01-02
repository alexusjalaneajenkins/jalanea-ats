'use client';

import { useState, useEffect } from 'react';
import { FileText, Briefcase, Sparkles, CheckCircle2, XCircle, AlertTriangle, ChevronDown, Loader2, Zap, Target, TrendingUp, Rocket, ArrowRight, RotateCcw } from 'lucide-react';

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

// Confetti Component
function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);

  useEffect(() => {
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 rounded-sm animate-confetti"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Loading messages
const loadingMessages = [
  { text: "Reading through your experience...", emoji: "📖" },
  { text: "Matching keywords like a detective...", emoji: "🔍" },
  { text: "Checking those bullet points...", emoji: "✨" },
  { text: "Analyzing your superpowers...", emoji: "💪" },
  { text: "Crunching the numbers...", emoji: "🧮" },
  { text: "Almost there, hang tight!", emoji: "🚀" },
];

// Score reactions
const getScoreReaction = (score: number) => {
  if (score >= 90) return { emoji: "🎉", message: "Outstanding! Your resume is ATS gold!" };
  if (score >= 75) return { emoji: "🔥", message: "You're on fire! Just a few tweaks away from perfect." };
  if (score >= 60) return { emoji: "💪", message: "Solid foundation! Let's level it up." };
  if (score >= 40) return { emoji: "🛠️", message: "Room for improvement, but nothing we can't fix!" };
  return { emoji: "🌱", message: "Everyone starts somewhere! Let's grow together." };
};

// Score Display
function ScoreDisplay({ score, summary }: { score: number; summary: string }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const reaction = getScoreReaction(score);

  const getScoreColor = () => {
    if (score >= 75) return { stroke: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500' };
    if (score >= 50) return { stroke: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500' };
  };

  const colors = getScoreColor();

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 animate-scale-in">
      <div className="relative w-48 h-48 flex-shrink-0">
        <div className={`absolute inset-4 rounded-full blur-2xl opacity-20 ${colors.bg}`} />
        <svg className="w-48 h-48 -rotate-90 relative z-10" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgb(51 65 85)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className={`text-5xl font-bold ${colors.text}`}>{score}</span>
          <span className="text-forge-muted text-sm">out of 100</span>
        </div>
      </div>
      <div className="text-center md:text-left">
        <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
          <span className="text-4xl animate-bounce-gentle">{reaction.emoji}</span>
          <h3 className="text-2xl font-bold text-forge-text">Your ATS Score</h3>
        </div>
        <p className={`text-lg font-medium ${colors.text} mb-2`}>{reaction.message}</p>
        <p className="text-forge-muted max-w-md">{summary}</p>
      </div>
    </div>
  );
}

// Keyword Analysis
function KeywordAnalysis({ matches }: { matches: ATSResult['keywordMatches'] }) {
  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-forge-accent" />
          <h3 className="text-lg font-semibold text-forge-text">Keyword Match</h3>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${
          matches.matchRate >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
          matches.matchRate >= 40 ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {matches.matchRate}%
        </span>
      </div>

      <div className="h-2 bg-forge-800 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-forge-accent to-amber-400 rounded-full transition-all duration-1000"
          style={{ width: `${matches.matchRate}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Found ({matches.found.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matches.found.slice(0, 6).map((kw, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-300 rounded-md">
                {kw}
              </span>
            ))}
            {matches.found.length > 6 && (
              <span className="px-2 py-0.5 text-xs text-emerald-400/60">+{matches.found.length - 6}</span>
            )}
          </div>
        </div>

        <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">Missing ({matches.missing.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matches.missing.slice(0, 6).map((kw, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-red-500/10 text-red-300 rounded-md">
                {kw}
              </span>
            ))}
            {matches.missing.length > 6 && (
              <span className="px-2 py-0.5 text-xs text-red-400/60">+{matches.missing.length - 6}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Section Breakdown
function SectionBreakdown({ sections }: { sections: ATSResult['sections'] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const getStyle = (score: number) => {
    if (score >= 75) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (score >= 50) return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-forge-accent" />
        <h3 className="text-lg font-semibold text-forge-text">Section Scores</h3>
      </div>
      <div className="space-y-2">
        {sections.map((s, i) => (
          <div key={i} className="bg-forge-800/30 rounded-xl border border-forge-700/50 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === s.name ? null : s.name)}
              className="w-full flex items-center justify-between p-3 hover:bg-forge-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border ${getStyle(s.score)}`}>
                  {s.score}
                </div>
                <span className="font-medium text-forge-text">{s.name}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-forge-muted transition-transform ${expanded === s.name ? 'rotate-180' : ''}`} />
            </button>
            {expanded === s.name && (
              <div className="px-4 pb-4 text-sm text-forge-muted">{s.feedback}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Suggestions
function Suggestions({ suggestions, formatting }: { suggestions: string[]; formatting: ATSResult['formatting'] }) {
  return (
    <div className="animate-fade-in-up space-y-6">
      {formatting.issues.length > 0 && (
        <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="font-semibold text-amber-400">Quick Fixes</h4>
          </div>
          <ul className="space-y-1.5">
            {formatting.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-forge-muted">
                <span className="text-amber-400">→</span>{issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="w-5 h-5 text-forge-accent" />
          <h3 className="text-lg font-semibold text-forge-text">Top Improvements</h3>
        </div>
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-forge-800/30 rounded-xl border border-forge-700/50">
              <span className="w-6 h-6 rounded-md bg-forge-accent/20 text-forge-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-forge-text">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function Home() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState<ATSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msgIdx, setMsgIdx] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setMsgIdx((p) => (p + 1) % loadingMessages.length), 2000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (result && result.score >= 75) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const handleAnalyze = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      setError('Please paste both your resume and the job description');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setMsgIdx(0);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setResume('');
    setJobDescription('');
    setError('');
  };

  return (
    <main className="min-h-screen bg-forge-950">
      {showConfetti && <Confetti />}

      {/* Header */}
      <header className="border-b border-forge-700/50 bg-forge-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-forge-accent to-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-forge-text">Jalanea ATS</span>
          </div>
          <span className="text-xs text-forge-muted hidden sm:block">Free forever • No signup</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero - only show when no result */}
        {!result && !loading && (
          <div className="text-center mb-10 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-forge-accent/10 rounded-full text-forge-accent text-sm mb-4">
              <Zap className="w-4 h-4" />
              AI-Powered Analysis
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-forge-text mb-3">
              Will your resume{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-forge-accent to-amber-400">
                beat the bots?
              </span>
            </h1>
            <p className="text-forge-muted max-w-xl mx-auto">
              Paste your resume and job description below to see your ATS compatibility score.
            </p>
          </div>
        )}

        {/* Input Section */}
        {!result && !loading && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Two column inputs on desktop */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-forge-accent" />
                  <label className="font-medium text-forge-text text-sm">Your Resume</label>
                  <span className="ml-auto text-xs text-forge-muted">{resume.length.toLocaleString()}</span>
                </div>
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="Paste your full resume text here..."
                  className="w-full h-56 bg-forge-800/50 border border-forge-700/50 rounded-xl p-4 text-forge-text text-sm placeholder-forge-muted/50 resize-none focus:outline-none focus:border-forge-accent transition-colors"
                />
              </div>

              <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-forge-accent" />
                  <label className="font-medium text-forge-text text-sm">Job Description</label>
                  <span className="ml-auto text-xs text-forge-muted">{jobDescription.length.toLocaleString()}</span>
                </div>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job posting here..."
                  className="w-full h-56 bg-forge-800/50 border border-forge-700/50 rounded-xl p-4 text-forge-text text-sm placeholder-forge-muted/50 resize-none focus:outline-none focus:border-forge-accent transition-colors"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4" />{error}
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!resume.trim() || !jobDescription.trim()}
              className="w-full py-4 bg-gradient-to-r from-forge-accent to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-forge-accent/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Analyze My Resume
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full border-4 border-forge-700 border-t-forge-accent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">{loadingMessages[msgIdx].emoji}</span>
              </div>
            </div>
            <p className="text-forge-text font-medium text-lg">{loadingMessages[msgIdx].text}</p>
            <p className="text-forge-muted text-sm mt-2">This takes about 5-10 seconds</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Score Hero */}
            <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-6 md:p-8">
              <ScoreDisplay score={result.score} summary={result.summary} />
            </div>

            {/* Two column results on desktop */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-6">
                <KeywordAnalysis matches={result.keywordMatches} />
              </div>
              <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-6">
                <SectionBreakdown sections={result.sections} />
              </div>
            </div>

            {/* Full width suggestions */}
            <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-6">
              <Suggestions suggestions={result.overallSuggestions} formatting={result.formatting} />
            </div>

            {/* Reset */}
            <div className="text-center pt-4">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-6 py-3 bg-forge-800 text-forge-text rounded-xl hover:bg-forge-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-forge-700/50 mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-forge-muted">
          Built with 💜 by Jalanea • Your data is never stored
        </div>
      </footer>
    </main>
  );
}
