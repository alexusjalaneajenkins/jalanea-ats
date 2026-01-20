'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Lightbulb,
  Building2,
  FileSearch,
  Users,
  Target,
  ChevronDown,
  ChevronUp,
  Check,
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
const STORAGE_KEY = 'jalanea-learn-read-sections';

export function LearnTab({ highlightedScore }: LearnTabProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('myths');
  const [readSections, setReadSections] = useState<Set<string>>(new Set());

  // Load read sections from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setReadSections(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save read sections to localStorage
  const markAsRead = useCallback((sectionId: string) => {
    setReadSections(prev => {
      const next = new Set(prev);
      next.add(sectionId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, []);

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
    const newExpanded = expandedSection === id ? null : id;
    setExpandedSection(newExpanded);
    // Mark as read when expanded
    if (newExpanded) {
      markAsRead(newExpanded);
    }
  };

  // Calculate progress
  const totalSections = 5; // myths, parsing, vendors, recruiters, optimization
  const readCount = readSections.size;
  const progressPercent = Math.round((readCount / totalSections) * 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-5">
        <div className="flex items-center justify-between gap-3">
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

          {/* Progress indicator */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-indigo-400">Progress</span>
              <div className="text-sm font-bold text-white">{readCount}/{totalSections}</div>
            </div>
            <div className="w-12 h-12 relative">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={progressPercent === 100 ? '#22c55e' : '#f97316'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(progressPercent / 100) * 125.6} 125.6`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {progressPercent === 100 ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <span className="text-xs font-bold text-white">{progressPercent}%</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
          <p className="text-sm text-indigo-200 leading-relaxed prose-readable">
            <span className="text-orange-400 font-bold">The truth:</span> ATS systems are
            more like filing cabinets than robot recruiters. Understanding how they actually
            work can help you optimize your resume without falling for common myths.
          </p>
        </div>
      </div>

      {/* Expandable Sections - 2-column masonry grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((section) => {
          const isExpanded = expandedSection === section.id;
          const isHighlighted = highlightedScore && section.relatedScores.includes(highlightedScore);
          const isRead = readSections.has(section.id);

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
                ${isExpanded ? 'md:col-span-2' : ''}
              `}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-indigo-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    relative w-10 h-10 rounded-xl flex items-center justify-center border
                    ${isHighlighted
                      ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
                      : isRead
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        : 'bg-indigo-800/50 border-indigo-500/30 text-indigo-400'
                    }
                  `}>
                    {section.icon}
                    {/* Read indicator badge */}
                    {isRead && !isHighlighted && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">
                        {section.title}
                      </h3>
                      {!isRead && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-medium">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-400">
                      {section.description}
                    </p>
                  </div>
                </div>
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center shrink-0
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
