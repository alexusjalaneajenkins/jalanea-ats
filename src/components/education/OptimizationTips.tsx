'use client';

import { Target, FileCheck, Shield, Brain, Search, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Optimization Tips Section
 *
 * Actionable tips for improving each score type.
 */
export function OptimizationTips() {
  const scoreOptimizations = [
    {
      score: 'Parse Health',
      icon: <FileCheck className="w-5 h-5" />,
      color: 'emerald',
      description: 'How well your resume extracts into ATS fields',
      tips: [
        { tip: 'Use a single-column layout', impact: 'High', reason: 'Text extracts in correct reading order' },
        { tip: 'Standard section headers (Experience, Education, Skills)', impact: 'High', reason: 'ATS recognizes and categorizes content' },
        { tip: 'Avoid tables, text boxes, and headers/footers', impact: 'High', reason: 'Content often gets skipped or scrambled' },
        { tip: 'Use MM/YYYY date format consistently', impact: 'Medium', reason: 'Enables accurate experience calculation' },
        { tip: 'Keep contact info in main body, not header', impact: 'Medium', reason: 'Headers are often ignored by parsers' },
        { tip: 'Use standard fonts (Arial, Calibri, Times)', impact: 'Low', reason: 'Character recognition is more reliable' },
      ],
    },
    {
      score: 'Knockout Risk',
      icon: <Shield className="w-5 h-5" />,
      color: 'red',
      description: 'Requirements that can auto-disqualify you',
      tips: [
        { tip: 'Read knockout questions carefully before applying', impact: 'Critical', reason: 'Wrong answers = instant rejection' },
        { tip: "Don't apply if you don't meet must-have requirements", impact: 'Critical', reason: 'Save time and maintain application quality' },
        { tip: 'Include work authorization status clearly', impact: 'High', reason: 'Often a knockout question for employers' },
        { tip: 'List relevant certifications prominently', impact: 'High', reason: 'Required certs are common knockouts' },
        { tip: 'Make years of experience easily countable', impact: 'Medium', reason: 'Experience requirements are often knockouts' },
        { tip: 'Include education level if required', impact: 'Medium', reason: 'Degree requirements can be knockouts' },
      ],
    },
    {
      score: 'Semantic Match',
      icon: <Brain className="w-5 h-5" />,
      color: 'purple',
      description: 'How well your experience aligns with the role',
      tips: [
        { tip: 'Mirror language from the job description', impact: 'High', reason: 'AI matching looks for semantic similarity' },
        { tip: 'Include both acronyms and full terms (AWS, Amazon Web Services)', impact: 'High', reason: 'Covers different search variations' },
        { tip: 'Describe impact with metrics and outcomes', impact: 'High', reason: 'Shows depth of experience, not just exposure' },
        { tip: 'Use industry-standard terminology', impact: 'Medium', reason: 'Semantic models understand domain language' },
        { tip: 'Include relevant project descriptions', impact: 'Medium', reason: 'Demonstrates applied skills' },
        { tip: 'List technologies in context, not just as keywords', impact: 'Medium', reason: 'Shows actual usage, not keyword stuffing' },
      ],
    },
    {
      score: 'Recruiter Search',
      icon: <Search className="w-5 h-5" />,
      color: 'cyan',
      description: 'Likelihood of appearing in recruiter searches',
      tips: [
        { tip: 'Use standard job titles (Senior Software Engineer, not Code Ninja)', impact: 'High', reason: 'Recruiters search by common titles' },
        { tip: 'Include exact skill keywords from job posting', impact: 'High', reason: 'Boolean searches need exact matches' },
        { tip: 'List both soft and hard skills', impact: 'Medium', reason: 'Different roles emphasize different skill types' },
        { tip: 'Include location and remote preferences', impact: 'Medium', reason: 'Location is a common search filter' },
        { tip: 'Use common industry abbreviations', impact: 'Medium', reason: 'Recruiters often search by abbreviations' },
        { tip: 'Include years of experience prominently', impact: 'Medium', reason: 'Experience level is a key filter' },
      ],
    },
  ];

  const quickWins = [
    { action: 'Run your resume through our parser', benefit: 'See exactly what the ATS sees' },
    { action: 'Compare your skills to the job description', benefit: 'Identify gaps to address' },
    { action: 'Use a clean, single-column template', benefit: 'Eliminate parsing issues' },
    { action: 'Customize for each application', benefit: 'Match keywords and requirements' },
  ];

  const commonMistakes = [
    { mistake: 'Using fancy templates with columns and graphics', fix: 'Switch to simple, single-column layout' },
    { mistake: 'Putting contact info in header/footer', fix: 'Move to main document body' },
    { mistake: 'Creative job titles on LinkedIn and resume', fix: 'Use standard, searchable titles' },
    { mistake: 'Keyword stuffing in white text', fix: 'This is detectable and will get you rejected' },
    { mistake: 'Applying to jobs you\'re not qualified for', fix: 'Focus on roles where you meet 70%+ requirements' },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'emerald':
        return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' };
      case 'red':
        return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' };
      case 'purple':
        return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' };
      case 'cyan':
        return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300' };
      default:
        return { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300' };
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Critical':
        return 'bg-red-500/30 text-red-200';
      case 'High':
        return 'bg-amber-500/30 text-amber-200';
      case 'Medium':
        return 'bg-blue-500/30 text-blue-200';
      default:
        return 'bg-indigo-500/30 text-indigo-200';
    }
  };

  return (
    <div className="pt-4 space-y-6">
      {/* Overview */}
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/20">
        <p className="text-sm text-indigo-200">
          <span className="font-bold text-emerald-400">Optimization strategy: </span>
          Focus on high-impact changes first. A clean, parseable resume with relevant keywords
          will outperform a fancy design every time.
        </p>
      </div>

      {/* Quick Wins */}
      <div>
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          Quick Wins
        </h4>
        <div className="grid md:grid-cols-2 gap-3">
          {quickWins.map((item, idx) => (
            <div key={idx} className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white font-medium">{item.action}</p>
                  <p className="text-xs text-emerald-400 mt-0.5">{item.benefit}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score-Specific Tips */}
      {scoreOptimizations.map((section, idx) => {
        const colors = getColorClasses(section.color);
        return (
          <div key={idx}>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className={colors.text}>{section.icon}</span>
              {section.score} Tips
            </h4>
            <div className={`p-4 ${colors.bg} rounded-xl border ${colors.border}`}>
              <p className="text-xs text-indigo-300 mb-3">{section.description}</p>
              <div className="space-y-2">
                {section.tips.map((tip, tipIdx) => (
                  <div key={tipIdx} className="flex items-start gap-3 p-2 bg-indigo-950/30 rounded-lg">
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getImpactColor(tip.impact)}`}>
                      {tip.impact}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-white">{tip.tip}</p>
                      <p className="text-xs text-indigo-400 mt-0.5">{tip.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Common Mistakes */}
      <div>
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Common Mistakes to Avoid
        </h4>
        <div className="space-y-2">
          {commonMistakes.map((item, idx) => (
            <div key={idx} className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-200 font-medium">{item.mistake}</p>
                  <p className="text-xs text-emerald-400 mt-1">→ {item.fix}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Line */}
      <div className="p-4 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
        <h4 className="text-sm font-bold text-white mb-2">Remember</h4>
        <p className="text-sm text-indigo-300">
          The goal isn't to "trick" the ATS—it's to present your qualifications clearly so both
          the system and the recruiter can quickly understand your fit. A well-optimized resume
          benefits everyone in the process.
        </p>
      </div>
    </div>
  );
}
