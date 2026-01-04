'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText, Briefcase, ArrowRight, CheckCircle2, Zap, Eye, Target, Rocket, Star, Moon, Cloud, XCircle, AlertTriangle, ChevronDown, TrendingUp, RotateCcw, Save, History, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getDeviceId, saveAnalysis, getAnalysisHistory, deleteAnalysis, SavedAnalysis } from '@/lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

// --- Floating Stars Background ---
const FloatingStars = () => {
  const [stars, setStars] = useState<Array<{ id: number; size: number; x: number; y: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    setStars(Array.from({ length: 30 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
      duration: Math.random() * 3 + 2,
    })));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.3, 1] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <Star className="text-yellow-300" style={{ width: s.size, height: s.size }} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
};

// --- Floating Cloud Elements ---
const FloatingClouds = () => (
  <>
    <motion.div
      className="absolute top-[15%] left-[5%] text-indigo-800/30"
      animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
      transition={{ duration: 8, repeat: Infinity }}
    >
      <Cloud className="w-24 h-24" />
    </motion.div>
    <motion.div
      className="absolute top-[25%] right-[10%] text-purple-800/20"
      animate={{ x: [0, -15, 0], y: [0, 10, 0] }}
      transition={{ duration: 10, repeat: Infinity }}
    >
      <Cloud className="w-32 h-32" />
    </motion.div>
  </>
);

// --- Sticker Component ---
const Sticker = ({ children, rotate = 0, className = '' }: { children: React.ReactNode; rotate?: number; className?: string }) => (
  <motion.div
    initial={{ scale: 0, rotate: rotate - 20 }}
    animate={{ scale: 1, rotate }}
    transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.5 }}
    className={cn(
      "absolute px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide shadow-lg",
      className
    )}
  >
    {children}
  </motion.div>
);

// --- Confetti ---
function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);

  useEffect(() => {
    const colors = ['#f97316', '#ec4899', '#06b6d4', '#22c55e', '#8b5cf6'];
    setParticles(Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    })));
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

// --- Feature Pill ---
const FeaturePill = ({ icon: Icon, title, color, delay }: { icon: React.ElementType; title: string; color: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 200 }}
    className={cn(
      "flex items-center gap-3 px-5 py-3 rounded-2xl border-2 backdrop-blur-sm transition-all hover:scale-105 cursor-default",
      color
    )}
  >
    <Icon className="w-5 h-5" />
    <span className="font-bold text-sm">{title}</span>
  </motion.div>
);

// --- Score reactions ---
const getScoreReaction = (score: number) => {
  if (score >= 90) return { emoji: "🎉", message: "You're crushing it! ATS won't know what hit it." };
  if (score >= 75) return { emoji: "🔥", message: "On fire! A few tweaks and you're golden." };
  if (score >= 60) return { emoji: "💪", message: "Solid foundation. Let's power it up." };
  if (score >= 40) return { emoji: "🛠️", message: "Room to grow. We've got your back." };
  return { emoji: "🌱", message: "Let's build this up together." };
};

// --- Score Display ---
function ScoreDisplay({ score, summary }: { score: number; summary: string }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const reaction = getScoreReaction(score);

  const getScoreColor = () => {
    if (score >= 75) return { stroke: '#22c55e', text: 'text-green-400', glow: 'glow-cyan' };
    if (score >= 50) return { stroke: '#f97316', text: 'text-orange-400', glow: 'glow-orange' };
    return { stroke: '#ec4899', text: 'text-pink-400', glow: 'glow-pink' };
  };

  const colors = getScoreColor();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col md:flex-row items-center gap-8"
    >
      <div className={`relative w-52 h-52 flex-shrink-0 ${colors.glow} rounded-full`}>
        <svg className="w-52 h-52 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="10" />
          <motion.circle
            cx="50" cy="50" r="45" fill="none"
            stroke={colors.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-6xl font-black ${colors.text}`}>{score}</span>
          <span className="text-indigo-400 text-sm font-bold uppercase tracking-wider">ATS Score</span>
        </div>
      </div>
      <div className="text-center md:text-left flex-1">
        <span className="text-5xl animate-bounce-gentle inline-block mb-2">{reaction.emoji}</span>
        <p className={`text-2xl font-black ${colors.text} mb-2`}>{reaction.message}</p>
        <p className="text-indigo-300">{summary}</p>
      </div>
    </motion.div>
  );
}

// --- Keyword Analysis ---
function KeywordAnalysis({ matches }: { matches: ATSResult['keywordMatches'] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-lg font-black text-white">Keyword Match</h3>
        </div>
        <div className={`text-2xl font-black px-4 py-1 rounded-xl ${
          matches.matchRate >= 70 ? 'bg-green-500/20 text-green-400' :
          matches.matchRate >= 40 ? 'bg-orange-500/20 text-orange-400' :
          'bg-pink-500/20 text-pink-400'
        }`}>
          {matches.matchRate}%
        </div>
      </div>

      <div className="h-3 bg-indigo-900/50 rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #f97316, #ec4899, #06b6d4)' }}
          initial={{ width: 0 }}
          animate={{ width: `${matches.matchRate}%` }}
          transition={{ duration: 1, delay: 0.3 }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-green-500/10 rounded-2xl p-4 border-2 border-green-500/30">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="font-bold text-green-400">Found ({matches.found.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {matches.found.slice(0, 6).map((kw, i) => (
              <span key={i} className="px-3 py-1 text-sm bg-green-500/20 text-green-300 rounded-full font-medium">
                {kw}
              </span>
            ))}
            {matches.found.length > 6 && <span className="text-green-400/60 text-sm">+{matches.found.length - 6}</span>}
          </div>
        </div>

        <div className="bg-pink-500/10 rounded-2xl p-4 border-2 border-pink-500/30">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-pink-400" />
            <span className="font-bold text-pink-400">Missing ({matches.missing.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {matches.missing.slice(0, 6).map((kw, i) => (
              <span key={i} className="px-3 py-1 text-sm bg-pink-500/20 text-pink-300 rounded-full font-medium">
                {kw}
              </span>
            ))}
            {matches.missing.length > 6 && <span className="text-pink-400/60 text-sm">+{matches.missing.length - 6}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Section Breakdown ---
function SectionBreakdown({ sections }: { sections: ATSResult['sections'] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const getStyle = (score: number) => {
    if (score >= 75) return 'text-green-400 bg-green-500/20 border-green-500/40';
    if (score >= 50) return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
    return 'text-pink-400 bg-pink-500/20 border-pink-500/40';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
        </div>
        <h3 className="text-lg font-black text-white">Section Scores</h3>
      </div>
      <div className="space-y-2">
        {sections.map((s, i) => (
          <div key={i} className="bg-indigo-900/30 rounded-2xl border-2 border-indigo-500/30 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === s.name ? null : s.name)}
              className="w-full flex items-center justify-between p-4 hover:bg-indigo-800/20 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black border-2 ${getStyle(s.score)}`}>
                  {s.score}
                </div>
                <span className="font-bold text-white">{s.name}</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-indigo-400 transition-transform ${expanded === s.name ? 'rotate-180' : ''}`} />
            </button>
            {expanded === s.name && (
              <div className="px-4 pb-4 text-indigo-300 border-t border-indigo-500/20 pt-3">{s.feedback}</div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// --- Suggestions ---
function Suggestions({ suggestions, formatting }: { suggestions: string[]; formatting: ATSResult['formatting'] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-6">
      {formatting.issues.length > 0 && (
        <div className="bg-orange-500/10 rounded-2xl p-5 border-2 border-orange-500/30">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h4 className="font-black text-orange-400">Quick Fixes</h4>
          </div>
          <ul className="space-y-2">
            {formatting.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-3 text-indigo-200">
                <span className="text-orange-400 font-bold">→</span>{issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-pink-400" />
          </div>
          <h3 className="text-lg font-black text-white">Power Moves</h3>
        </div>
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-indigo-900/30 rounded-2xl border-2 border-indigo-500/30">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 text-white text-sm font-black flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-indigo-200">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// --- Loading Messages ---
const loadingMessages = [
  { text: "Scanning your resume...", emoji: "🔍" },
  { text: "Matching keywords...", emoji: "🎯" },
  { text: "Analyzing sections...", emoji: "📊" },
  { text: "Calculating your score...", emoji: "⚡" },
  { text: "Almost there...", emoji: "🚀" },
];

// --- Main Component ---
export default function Home() {
  const [resumeText, setResumeText] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [result, setResult] = useState<ATSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msgIdx, setMsgIdx] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [jobTitle, setJobTitle] = useState('');

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
    if (!resumeText.trim() || !jobDesc.trim()) {
      setError('Paste both your resume and the job description');
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
        body: JSON.stringify({ resume: resumeText, jobDescription: jobDesc }),
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
    setResumeText('');
    setJobDesc('');
    setError('');
    setSaved(false);
    setJobTitle('');
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    const deviceId = getDeviceId();
    const title = jobTitle.trim() || 'Untitled Analysis';
    const { error: saveError } = await saveAnalysis(deviceId, title, result);
    setSaving(false);
    if (!saveError) {
      setSaved(true);
    } else {
      setError('Failed to save analysis');
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    const deviceId = getDeviceId();
    const data = await getAnalysisHistory(deviceId);
    setHistory(data);
    setLoadingHistory(false);
  };

  const handleShowHistory = () => {
    setShowHistory(true);
    loadHistory();
  };

  const handleDeleteHistory = async (id: string) => {
    const deviceId = getDeviceId();
    const success = await deleteAnalysis(id, deviceId);
    if (success) {
      setHistory(history.filter(h => h.id !== id));
    }
  };

  const handleLoadFromHistory = (item: SavedAnalysis) => {
    setResult({
      score: item.score,
      summary: item.summary,
      keywordMatches: {
        found: item.keywords_found,
        missing: item.keywords_missing,
        matchRate: item.keyword_match_rate,
      },
      sections: item.sections,
      formatting: { issues: [], suggestions: [] },
      overallSuggestions: item.suggestions,
    });
    setJobTitle(item.job_title);
    setShowHistory(false);
    setSaved(true);
  };

  return (
    <div className="min-h-screen text-indigo-100 overflow-x-hidden">
      {showConfetti && <Confetti />}

      {/* Background layers */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(236,72,153,0.1) 40%, transparent 70%)' }}
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)' }}
          animate={{ x: [0, -40, 0], y: [0, -20, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <FloatingClouds />
        <FloatingStars />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-[0.04]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform glow-orange">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <span className="text-2xl font-black tracking-tight">
            <span className="text-white">Jalanea</span>
            <span className="text-orange-400"> ATS</span>
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
          <button
            onClick={handleShowHistory}
            className="flex items-center gap-2 text-sm text-indigo-300 bg-indigo-900/40 px-4 py-2 rounded-full border border-indigo-700/30 hover:bg-indigo-800/40 transition-colors"
          >
            <History className="w-4 h-4" />
            <span className="font-medium hidden sm:inline">History</span>
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm text-indigo-300 bg-indigo-900/40 px-4 py-2 rounded-full border border-indigo-700/30">
            <Moon className="w-4 h-4 text-yellow-400" />
            <span className="font-medium">Free forever</span>
          </div>
        </motion.div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-24 pt-6">
        {!result && !loading && (
          <>
            {/* Hero Section */}
            <div className="text-center mb-16 relative">
              {/* Floating stickers */}
              <Sticker rotate={-12} className="top-0 left-[10%] bg-gradient-to-r from-cyan-400 to-cyan-500 text-cyan-950 hidden lg:block">
                ✨ AI Magic
              </Sticker>
              <Sticker rotate={8} className="top-[20%] right-[8%] bg-gradient-to-r from-pink-400 to-pink-500 text-pink-950 hidden lg:block">
                🚀 Free!
              </Sticker>
              <Sticker rotate={-6} className="bottom-[10%] left-[5%] bg-gradient-to-r from-yellow-300 to-orange-400 text-orange-950 hidden lg:block">
                💪 Beat Bots
              </Sticker>

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border-2 border-orange-500/40 bg-orange-500/10 px-5 py-2 text-sm font-bold text-orange-300 mb-8 backdrop-blur-sm"
              >
                <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Zap className="w-4 h-4 fill-orange-400" />
                </motion.div>
                <span>AI-Powered Analysis</span>
              </motion.div>

              {/* Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-8"
              >
                <span className="block text-white text-glow">Will your resume</span>
                <span className="relative inline-block mt-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-pink-500 to-cyan-400">
                    beat the bots?
                  </span>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="absolute -bottom-2 left-0 w-full h-2 rounded-full origin-left bg-gradient-to-r from-orange-500 via-pink-500 to-cyan-400"
                  />
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-xl text-indigo-300 max-w-2xl mx-auto mb-10 leading-relaxed"
              >
                Don't let algorithms crush your dreams. Check your <span className="text-orange-400 font-bold">ATS compatibility score</span> before you hit apply.
              </motion.p>

              {/* Feature Pills */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap items-center justify-center gap-3 mb-12">
                <FeaturePill icon={Eye} title="Keyword Scanner" color="bg-purple-900/40 border-purple-500/40 text-purple-200" delay={0.4} />
                <FeaturePill icon={Target} title="Match Score" color="bg-cyan-900/40 border-cyan-500/40 text-cyan-200" delay={0.5} />
                <FeaturePill icon={Rocket} title="Instant Tips" color="bg-pink-900/40 border-pink-500/40 text-pink-200" delay={0.6} />
              </motion.div>
            </div>

            {/* Input Card */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
              className="w-full max-w-4xl mx-auto"
            >
              <div className="glass-card rounded-3xl p-2">
                <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 rounded-2xl p-6 md:p-8">
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Resume Input */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-bold text-indigo-200 uppercase tracking-wider">
                          <FileText className="w-4 h-4" />
                          Your Resume
                        </label>
                        <span className="text-xs text-indigo-400 font-mono bg-indigo-900/50 px-2 py-0.5 rounded-full">{resumeText.length}</span>
                      </div>
                      <textarea
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste your full resume text here..."
                        className="min-h-[160px] w-full rounded-2xl border-2 border-indigo-600/40 bg-indigo-950/60 px-4 py-3 text-sm text-indigo-100 placeholder:text-indigo-500 focus:outline-none focus:border-orange-500/60 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none"
                      />
                    </div>

                    {/* Job Description Input */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-bold text-indigo-200 uppercase tracking-wider">
                          <Briefcase className="w-4 h-4" />
                          Job Description
                        </label>
                        <span className="text-xs text-indigo-400 font-mono bg-indigo-900/50 px-2 py-0.5 rounded-full">{jobDesc.length}</span>
                      </div>
                      <textarea
                        value={jobDesc}
                        onChange={(e) => setJobDesc(e.target.value)}
                        placeholder="Paste the job posting here..."
                        className="min-h-[160px] w-full rounded-2xl border-2 border-indigo-600/40 bg-indigo-950/60 px-4 py-3 text-sm text-indigo-100 placeholder:text-indigo-500 focus:outline-none focus:border-orange-500/60 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-pink-500/10 border-2 border-pink-500/30 rounded-xl text-pink-400 font-medium flex items-center gap-3 mb-6">
                      <XCircle className="w-5 h-5" />{error}
                    </div>
                  )}

                  <div className="flex flex-col items-center">
                    <button
                      onClick={handleAnalyze}
                      disabled={!resumeText || !jobDesc || loading}
                      className="w-full md:w-auto min-w-[300px] h-16 text-base font-black uppercase tracking-wider rounded-2xl px-8 py-4 bg-gradient-to-r from-orange-500 via-pink-500 to-orange-400 text-white hover:from-orange-400 hover:via-pink-400 hover:to-orange-300 shadow-[0_0_40px_-5px_rgba(249,115,22,0.6),0_0_60px_-10px_rgba(236,72,153,0.4)] hover:shadow-[0_0_50px_0px_rgba(249,115,22,0.7),0_0_70px_-5px_rgba(236,72,153,0.5)] transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
                    >
                      <Sparkles className="w-5 h-5" />
                      Analyze My Resume
                      <ArrowRight className="w-5 h-5" />
                    </button>

                    <p className="mt-6 text-sm text-indigo-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Your data is never stored • Built with 💜 by Jalanea
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Loading State */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-full border-4 border-indigo-800 border-t-orange-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">{loadingMessages[msgIdx].emoji}</span>
              </div>
            </div>
            <p className="text-white font-bold text-xl mb-2">{loadingMessages[msgIdx].text}</p>
            <p className="text-indigo-400">Hang tight, this takes about 10 seconds</p>
          </motion.div>
        )}

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="glass-card rounded-3xl p-8">
              <ScoreDisplay score={result.score} summary={result.summary} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-3xl p-6">
                <KeywordAnalysis matches={result.keywordMatches} />
              </div>
              <div className="glass-card rounded-3xl p-6">
                <SectionBreakdown sections={result.sections} />
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <Suggestions suggestions={result.overallSuggestions} formatting={result.formatting} />
            </div>

            <div className="flex flex-col items-center gap-4 pt-4">
              {!saved && (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                  <input
                    type="text"
                    placeholder="Job title (optional)"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-indigo-600/40 bg-indigo-950/60 text-indigo-100 placeholder:text-indigo-500 focus:outline-none focus:border-orange-500/60 text-sm w-full"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-400 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
              {saved && (
                <div className="flex items-center gap-2 text-green-400 font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  Analysis saved to history!
                </div>
              )}
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-900/50 text-indigo-200 font-bold rounded-2xl hover:bg-indigo-800/50 border-2 border-indigo-600/50 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                Start Over
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* History Modal */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowHistory(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl max-h-[80vh] bg-indigo-950 rounded-3xl border-2 border-indigo-700/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-indigo-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <History className="w-5 h-5 text-orange-400" />
                </div>
                <h2 className="text-xl font-black text-white">Analysis History</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-indigo-800/50 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-indigo-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-orange-500 rounded-full animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                  <p className="text-indigo-400">No saved analyses yet</p>
                  <p className="text-indigo-500 text-sm mt-1">Your saved analyses will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 bg-indigo-900/50 rounded-2xl border border-indigo-700/40 hover:bg-indigo-900/70 transition-colors"
                    >
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black border-2 flex-shrink-0 ${
                        item.score >= 75 ? 'bg-green-500/20 text-green-400 border-green-500/40' :
                        item.score >= 50 ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                        'bg-pink-500/20 text-pink-400 border-pink-500/40'
                      }`}>
                        {item.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{item.job_title}</h3>
                        <p className="text-sm text-indigo-400">
                          {new Date(item.created_at).toLocaleDateString()} • {item.keyword_match_rate}% keyword match
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleLoadFromHistory(item)}
                          className="px-4 py-2 bg-indigo-700/50 text-indigo-200 font-medium rounded-lg hover:bg-indigo-600/50 transition-colors text-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(item.id)}
                          className="p-2 text-pink-400 hover:bg-pink-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
