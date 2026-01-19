'use client';

import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

/**
 * ATS Myth vs Reality Section
 *
 * Debunks common myths about ATS systems and explains
 * what they actually do.
 */
export function ATSMythSection() {
  const myths = [
    {
      myth: 'ATS systems automatically reject 75% of resumes',
      reality: 'ATS systems are databases, not decision-makers. They store and organize resumes. The "rejection" happens when recruiters filter or search, not automatically.',
      verdict: 'mostly_false',
    },
    {
      myth: 'You need to "beat" the ATS to get seen',
      reality: 'You need to be findable and parseable. The ATS isn\'t your enemy—it\'s just a filing system. Poor formatting = your info gets filed incorrectly.',
      verdict: 'misleading',
    },
    {
      myth: 'Keywords must be exact matches',
      reality: 'Modern ATS systems (Workday, iCIMS) use semantic matching, not just keyword matching. "JavaScript" can match "JS" or "Node.js". However, exact keywords still help.',
      verdict: 'partially_true',
    },
    {
      myth: 'ATS can\'t read PDFs',
      reality: 'Modern ATS systems can parse most PDFs fine. The real issue is complex layouts (tables, columns, text boxes) that confuse parsers regardless of format.',
      verdict: 'outdated',
    },
    {
      myth: 'Knockout questions are optional',
      reality: 'Knockout questions (work authorization, clearance, etc.) are the ONLY true auto-reject in most systems. Answer them carefully—they\'re legally binding.',
      verdict: 'false',
    },
    {
      myth: 'AI reads and scores every resume',
      reality: 'Only "sorter" ATS (Workday HiredScore, Taleo ACE) use AI scoring. "Processor" ATS (Greenhouse, Lever) don\'t rank at all—recruiters manually search.',
      verdict: 'partially_true',
    },
  ];

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'false':
      case 'mostly_false':
        return {
          icon: <XCircle className="w-4 h-4" />,
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-300',
          label: verdict === 'false' ? 'False' : 'Mostly False',
        };
      case 'partially_true':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-300',
          label: 'Partially True',
        };
      case 'misleading':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          text: 'text-orange-300',
          label: 'Misleading',
        };
      case 'outdated':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/30',
          text: 'text-purple-300',
          label: 'Outdated',
        };
      default:
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-300',
          label: 'True',
        };
    }
  };

  return (
    <div className="pt-4 space-y-4">
      {/* Key Insight */}
      <div className="p-4 bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-xl border border-orange-500/20">
        <p className="text-sm text-indigo-200">
          <span className="font-bold text-orange-400">Key insight: </span>
          ATS systems are filing cabinets, not gatekeepers. Your resume isn't "rejected by the ATS"—
          it's either parsed correctly (filed properly) or not. The human recruiter does the actual selecting.
        </p>
      </div>

      {/* Myths List */}
      <div className="space-y-3">
        {myths.map((item, index) => {
          const style = getVerdictStyle(item.verdict);
          return (
            <div
              key={index}
              className={`p-4 rounded-xl ${style.bg} border ${style.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${style.text}`}>
                  {style.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white mb-2">
                    "{item.myth}"
                  </p>
                  <p className="text-sm text-indigo-300">
                    {item.reality}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Line */}
      <div className="p-4 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
        <h4 className="text-sm font-bold text-white mb-2">The Bottom Line</h4>
        <p className="text-sm text-indigo-300">
          Stop trying to "beat" the ATS. Instead, focus on:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-indigo-300">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Clean formatting that parses correctly</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Relevant keywords that match the job</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Truthful knockout question answers</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
