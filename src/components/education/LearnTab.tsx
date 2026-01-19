'use client';

import { useState } from 'react';
import {
  GraduationCap,
  Lightbulb,
  Building2,
  FileSearch,
  Users,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ATSMythSection } from './ATSMythSection';
import { VendorComparison } from './VendorComparison';
import { HowParsingWorks } from './HowParsingWorks';
import { RecruiterBehavior } from './RecruiterBehavior';
import { OptimizationTips } from './OptimizationTips';

interface LearnTabProps {
  /** Currently highlighted score to link to relevant section */
  highlightedScore?: 'parse' | 'knockout' | 'semantic' | 'recruiter';
}

/**
 * Learn Tab Component
 *
 * Educational content about how ATS systems actually work.
 * Helps users understand the scoring system and optimize their resumes.
 */
export function LearnTab({ highlightedScore }: LearnTabProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('myths');

  const sections = [
    {
      id: 'myths',
      title: 'ATS Myth vs Reality',
      icon: <Lightbulb className="w-5 h-5" />,
      description: 'What ATS systems actually do (and don\'t do)',
      component: <ATSMythSection />,
      relatedScores: ['parse', 'knockout'],
    },
    {
      id: 'parsing',
      title: 'How Parsing Works',
      icon: <FileSearch className="w-5 h-5" />,
      description: 'Why your resume format matters',
      component: <HowParsingWorks />,
      relatedScores: ['parse'],
    },
    {
      id: 'vendors',
      title: 'ATS Vendor Differences',
      icon: <Building2 className="w-5 h-5" />,
      description: 'Greenhouse vs Workday vs Taleo',
      component: <VendorComparison />,
      relatedScores: ['semantic', 'recruiter'],
    },
    {
      id: 'recruiters',
      title: 'What Recruiters Actually Do',
      icon: <Users className="w-5 h-5" />,
      description: 'Boolean search, source sorting, and more',
      component: <RecruiterBehavior />,
      relatedScores: ['recruiter'],
    },
    {
      id: 'optimization',
      title: 'Optimizing Your Resume',
      icon: <Target className="w-5 h-5" />,
      description: 'Actionable tips for better scores',
      component: <OptimizationTips />,
      relatedScores: ['parse', 'knockout', 'semantic', 'recruiter'],
    },
  ];

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/30 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Understanding ATS Systems
            </h2>
            <p className="text-sm text-indigo-300">
              Learn how applicant tracking systems actually work
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
          <p className="text-sm text-indigo-200 leading-relaxed">
            <span className="text-orange-400 font-bold">The truth:</span> ATS systems are
            more like filing cabinets than robot recruiters. Understanding how they actually
            work can help you optimize your resume without falling for common myths.
          </p>
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const isExpanded = expandedSection === section.id;
          const isHighlighted = highlightedScore && section.relatedScores.includes(highlightedScore);

          return (
            <div
              key={section.id}
              className={`
                bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 overflow-hidden
                transition-all duration-300
                ${isHighlighted
                  ? 'border-orange-500/50 shadow-lg shadow-orange-500/10'
                  : 'border-indigo-500/30'
                }
              `}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-indigo-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center border
                    ${isHighlighted
                      ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
                      : 'bg-indigo-800/50 border-indigo-500/30 text-indigo-400'
                    }
                  `}>
                    {section.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-white">
                      {section.title}
                    </h3>
                    <p className="text-xs text-indigo-400">
                      {section.description}
                    </p>
                  </div>
                </div>
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${isExpanded ? 'bg-indigo-700/50' : 'bg-indigo-800/30'}
                `}>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-indigo-500/20">
                  {section.component}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-indigo-500 py-2">
        Based on research from industry sources and ATS vendor documentation
      </div>
    </div>
  );
}
