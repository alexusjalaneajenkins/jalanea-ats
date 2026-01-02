'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Briefcase, Sparkles, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2, Zap, Target, TrendingUp, Coffee, Rocket, Heart } from 'lucide-react';

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

// Confetti Component for celebrations
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
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// Loading messages with personality
const loadingMessages = [
  { text: "Reading through your experience...", emoji: "📖" },
  { text: "Matching keywords like a detective...", emoji: "🔍" },
  { text: "Checking those bullet points...", emoji: "✨" },
  { text: "Analyzing your superpowers...", emoji: "💪" },
  { text: "Crunching the numbers...", emoji: "🧮" },
  { text: "Almost there, hang tight!", emoji: "🚀" },
  { text: "Making sure nothing's missed...", emoji: "👀" },
  { text: "Putting it all together...", emoji: "🧩" },
];

// Score-based reactions
const getScoreReaction = (score: number) => {
  if (score >= 90) return { emoji: "🎉", message: "Outstanding! Your resume is ATS gold!", vibe: "celebrate" };
  if (score >= 75) return { emoji: "🔥", message: "You're on fire! Just a few tweaks away from perfect.", vibe: "great" };
  if (score >= 60) return { emoji: "💪", message: "Solid foundation! Let's level it up.", vibe: "good" };
  if (score >= 40) return { emoji: "🛠️", message: "Room for improvement, but nothing we can't fix!", vibe: "work" };
  return { emoji: "🌱", message: "Everyone starts somewhere! Let's grow together.", vibe: "start" };
};

// Score Display Component with more personality
function ScoreDisplay({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const reaction = getScoreReaction(score);

  const getScoreColor = () => {
    if (score >= 75) return { stroke: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/20' };
    if (score >= 50) return { stroke: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/20' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10', glow: 'shadow-red-500/20' };
  };

  const colors = getScoreColor();

  return (
    <div className="flex flex-col items-center animate-scale-in">
      <div className="relative w-44 h-44">
        {/* Glow effect */}
        <div className={`absolute inset-2 rounded-full blur-xl opacity-30 ${colors.bg}`} />

        <svg className="w-44 h-44 -rotate-90 relative z-10" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(51 65 85)"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-score-fill drop-shadow-lg"
            style={{
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 8px ${colors.stroke}40)`
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className={`text-5xl font-bold ${colors.text} transition-all duration-500`}>
            {score}
          </span>
          <span className="text-forge-muted text-sm mt-1">out of 100</span>
        </div>
      </div>

      {/* Reaction */}
      <div className="mt-4 text-center">
        <span className="text-3xl mb-2 block animate-bounce-gentle">{reaction.emoji}</span>
        <p className={`text-sm font-medium ${colors.text}`}>{reaction.message}</p>
      </div>
    </div>
  );
}

// Keyword Analysis Component
function KeywordAnalysis({ matches }: { matches: ATSResult['keywordMatches'] }) {
  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-forge-accent" />
          <h3 className="text-lg font-semibold text-forge-text">Keyword Magic</h3>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
          matches.matchRate >= 70 ? 'bg-emerald-500/10 text-emerald-400' :
          matches.matchRate >= 40 ? 'bg-amber-500/10 text-amber-400' :
          'bg-red-500/10 text-red-400'
        }`}>
          {matches.matchRate}% match
        </span>
      </div>

      {/* Progress bar with gradient */}
      <div className="h-3 bg-forge-800 rounded-full overflow-hidden mb-6 relative">
        <div
          className="h-full bg-gradient-to-r from-forge-accent via-orange-500 to-amber-400 rounded-full transition-all duration-1000 ease-out relative"
          style={{ width: `${matches.matchRate}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Found Keywords */}
        <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Found in your resume</span>
            <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
              {matches.found.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {matches.found.slice(0, 8).map((keyword, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-300 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-default"
              >
                {keyword}
              </span>
            ))}
            {matches.found.length > 8 && (
              <span className="px-2.5 py-1 text-xs text-emerald-400/60">
                +{matches.found.length - 8} more ✨
              </span>
            )}
          </div>
        </div>

        {/* Missing Keywords */}
        <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">Consider adding</span>
            <span className="ml-auto text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
              {matches.missing.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {matches.missing.slice(0, 8).map((keyword, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-xs bg-red-500/10 text-red-300 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-default"
              >
                {keyword}
              </span>
            ))}
            {matches.missing.length > 8 && (
              <span className="px-2.5 py-1 text-xs text-red-400/60">
                +{matches.missing.length - 8} more
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

  const getScoreStyle = (score: number) => {
    if (score >= 75) return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' };
    if (score >= 50) return { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' };
    return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' };
  };

  return (
    <div className="animate-fade-in-up stagger-2">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-forge-accent" />
        <h3 className="text-lg font-semibold text-forge-text">Section by Section</h3>
      </div>
      <div className="space-y-2">
        {sections.map((section, i) => {
          const style = getScoreStyle(section.score);
          return (
            <div
              key={i}
              className="bg-forge-800/30 rounded-xl border border-forge-700/50 overflow-hidden hover:border-forge-600 transition-all duration-300"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === section.name ? null : section.name)}
                className="w-full flex items-center justify-between p-4 hover:bg-forge-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${style.text} ${style.bg} ${style.border} border`}>
                    {section.score}
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-forge-text block">{section.name}</span>
                    <span className="text-xs text-forge-muted">
                      {section.score >= 75 ? 'Looking great!' : section.score >= 50 ? 'Getting there' : 'Needs attention'}
                    </span>
                  </div>
                </div>
                <div className={`transform transition-transform duration-200 ${expandedSection === section.name ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-5 h-5 text-forge-muted" />
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${expandedSection === section.name ? 'max-h-40' : 'max-h-0'}`}>
                <div className="px-4 pb-4 text-sm text-forge-muted leading-relaxed">
                  {section.feedback}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Suggestions Component with more personality
function SuggestionsList({ suggestions, formatting }: { suggestions: string[]; formatting: ATSResult['formatting'] }) {
  return (
    <div className="animate-fade-in-up stagger-3 space-y-6">
      {/* Formatting Issues */}
      {formatting.issues.length > 0 && (
        <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/10">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-amber-400">Quick Fixes</h3>
          </div>
          <ul className="space-y-2">
            {formatting.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-forge-muted">
                <span className="text-amber-400 mt-0.5">→</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="w-5 h-5 text-forge-accent" />
          <h3 className="text-lg font-semibold text-forge-text">Level Up Your Resume</h3>
        </div>
        <ul className="space-y-3">
          {suggestions.map((suggestion, i) => (
            <li
              key={i}
              className="group flex items-start gap-3 p-4 bg-gradient-to-r from-forge-accent/5 to-transparent rounded-xl border border-forge-accent/10 hover:border-forge-accent/30 transition-all duration-300"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-forge-accent to-orange-600 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-forge-accent/20">
                {i + 1}
              </span>
              <span className="text-sm text-forge-text leading-relaxed">{suggestion}</span>
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
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  // Show confetti for high scores
  useEffect(() => {
    if (result && result.score >= 75) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const handleAnalyze = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      setError('Hey! I need both your resume and the job description to work my magic ✨');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setLoadingMessageIndex(0);

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
      setError(err instanceof Error ? err.message : 'Oops! Something went wrong. Let\'s try that again!');
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
      {showConfetti && <Confetti />}

      {/* Header */}
      <header className="border-b border-forge-700/50 bg-forge-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-forge-accent via-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-forge-accent/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-forge-text text-lg">Jalanea ATS</h1>
              <p className="text-xs text-forge-muted">Your resume's new best friend</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-forge-muted">
            <Coffee className="w-4 h-4" />
            <span>Free forever</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        {!result && (
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-forge-accent/10 rounded-full text-forge-accent text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Powered by AI that actually gets it
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-forge-text mb-4 leading-tight">
              Will your resume<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-forge-accent via-orange-500 to-amber-400">
                beat the bots?
              </span>
            </h2>
            <p className="text-forge-muted text-lg max-w-2xl mx-auto leading-relaxed">
              Let's find out together! Paste your resume and job description below,
              and I'll show you exactly what the ATS sees — plus how to make it love you.
            </p>
          </div>
        )}

        <div className={`grid gap-8 ${result ? 'lg:grid-cols-2' : 'lg:grid-cols-2'}`}>
          {/* Input Section */}
          <div className="space-y-6">
            {/* Resume Input */}
            <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-6 hover:border-forge-600 transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-forge-accent/10 rounded-lg">
                  <FileText className="w-5 h-5 text-forge-accent" />
                </div>
                <label className="font-semibold text-forge-text">Your Resume</label>
                <span className="ml-auto text-xs text-forge-muted bg-forge-800 px-2 py-1 rounded-lg">
                  {resume.length.toLocaleString()} chars
                </span>
              </div>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Drop your resume here... 📄

Tip: Copy-paste the full text from your resume file. I'll analyze everything — experience, skills, education, the works!"
                className="w-full h-48 bg-forge-800/50 border border-forge-700/50 rounded-xl p-4 text-forge-text placeholder-forge-muted/60 resize-none focus:outline-none focus:border-forge-accent focus:ring-2 focus:ring-forge-accent/20 transition-all"
              />
            </div>

            {/* Job Description Input */}
            <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-6 hover:border-forge-600 transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-forge-accent/10 rounded-lg">
                  <Briefcase className="w-5 h-5 text-forge-accent" />
                </div>
                <label className="font-semibold text-forge-text">Job Description</label>
                <span className="ml-auto text-xs text-forge-muted bg-forge-800 px-2 py-1 rounded-lg">
                  {jobDescription.length.toLocaleString()} chars
                </span>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job posting here... 💼

The more details the better! Include requirements, qualifications, and responsibilities. I'll match every keyword."
                className="w-full h-48 bg-forge-800/50 border border-forge-700/50 rounded-xl p-4 text-forge-text placeholder-forge-muted/60 resize-none focus:outline-none focus:border-forge-accent focus:ring-2 focus:ring-forge-accent/20 transition-all"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={loading || !resume.trim() || !jobDescription.trim()}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-forge-accent via-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-forge-accent/25 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Working on it...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Analyze My Resume
                  </>
                )}
              </button>
              {(resume || jobDescription) && !loading && (
                <button
                  onClick={handleClear}
                  className="py-4 px-6 bg-forge-800 text-forge-text font-semibold rounded-xl hover:bg-forge-700 transition-colors"
                >
                  Start Over
                </button>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {loading && (
              <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-12 flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-forge-700 border-t-forge-accent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl animate-pulse">{loadingMessages[loadingMessageIndex].emoji}</span>
                  </div>
                </div>
                <p className="text-forge-text font-medium text-lg mb-2">
                  {loadingMessages[loadingMessageIndex].text}
                </p>
                <p className="text-sm text-forge-muted/60">This usually takes 5-10 seconds</p>

                {/* Progress dots */}
                <div className="flex gap-1.5 mt-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i <= loadingMessageIndex % 4 ? 'bg-forge-accent' : 'bg-forge-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {result && (
              <>
                {/* Score Card */}
                <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-8">
                  <div className="flex flex-col items-center gap-6">
                    <ScoreDisplay score={result.score} />
                    <div className="text-center max-w-md">
                      <p className="text-forge-muted leading-relaxed">{result.summary}</p>
                    </div>
                  </div>
                </div>

                {/* Keyword Analysis */}
                <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-6">
                  <KeywordAnalysis matches={result.keywordMatches} />
                </div>

                {/* Section Breakdown */}
                <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-6">
                  <SectionBreakdown sections={result.sections} />
                </div>

                {/* Suggestions */}
                <div className="bg-forge-900/80 rounded-2xl border border-forge-700/50 p-6">
                  <SuggestionsList
                    suggestions={result.overallSuggestions}
                    formatting={result.formatting}
                  />
                </div>

                {/* CTA to try again */}
                <div className="text-center p-6 bg-gradient-to-r from-forge-accent/5 via-orange-500/5 to-transparent rounded-2xl border border-forge-accent/10">
                  <p className="text-forge-muted mb-3">Made some changes? Let's check again!</p>
                  <button
                    onClick={() => setResult(null)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-forge-800 text-forge-text rounded-xl hover:bg-forge-700 transition-colors"
                  >
                    <Heart className="w-4 h-4 text-forge-accent" />
                    Analyze Again
                  </button>
                </div>
              </>
            )}

            {!loading && !result && (
              <div className="bg-forge-900/80 rounded-2xl border border-forge-700 border-dashed p-12 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-forge-800 to-forge-700 flex items-center justify-center mb-6 rotate-3">
                  <span className="text-4xl">👋</span>
                </div>
                <h3 className="text-xl font-semibold text-forge-text mb-3">Hey there!</h3>
                <p className="text-forge-muted text-sm max-w-xs leading-relaxed mb-4">
                  I'm ready to analyze your resume. Just paste your info on the left and click the button!
                </p>
                <div className="flex items-center gap-2 text-xs text-forge-muted/60">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>100% free • No signup • Instant results</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-forge-700/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-sm text-forge-muted mb-2">
            Built with 💜 by Jalanea
          </p>
          <p className="text-xs text-forge-muted/60">
            Your resume data is never stored. Privacy first, always.
          </p>
        </div>
      </footer>
    </main>
  );
}
