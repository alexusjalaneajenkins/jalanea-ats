'use client';

import { FileText, AlertTriangle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

/**
 * How Parsing Works Section
 *
 * Explains the resume parsing process and why format matters.
 */
export function HowParsingWorks() {
  const parsingSteps = [
    {
      step: 1,
      title: 'Text Extraction',
      description: 'ATS extracts raw text from your file (PDF, DOCX, etc.)',
      issue: 'Complex layouts cause text to extract in wrong order',
    },
    {
      step: 2,
      title: 'Section Detection',
      description: 'System identifies sections: Contact, Experience, Education, Skills',
      issue: 'Non-standard headers may not be recognized',
    },
    {
      step: 3,
      title: 'Field Mapping',
      description: 'Content is mapped to database fields for search and display',
      issue: 'Misclassified content becomes unsearchable',
    },
    {
      step: 4,
      title: 'Indexing',
      description: 'Keywords and data are indexed for recruiter searches',
      issue: 'Missing or corrupted data = you don\'t appear in searches',
    },
  ];

  const goodPractices = [
    { practice: 'Single column layout', reason: 'Text extracts in correct order' },
    { practice: 'Standard section headers', reason: 'Experience, Education, Skills recognized' },
    { practice: 'Contact info at top', reason: 'Easily identified and mapped' },
    { practice: 'Text-based content', reason: 'Not images or graphics with embedded text' },
    { practice: 'Standard fonts', reason: 'Characters recognized correctly' },
    { practice: 'MM/YYYY date format', reason: 'Temporal data parsed for experience calculation' },
  ];

  const badPractices = [
    { practice: 'Tables and columns', reason: 'Text order gets scrambled' },
    { practice: 'Headers/footers for contact', reason: 'Often skipped by parsers' },
    { practice: 'Text boxes', reason: 'Content may be ignored entirely' },
    { practice: 'Creative section names', reason: '"Journey" instead of "Experience" not recognized' },
    { practice: 'Graphics with text', reason: 'Text in images is invisible to ATS' },
    { practice: 'Unusual fonts', reason: 'Character recognition may fail' },
  ];

  return (
    <div className="pt-4 space-y-6">
      {/* Overview */}
      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20">
        <p className="text-sm text-indigo-200">
          <span className="font-bold text-blue-400">Why it matters: </span>
          If your resume doesn't parse correctly, your information gets filed incorrectly
          or becomes unsearchable. You exist in the system but can't be found.
        </p>
      </div>

      {/* Parsing Steps */}
      <div>
        <h4 className="text-sm font-bold text-white mb-3">The Parsing Pipeline</h4>
        <div className="space-y-2">
          {parsingSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-800/50 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-indigo-300">{step.step}</span>
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{step.title}</span>
                  {idx < parsingSteps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-indigo-600" />
                  )}
                </div>
                <p className="text-xs text-indigo-400 mt-0.5">{step.description}</p>
                <p className="text-xs text-amber-400/80 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {step.issue}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Do's and Don'ts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Good Practices */}
        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
          <h4 className="text-sm font-bold text-emerald-300 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Do This
          </h4>
          <div className="space-y-2">
            {goodPractices.map((item, idx) => (
              <div key={idx} className="text-xs">
                <span className="text-white font-medium">{item.practice}</span>
                <span className="text-indigo-400"> — {item.reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bad Practices */}
        <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
          <h4 className="text-sm font-bold text-red-300 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Avoid This
          </h4>
          <div className="space-y-2">
            {badPractices.map((item, idx) => (
              <div key={idx} className="text-xs">
                <span className="text-white font-medium">{item.practice}</span>
                <span className="text-indigo-400"> — {item.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Example */}
      <div className="p-4 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
        <h4 className="text-sm font-bold text-white mb-3">What "Silent Rejection" Looks Like</h4>
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <p className="text-red-300 font-medium mb-2">Two-Column Resume Parsed:</p>
            <div className="font-mono text-indigo-400 space-y-1">
              <p>John Software                    Doe</p>
              <p>Engineer     john@email.com     (555)</p>
              <p>123-4567   5 years           Python</p>
              <p>JavaScript   experience         AWS</p>
            </div>
            <p className="text-red-400 mt-2">Fields: scrambled, unsearchable</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <p className="text-emerald-300 font-medium mb-2">Single-Column Resume Parsed:</p>
            <div className="font-mono text-indigo-400 space-y-1">
              <p>John Doe</p>
              <p>Software Engineer</p>
              <p>john@email.com | (555) 123-4567</p>
              <p>Skills: Python, JavaScript, AWS</p>
            </div>
            <p className="text-emerald-400 mt-2">Fields: correct, searchable</p>
          </div>
        </div>
      </div>
    </div>
  );
}
