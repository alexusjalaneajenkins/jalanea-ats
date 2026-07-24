'use client';

/**
 * V2 Results Panel — Transparent layered output
 *
 * Renders the full V2 analysis: knockout report, section match map,
 * boolean search result, AI fit assessment, composite score, and action plan.
 */

import { useState } from 'react';
import type { V2AnalysisResult } from '@/lib/v2';
import { Shield, Search, Brain, Target, CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface V2ResultsPanelProps {
  result: V2AnalysisResult;
}

function ChevronIndicator({ expanded }: { expanded: boolean }) {
  return expanded ? (
    <ChevronUp className="w-4 h-4" />
  ) : (
    <ChevronDown className="w-4 h-4" />
  );
}

export function V2ResultsPanel({ result }: V2ResultsPanelProps) {
  const { knockout, sectionMatch, booleanSearch, aiRanking, composite, parseWarnings } = result;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['composite', 'knockout', 'ai'])
  );

  const toggle = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const isOpen = (s: string) => expandedSections.has(s);

  const scoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 65) return 'text-blue-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const scoreBg = (score: number) => {
    if (score >= 85) return 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30';
    if (score >= 65) return 'from-blue-500/20 to-blue-600/10 border-blue-500/30';
    if (score >= 40) return 'from-amber-500/20 to-amber-600/10 border-amber-500/30';
    return 'from-red-500/20 to-red-600/10 border-red-500/30';
  };

  return (
    <div className="space-y-4">
      {/* Parse Warnings */}
      {parseWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-900/20 p-3">
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-1">Parse Warnings</p>
          {parseWarnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-200">• {w}</p>
          ))}
        </div>
      )}

      {/* Composite Score — Hero Card */}
      <div className={`rounded-2xl border bg-gradient-to-br p-5 ${scoreBg(composite.score)}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-indigo-300" />
            <h3 className="text-lg font-bold text-white">ATS Match Score</h3>
          </div>
          <span className={`text-4xl font-black ${scoreColor(composite.score)}`}>{composite.score}%</span>
        </div>
        {composite.knockoutGateStatus === 'fail' && (
          <div className="rounded-lg bg-red-900/40 border border-red-500/30 px-3 py-2 mb-3">
            <p className="text-sm text-red-300 font-semibold">⚠ Knockout gate failed — score capped at 30%. Fix hard requirements first.</p>
          </div>
        )}
        {composite.knockoutGateStatus === 'needs-confirmation' && (
          <div className="rounded-lg bg-amber-900/40 border border-amber-500/30 px-3 py-2 mb-3">
            <p className="text-sm text-amber-200 font-semibold">
              Some hard requirements need confirmation — this is not a pass, and the score is capped until verified.
            </p>
          </div>
        )}
        {composite.confidence === 'limited' && (
          <p className="text-xs text-amber-200 mb-3">
            Limited-confidence score: one or more deterministic layers did not have enough evidence to evaluate.
          </p>
        )}
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg bg-indigo-900/40 p-2">
            <p className="text-indigo-400 text-xs">Section Match</p>
            <p className="text-white font-bold">
              {sectionMatch.score === null ? 'N/A' : `${sectionMatch.score}%`}{' '}
              <span className="text-indigo-400 text-xs">
                × {Math.round(composite.weights.sectionMatch * 100)}%
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-indigo-900/40 p-2">
            <p className="text-indigo-400 text-xs">Boolean Search</p>
            <p className="text-white font-bold">
              {booleanSearch.evidenceStatus === 'not-evaluated'
                ? 'N/A'
                : `${booleanSearch.score}%`}{' '}
              <span className="text-indigo-400 text-xs">
                × {Math.round(composite.weights.booleanSearch * 100)}%
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-indigo-900/40 p-2">
            <p className="text-indigo-400 text-xs">AI Fit</p>
            <p className="text-white font-bold">
              {aiRanking.fitScore}%{' '}
              <span className="text-indigo-400 text-xs">
                × {Math.round(composite.weights.aiFit * 100)}%
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Knockout Report */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-900/20 overflow-hidden">
        <button onClick={() => toggle('knockout')} className="w-full flex items-center justify-between p-4 hover:bg-indigo-900/30 transition-colors">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${
              knockout.overallStatus === 'pass'
                ? 'text-emerald-400'
                : knockout.overallStatus === 'fail'
                  ? 'text-red-400'
                  : 'text-amber-400'
            }`} />
            <h3 className="font-bold text-white">Knockout Screening</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              knockout.overallStatus === 'pass'
                ? 'bg-emerald-500/20 text-emerald-300'
                : knockout.overallStatus === 'fail'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-amber-500/20 text-amber-200'
            }`}>
              {knockout.overallStatus === 'pass'
                ? 'PASSED'
                : knockout.overallStatus === 'fail'
                  ? `${knockout.hardFailCount} FAILED`
                  : `${knockout.needsConfirmationCount} NEED CONFIRMATION`}
            </span>
          </div>
          <ChevronIndicator expanded={isOpen('knockout')} />
        </button>
        {isOpen('knockout') && (
          <div className="px-4 pb-4 space-y-2">
            {knockout.results.length === 0 ? (
              <p className="text-sm text-indigo-300">No knockout criteria detected in this job posting.</p>
            ) : (
              knockout.results.map((k, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg p-3 ${
                  k.status === 'fail' ? 'bg-red-900/30 border border-red-500/20' :
                  k.status === 'pass' ? 'bg-emerald-900/20 border border-emerald-500/20' :
                  'bg-amber-900/20 border border-amber-500/20'
                }`}>
                  {k.status === 'pass' ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> :
                   k.status === 'fail' ? <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /> :
                   <HelpCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{k.requirement}</p>
                    <p className="text-xs text-indigo-300">
                      {k.category} • Checked: {k.checkedSection}
                      {k.evidence && <> • {k.evidence}</>}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Section Match Map */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-900/20 overflow-hidden">
        <button onClick={() => toggle('section')} className="w-full flex items-center justify-between p-4 hover:bg-indigo-900/30 transition-colors">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-300" />
            <h3 className="font-bold text-white">Section-Aware Matching</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-200">
              {sectionMatch.foundCount}/{sectionMatch.totalRequired} found
            </span>
          </div>
          <ChevronIndicator expanded={isOpen('section')} />
        </button>
        {isOpen('section') && (
          <div className="px-4 pb-4">
            <div className="rounded-lg overflow-hidden border border-indigo-500/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-indigo-900/50 text-indigo-300 text-xs uppercase tracking-wide">
                    <th className="text-left p-2">Skill</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Expected</th>
                    <th className="text-left p-2">Found In</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/10">
                  {sectionMatch.matches.map((m, i) => (
                    <tr key={i} className={m.found ? '' : 'bg-red-900/10'}>
                      <td className="p-2 text-white font-medium">{m.skill}</td>
                      <td className="p-2 text-indigo-300">{m.category}</td>
                      <td className="p-2 text-indigo-300">{m.expectedSection}</td>
                      <td className="p-2 text-indigo-300">{m.foundInSection || '—'}</td>
                      <td className="p-2 text-center">
                        {m.found ? (
                          m.isCorrectSection
                            ? <span className="text-emerald-400 text-xs font-semibold">✓ Match</span>
                            : <span className="text-amber-400 text-xs font-semibold">~ Wrong section</span>
                        ) : <span className="text-red-400 text-xs font-semibold">✗ Missing</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sectionMatch.preferredMatches.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-indigo-300 uppercase mb-1">Preferred Qualifications</p>
                <div className="flex flex-wrap gap-1.5">
                  {sectionMatch.preferredMatches.map((m, i) => (
                    <span key={i} className={`text-xs px-2 py-1 rounded-full ${m.found ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-800/50 text-indigo-400'}`}>
                      {m.found ? '✓' : '○'} {m.skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Boolean Search */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-900/20 overflow-hidden">
        <button onClick={() => toggle('boolean')} className="w-full flex items-center justify-between p-4 hover:bg-indigo-900/30 transition-colors">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-300" />
            <h3 className="font-bold text-white">Boolean Search Simulation</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              booleanSearch.wouldSurface === null
                ? 'bg-amber-500/20 text-amber-200'
                : booleanSearch.wouldSurface
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/20 text-red-300'
            }`}>
              {booleanSearch.wouldSurface === null
                ? 'NOT EVALUATED'
                : booleanSearch.wouldSurface
                  ? 'WOULD SURFACE'
                  : 'WOULD NOT SURFACE'}
            </span>
          </div>
          <ChevronIndicator expanded={isOpen('boolean')} />
        </button>
        {isOpen('boolean') && (
          <div className="px-4 pb-4 space-y-3">
            <div className="rounded-lg bg-indigo-950/50 p-3">
              <p className="text-xs text-indigo-400 mb-1">Simulated recruiter search:</p>
              <p className="text-sm text-indigo-200 font-mono">{booleanSearch.searchString}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {booleanSearch.termResults.map((t, i) => (
                <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${t.found ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30'}`}>
                  {t.found ? '✓' : '✗'} {t.term}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Fit Assessment */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-900/20 overflow-hidden">
        <button onClick={() => toggle('ai')} className="w-full flex items-center justify-between p-4 hover:bg-indigo-900/30 transition-colors">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white">AI Fit Assessment</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${scoreBg(aiRanking.fitScore).includes('emerald') ? 'bg-emerald-500/20 text-emerald-300' : scoreBg(aiRanking.fitScore).includes('blue') ? 'bg-blue-500/20 text-blue-300' : scoreBg(aiRanking.fitScore).includes('amber') ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
              {aiRanking.fitLabel}
            </span>
          </div>
          <ChevronIndicator expanded={isOpen('ai')} />
        </button>
        {isOpen('ai') && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-sm text-indigo-200">{aiRanking.summary}</p>

            {aiRanking.strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-300 uppercase mb-1">Strengths</p>
                {aiRanking.strengths.map((s, i) => (
                  <p key={i} className="text-sm text-indigo-200 ml-2">✓ {s}</p>
                ))}
              </div>
            )}

            {aiRanking.gaps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-300 uppercase mb-1">Gaps</p>
                {aiRanking.gaps.map((g, i) => (
                  <p key={i} className="text-sm text-indigo-200 ml-2">✗ {g}</p>
                ))}
              </div>
            )}

            {aiRanking.conceptualMatches.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-300 uppercase mb-1">Conceptual Matches</p>
                <p className="text-xs text-indigo-400 mb-1">Relevant experience even without exact keyword match</p>
                {aiRanking.conceptualMatches.map((c, i) => (
                  <p key={i} className="text-sm text-indigo-200 ml-2">~ {c}</p>
                ))}
              </div>
            )}

            {aiRanking.recommendations.length > 0 && (
              <div className="rounded-lg bg-indigo-950/50 border border-indigo-500/20 p-3">
                <p className="text-xs font-semibold text-orange-300 uppercase mb-2">Action Plan</p>
                {aiRanking.recommendations.map((r, i) => (
                  <p key={i} className="text-sm text-indigo-200 mb-1">{i + 1}. {r}</p>
                ))}
              </div>
            )}

            <p className="text-xs text-indigo-500 italic">This assessment is AI-generated. Deterministic layers above show exact matches.</p>
          </div>
        )}
      </div>
    </div>
  );
}
