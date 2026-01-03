'use client';

import { useState, useEffect } from 'react';
import { FileText, Briefcase, CheckCircle2, XCircle, AlertTriangle, ChevronDown, Loader2, Target, TrendingUp, Rocket, ArrowRight, RotateCcw, Zap, Shield } from 'lucide-react';
import Image from 'next/image';

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
    const colors = ['#f59e0b', '#fbbf24', '#22c55e', '#3b82f6', '#8b5cf6'];
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
          style={{ left: `${p.x}%`, backgroundColor: p.color, animationDelay: `${p.delay}s` }}
        />
      ))}
    </div>
  );
}

// Loading messages
const loadingMessages = [
  { text: "Scanning your resume...", emoji: "🔍" },
  { text: "Matching keywords...", emoji: "🎯" },
  { text: "Analyzing sections...", emoji: "📊" },
  { text: "Calculating your score...", emoji: "⚡" },
  { text: "Almost there...", emoji: "🚀" },
];

// Score reactions
const getScoreReaction = (score: number) => {
  if (score >= 90) return { emoji: "🎉", message: "You're crushing it! ATS won't know what hit it." };
  if (score >= 75) return { emoji: "💪", message: "Strong! A few tweaks and you're golden." };
  if (score >= 60) return { emoji: "👊", message: "Solid foundation. Let's power it up." };
  if (score >= 40) return { emoji: "🔧", message: "Room to grow. We've got your back." };
  return { emoji: "🌱", message: "Let's build this up together." };
};

// Score Display
function ScoreDisplay({ score, summary }: { score: number; summary: string }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const reaction = getScoreReaction(score);

  const getScoreColor = () => {
    if (score >= 75) return { stroke: '#22c55e', text: 'text-green-400', bg: 'bg-green-500' };
    if (score >= 50) return { stroke: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500' };
  };

  const colors = getScoreColor();

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 animate-scale-in">
      <div className="relative w-52 h-52 flex-shrink-0">
        {/* Glow rings */}
        <div className={`absolute inset-0 rounded-full blur-2xl opacity-30 ${colors.bg}`} />
        <div className={`absolute inset-4 rounded-full blur-xl opacity-20 ${colors.bg}`} />

        <svg className="w-52 h-52 -rotate-90 relative z-10" viewBox="0 0 100 100">
          {/* Background ring */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#283050" strokeWidth="10" />
          {/* Score ring */}
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={colors.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className={`text-6xl font-black ${colors.text}`}>{score}</span>
          <span className="text-slate-400 text-sm font-medium">ATS SCORE</span>
        </div>
      </div>
      <div className="text-center md:text-left flex-1">
        <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
          <span className="text-5xl animate-bounce-gentle">{reaction.emoji}</span>
        </div>
        <p className={`text-xl font-bold ${colors.text} mb-2`}>{reaction.message}</p>
        <p className="text-slate-400 leading-relaxed">{summary}</p>
      </div>
    </div>
  );
}

// Keyword Analysis
function KeywordAnalysis({ matches }: { matches: ATSResult['keywordMatches'] }) {
  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Keyword Match</h3>
        </div>
        <div className={`text-2xl font-black px-4 py-1 rounded-xl ${
          matches.matchRate >= 70 ? 'bg-green-500/20 text-green-400' :
          matches.matchRate >= 40 ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {matches.matchRate}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-6 border-2 border-slate-700">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000"
          style={{ width: `${matches.matchRate}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-green-500/5 rounded-xl p-4 border-2 border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="font-bold text-green-400">Found ({matches.found.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {matches.found.slice(0, 6).map((kw, i) => (
              <span key={i} className="px-3 py-1 text-sm bg-green-500/10 text-green-300 rounded-lg border border-green-500/30 font-medium">
                {kw}
              </span>
            ))}
            {matches.found.length > 6 && (
              <span className="px-3 py-1 text-sm text-green-400/60 font-medium">+{matches.found.length - 6}</span>
            )}
          </div>
        </div>

        <div className="bg-red-500/5 rounded-xl p-4 border-2 border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="font-bold text-red-400">Missing ({matches.missing.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {matches.missing.slice(0, 6).map((kw, i) => (
              <span key={i} className="px-3 py-1 text-sm bg-red-500/10 text-red-300 rounded-lg border border-red-500/30 font-medium">
                {kw}
              </span>
            ))}
            {matches.missing.length > 6 && (
              <span className="px-3 py-1 text-sm text-red-400/60 font-medium">+{matches.missing.length - 6}</span>
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
    if (score >= 75) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (score >= 50) return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-amber-400" />
        </div>
        <h3 className="text-lg font-bold text-white">Section Scores</h3>
      </div>
      <div className="space-y-2">
        {sections.map((s, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl border-2 border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
            <button
              onClick={() => setExpanded(expanded === s.name ? null : s.name)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black border-2 ${getStyle(s.score)}`}>
                  {s.score}
                </div>
                <span className="font-semibold text-white">{s.name}</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expanded === s.name ? 'rotate-180' : ''}`} />
            </button>
            {expanded === s.name && (
              <div className="px-4 pb-4 text-slate-400 border-t border-slate-700 pt-3">{s.feedback}</div>
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
        <div className="bg-amber-500/5 rounded-xl p-5 border-2 border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h4 className="font-bold text-amber-400">Quick Fixes</h4>
          </div>
          <ul className="space-y-2">
            {formatting.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-300">
                <span className="text-amber-400 font-bold">→</span>{issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Power Moves</h3>
        </div>
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border-2 border-slate-700">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-black flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-slate-300">{s}</span>
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
      setError('Paste both your resume and the job description to continue');
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
    <main className="min-h-screen bg-[#0f1423] bg-circuit">
      {showConfetti && <Confetti />}

      {/* Header */}
      <header className="border-b-2 border-slate-800 bg-[#0f1423]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <Image
                src="/logo.png"
                alt="Jalanea ATS"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-black text-white text-lg">Jalanea ATS</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="hidden sm:inline">Free forever • No signup</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        {!result && !loading && (
          <div className="text-center mb-12 animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-2 border-amber-500/30 rounded-full text-amber-400 text-sm font-bold mb-6">
              <Zap className="w-4 h-4" />
              AI-Powered ATS Scanner
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
              Will your resume<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-glow-orange">
                beat the bots?
              </span>
            </h1>

            <p className="text-slate-400 text-lg max-w-xl mx-auto mb-8">
              75% of resumes get rejected by ATS before a human sees them. Check your score and fight back.
            </p>

            {/* Stats */}
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-black text-amber-400">75%</div>
                <div className="text-sm text-slate-500">Rejected by bots</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-green-400">Free</div>
                <div className="text-sm text-slate-500">Forever</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-blue-400">10s</div>
                <div className="text-sm text-slate-500">To analyze</div>
              </div>
            </div>
          </div>
        )}

        {/* Input Section */}
        {!result && !loading && (
          <div className="space-y-6 animate-fade-in-up stagger-2">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Resume Input */}
              <div className="bg-slate-900/80 rounded-2xl border-2 border-slate-700 p-5 card-illustrated transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-400" />
                  </div>
                  <label className="font-bold text-white">Your Resume</label>
                  <span className="ml-auto text-sm text-slate-500 font-mono">{resume.length}</span>
                </div>
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="Paste your full resume text here..."
                  className="w-full h-52 bg-slate-800/80 border-2 border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-500 transition-colors font-mono text-sm"
                />
              </div>

              {/* Job Description Input */}
              <div className="bg-slate-900/80 rounded-2xl border-2 border-slate-700 p-5 card-illustrated transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-amber-400" />
                  </div>
                  <label className="font-bold text-white">Job Description</label>
                  <span className="ml-auto text-sm text-slate-500 font-mono">{jobDescription.length}</span>
                </div>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job posting here..."
                  className="w-full h-52 bg-slate-800/80 border-2 border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-500 transition-colors font-mono text-sm"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-red-400 font-medium flex items-center gap-3">
                <XCircle className="w-5 h-5" />{error}
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!resume.trim() || !jobDescription.trim()}
              className="w-full py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white font-black text-lg rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 border-2 border-amber-400/50"
            >
              <Zap className="w-6 h-6" />
              ANALYZE MY RESUME
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in-up">
            <div className="relative mb-8">
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/30 animate-pulse-ring" />
              <div className="w-28 h-28 rounded-full border-4 border-slate-700 border-t-amber-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">{loadingMessages[msgIdx].emoji}</span>
              </div>
            </div>
            <p className="text-white font-bold text-xl mb-2">{loadingMessages[msgIdx].text}</p>
            <p className="text-slate-500">Hang tight, this takes about 10 seconds</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Score Hero */}
            <div className="bg-slate-900/80 rounded-2xl border-2 border-slate-700 p-8">
              <ScoreDisplay score={result.score} summary={result.summary} />
            </div>

            {/* Two column results */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/80 rounded-2xl border-2 border-slate-700 p-6">
                <KeywordAnalysis matches={result.keywordMatches} />
              </div>
              <div className="bg-slate-900/80 rounded-2xl border-2 border-slate-700 p-6">
                <SectionBreakdown sections={result.sections} />
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-slate-900/80 rounded-2xl border-2 border-slate-700 p-6">
              <Suggestions suggestions={result.overallSuggestions} formatting={result.formatting} />
            </div>

            {/* Reset */}
            <div className="text-center pt-4">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-3 px-8 py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors border-2 border-slate-700"
              >
                <RotateCcw className="w-5 h-5" />
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-slate-800 mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <p className="text-slate-500 font-medium">
            Built with 💪 by <span className="text-amber-400">Jalanea</span> • Your data is never stored
          </p>
        </div>
      </footer>
    </main>
  );
}
