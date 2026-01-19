'use client';

import { Search, Clock, Filter, MousePointer, Eye, TrendingUp } from 'lucide-react';

/**
 * Recruiter Behavior Section
 *
 * Explains how recruiters actually use ATS systems to find candidates.
 */
export function RecruiterBehavior() {
  const searchBehaviors = [
    {
      behavior: 'Boolean Search',
      description: 'Recruiters use AND/OR/NOT operators to find candidates',
      example: '"software engineer" AND (Python OR Java) AND NOT "junior"',
      implication: 'Your resume needs exact keyword matches to appear in results',
    },
    {
      behavior: 'Title Filtering',
      description: 'Filter by current or past job titles',
      example: 'Current Title = "Senior Developer" OR "Staff Engineer"',
      implication: 'Use standard job titles, not creative ones like "Code Ninja"',
    },
    {
      behavior: 'Experience Ranges',
      description: 'Filter by years of experience in field or role',
      example: 'Experience >= 5 years AND Experience <= 10 years',
      implication: 'Make your experience duration clear with dates',
    },
    {
      behavior: 'Location/Remote',
      description: 'Filter by location, willingness to relocate, or remote status',
      example: 'Location = "San Francisco Bay Area" OR Remote = true',
      implication: 'Include your location and remote preferences clearly',
    },
  ];

  const timeStats = [
    { stat: '6-7 seconds', description: 'Average time spent reviewing a resume initially' },
    { stat: '250+', description: 'Average applications per corporate job posting' },
    { stat: '2-3%', description: 'Typical interview rate from applications' },
    { stat: '30-50', description: 'Candidates typically reviewed per role' },
  ];

  const reviewPriority = [
    { priority: 1, item: 'Current job title and company', reason: 'Immediate relevance check' },
    { priority: 2, item: 'Years of relevant experience', reason: 'Meets minimum requirements?' },
    { priority: 3, item: 'Key skills and technologies', reason: 'Technical fit assessment' },
    { priority: 4, item: 'Education (if required)', reason: 'Degree/certification check' },
    { priority: 5, item: 'Location/work authorization', reason: 'Logistical feasibility' },
  ];

  const sourcingTiers = [
    {
      tier: 'Tier 1: Referrals',
      percentage: '~40% of hires',
      description: 'Employee referrals get priority review and faster processing',
      color: 'emerald',
    },
    {
      tier: 'Tier 2: Sourced',
      percentage: '~30% of hires',
      description: 'Candidates recruiters actively found on LinkedIn, GitHub, etc.',
      color: 'blue',
    },
    {
      tier: 'Tier 3: Inbound',
      percentage: '~30% of hires',
      description: 'Applications through job postings (where you likely are)',
      color: 'amber',
    },
  ];

  return (
    <div className="pt-4 space-y-6">
      {/* Overview */}
      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
        <p className="text-sm text-indigo-200">
          <span className="font-bold text-blue-400">Reality check: </span>
          Recruiters don't read every resume. They search, filter, and skim.
          Understanding their workflow helps you appear in searches and pass the 6-second scan.
        </p>
      </div>

      {/* Time Statistics */}
      <div>
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          The Numbers You're Up Against
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {timeStats.map((item, idx) => (
            <div key={idx} className="p-3 bg-indigo-950/50 rounded-xl border border-indigo-500/20 text-center">
              <div className="text-xl font-bold text-white">{item.stat}</div>
              <div className="text-xs text-indigo-400 mt-1">{item.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How Recruiters Search */}
      <div>
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-400" />
          How Recruiters Search
        </h4>
        <div className="space-y-3">
          {searchBehaviors.map((item, idx) => (
            <div key={idx} className="p-4 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-bold text-white">{item.behavior}</span>
              </div>
              <p className="text-xs text-indigo-300 mb-2">{item.description}</p>
              <div className="p-2 bg-indigo-900/50 rounded-lg mb-2">
                <code className="text-xs text-cyan-400 font-mono">{item.example}</code>
              </div>
              <p className="text-xs text-amber-400/80 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {item.implication}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sourcing Tiers */}
      <div>
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          Where Hires Actually Come From
        </h4>
        <div className="space-y-2">
          {sourcingTiers.map((tier, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border ${
                tier.color === 'emerald'
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : tier.color === 'blue'
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-amber-500/10 border-amber-500/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-bold ${
                  tier.color === 'emerald'
                    ? 'text-emerald-300'
                    : tier.color === 'blue'
                    ? 'text-blue-300'
                    : 'text-amber-300'
                }`}>
                  {tier.tier}
                </span>
                <span className={`text-xs font-medium ${
                  tier.color === 'emerald'
                    ? 'text-emerald-400'
                    : tier.color === 'blue'
                    ? 'text-blue-400'
                    : 'text-amber-400'
                }`}>
                  {tier.percentage}
                </span>
              </div>
              <p className="text-xs text-indigo-300">{tier.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What They Look At First */}
      <div>
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400" />
          The 6-Second Scan (In Order)
        </h4>
        <div className="space-y-2">
          {reviewPriority.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
              <div className="w-8 h-8 rounded-lg bg-indigo-800/50 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-indigo-300">{item.priority}</span>
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-white">{item.item}</span>
                <span className="text-xs text-indigo-400 ml-2">— {item.reason}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Takeaway */}
      <div className="p-4 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
        <h4 className="text-sm font-bold text-white mb-2">What This Means For You</h4>
        <ul className="space-y-2 text-sm text-indigo-300">
          <li className="flex items-start gap-2">
            <MousePointer className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <span>Your top third of page 1 is prime real estate—put key info there</span>
          </li>
          <li className="flex items-start gap-2">
            <MousePointer className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <span>Use exact keywords from the job description to appear in Boolean searches</span>
          </li>
          <li className="flex items-start gap-2">
            <MousePointer className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <span>Referrals dramatically increase your chances—network actively</span>
          </li>
          <li className="flex items-start gap-2">
            <MousePointer className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <span>Make your current title and experience level immediately visible</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
