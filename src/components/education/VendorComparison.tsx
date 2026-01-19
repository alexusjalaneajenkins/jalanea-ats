'use client';

import { Building2, Bot, Search, CheckCircle2 } from 'lucide-react';

/**
 * Vendor Comparison Section
 *
 * Explains the differences between major ATS vendors
 * and how they affect job seekers.
 */
export function VendorComparison() {
  const vendors = [
    {
      category: 'Sorters (AI Ranking)',
      description: 'These systems use AI to score and rank candidates',
      color: 'purple',
      systems: [
        {
          name: 'Workday',
          addon: 'HiredScore',
          marketShare: '~20%',
          howItWorks: 'AI grades candidates A/B/C/D based on job fit. Recruiters see ranked lists.',
          yourStrategy: 'Semantic match matters most. Use industry terminology and demonstrate relevant experience.',
        },
        {
          name: 'iCIMS',
          addon: 'Talent Cloud AI',
          marketShare: '~15%',
          howItWorks: 'Role Fit score compares your profile to ideal candidates. Machine learning improves over time.',
          yourStrategy: 'Match the job description closely. Skills and experience alignment are weighted heavily.',
        },
        {
          name: 'Taleo',
          addon: 'ACE',
          marketShare: '~10%',
          howItWorks: 'Automated Candidate Evaluation scores based on configurable criteria.',
          yourStrategy: 'Exact keyword matching still important. Taleo is older and less semantic.',
        },
      ],
    },
    {
      category: 'Processors (No AI Ranking)',
      description: 'These systems DON\'T rank - recruiters search manually',
      color: 'cyan',
      systems: [
        {
          name: 'Greenhouse',
          addon: 'None',
          marketShare: '~25%',
          howItWorks: 'Pure database. Recruiters use Boolean search to find candidates. No AI scoring.',
          yourStrategy: 'Keyword presence matters. Make sure searchable terms are in your resume.',
        },
        {
          name: 'Lever',
          addon: 'None',
          marketShare: '~15%',
          howItWorks: 'CRM-style system. Recruiters manually review or search. No automated scoring.',
          yourStrategy: 'Focus on being findable via search. Use exact job title matches.',
        },
        {
          name: 'Ashby',
          addon: 'None',
          marketShare: '~5%',
          howItWorks: 'Modern system focused on recruiter workflow. No AI ranking.',
          yourStrategy: 'Clean parsing and keyword coverage. Human recruiters make all decisions.',
        },
      ],
    },
  ];

  return (
    <div className="pt-4 space-y-6">
      {/* Overview */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/20">
        <p className="text-sm text-indigo-200">
          <span className="font-bold text-cyan-400">Important: </span>
          Not all ATS systems work the same way. Knowing which type a company uses
          helps you optimize your application strategy.
        </p>
      </div>

      {/* Vendor Categories */}
      {vendors.map((category, idx) => (
        <div key={idx} className="space-y-3">
          {/* Category Header */}
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${category.color === 'purple'
                ? 'bg-purple-500/20 border border-purple-500/30'
                : 'bg-cyan-500/20 border border-cyan-500/30'
              }
            `}>
              {category.color === 'purple' ? (
                <Bot className={`w-5 h-5 text-purple-400`} />
              ) : (
                <Search className={`w-5 h-5 text-cyan-400`} />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{category.category}</h4>
              <p className="text-xs text-indigo-400">{category.description}</p>
            </div>
          </div>

          {/* Systems Grid */}
          <div className="grid gap-3">
            {category.systems.map((system, sIdx) => (
              <div
                key={sIdx}
                className={`
                  p-4 rounded-xl border
                  ${category.color === 'purple'
                    ? 'bg-purple-500/5 border-purple-500/20'
                    : 'bg-cyan-500/5 border-cyan-500/20'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold text-white">{system.name}</span>
                    {system.addon !== 'None' && (
                      <span className={`ml-2 text-xs ${
                        category.color === 'purple' ? 'text-purple-400' : 'text-cyan-400'
                      }`}>
                        + {system.addon}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-indigo-500">{system.marketShare}</span>
                </div>

                <p className="text-xs text-indigo-300 mb-2">
                  <span className="text-indigo-400">How it works: </span>
                  {system.howItWorks}
                </p>

                <div className={`
                  flex items-start gap-2 p-2 rounded-lg
                  ${category.color === 'purple'
                    ? 'bg-purple-500/10'
                    : 'bg-cyan-500/10'
                  }
                `}>
                  <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    category.color === 'purple' ? 'text-purple-400' : 'text-cyan-400'
                  }`} />
                  <p className="text-xs text-indigo-200">
                    <span className="font-medium">Your strategy: </span>
                    {system.yourStrategy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Score Relevance */}
      <div className="p-4 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
        <h4 className="text-sm font-bold text-white mb-3">Which Score Matters Most?</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10">
            <span className="text-purple-300">Workday, iCIMS, Taleo</span>
            <span className="text-xs text-purple-400 font-medium">Semantic Match Score</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-500/10">
            <span className="text-cyan-300">Greenhouse, Lever, Ashby</span>
            <span className="text-xs text-cyan-400 font-medium">Recruiter Search Score</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/10">
            <span className="text-indigo-300">All ATS Systems</span>
            <span className="text-xs text-indigo-400 font-medium">Parse Health + Knockout Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
