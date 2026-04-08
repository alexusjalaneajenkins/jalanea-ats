import type {
  CoverageResult,
  KnockoutRiskResult,
  RecruiterSearchResult,
  SemanticMatchResult,
} from '@/lib/analysis';
import type {
  AtsReview,
  EmployerIntent,
  JobSignal,
  MatchAnalysis,
  MatchEvidence,
  ParsedJobData,
  ResearchAssistant,
  RoleBreakdown,
  TailoredDraft,
  TailoringSuggestion,
  TargetingArtifact,
} from '@/lib/types/targeting';

type AiAnalysisInput = {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
} | null | undefined;

export interface BuildTargetingArtifactInput {
  resumeText: string;
  jobDescriptionText: string;
  coverage: CoverageResult;
  recruiterSearch?: RecruiterSearchResult;
  semanticMatch?: SemanticMatchResult;
  knockoutRisk?: KnockoutRiskResult;
  aiAnalysis?: AiAnalysisInput;
}

export function buildTargetingArtifact({
  resumeText,
  jobDescriptionText,
  coverage,
  recruiterSearch,
  semanticMatch,
  knockoutRisk,
  aiAnalysis,
}: BuildTargetingArtifactInput): TargetingArtifact {
  const parsedJobData = parseJobData(jobDescriptionText, coverage);
  const proofMap = buildProofMap(parsedJobData, resumeText);
  const roleBreakdown = buildRoleBreakdown(parsedJobData);
  const employerIntent = buildEmployerIntent(parsedJobData, jobDescriptionText, coverage, knockoutRisk);
  const matchAnalysis = buildMatchAnalysis({
    proofMap,
    coverage,
    recruiterSearch,
    semanticMatch,
    aiAnalysis,
  });
  const researchAssistant = buildResearchAssistant(parsedJobData, proofMap, employerIntent, coverage);
  const tailoredDraft = buildTailoredDraft(parsedJobData, matchAnalysis, coverage, resumeText, aiAnalysis);
  const atsReview = buildAtsReview(resumeText, coverage, recruiterSearch, knockoutRisk);

  return {
    version: 1,
    parsedJobData,
    roleBreakdown,
    employerIntent,
    matchAnalysis,
    researchAssistant,
    tailoredDraft,
    atsReview,
    iterationHistory: [],
  };
}

function parseJobData(jobDescriptionText: string, coverage: CoverageResult): ParsedJobData {
  const jobLines = getMeaningfulLines(jobDescriptionText);
  const titleHint = extractTitleHint(jobLines);
  const companyHint = extractCompanyHint(jobDescriptionText);
  const seniorityHint = extractSeniorityHint(jobDescriptionText);
  const locationHint = extractLocationHint(jobDescriptionText);
  const summary = summarizeJob(jobDescriptionText);

  const responsibilities = buildSignals(jobLines, 'responsibility');
  const mustHaves = buildSignals(
    jobLines.filter((line) => /(must|required|minimum|experience with|proven|ability to|authorized|eligible|degree|certification|license)/i.test(line)),
    'experience',
    'must-have'
  );
  const preferredSignals = buildSignals(
    jobLines.filter((line) => /(preferred|nice to have|bonus|plus|ideally|familiarity)/i.test(line)),
    'skill',
    'preferred'
  );

  const toolsAndPlatforms = uniqueList([
    ...extractTools(jobDescriptionText),
    ...coverage.foundKeywords.filter((keyword) => /[A-Z]|\+|\#|aws|sql|excel|salesforce|zendesk|jira|figma|react|python|java/i.test(keyword)),
    ...coverage.missingKeywords.filter((keyword) => /[A-Z]|\+|\#|aws|sql|excel|salesforce|zendesk|jira|figma|react|python|java/i.test(keyword)),
  ]).slice(0, 8);

  const domainSignals = uniqueList(
    jobLines
      .filter((line) => /(customer|operations|sales|marketing|support|healthcare|finance|saas|retail|ecommerce|product|engineering)/i.test(line))
      .map(cleanSignalText)
  ).slice(0, 6);

  const outcomes = uniqueList(
    jobLines
      .filter((line) => /(improve|increase|grow|launch|build|own|deliver|support|optimi[sz]e|retain|reduce)/i.test(line))
      .map(cleanSignalText)
  ).slice(0, 6);

  return {
    titleHint,
    companyHint,
    seniorityHint,
    locationHint,
    summary,
    responsibilities: responsibilities.slice(0, 6),
    mustHaves: mustHaves.slice(0, 6),
    preferredSignals: preferredSignals.slice(0, 5),
    toolsAndPlatforms,
    domainSignals,
    outcomes,
  };
}

function buildRoleBreakdown(parsedJobData: ParsedJobData): RoleBreakdown {
  const mission = parsedJobData.outcomes[0]
    ? `The role appears focused on ${lowercaseFirst(parsedJobData.outcomes[0])}.`
    : `The role centers on ${parsedJobData.summary.toLowerCase()}.`;

  return {
    mission,
    dayToDayFocus: parsedJobData.responsibilities.map((signal) => signal.label).slice(0, 5),
    proofAreas: parsedJobData.mustHaves.map((signal) => signal.label).slice(0, 5),
    toolStack: parsedJobData.toolsAndPlatforms.slice(0, 6),
    successMeasures: parsedJobData.outcomes.length > 0
      ? parsedJobData.outcomes.slice(0, 4)
      : parsedJobData.responsibilities.map((signal) => signal.label).slice(0, 4),
    hiringManagerChecklist: uniqueList([
      ...parsedJobData.mustHaves.map((signal) => signal.label),
      ...parsedJobData.domainSignals,
    ]).slice(0, 6),
  };
}

function buildEmployerIntent(
  parsedJobData: ParsedJobData,
  jobDescriptionText: string,
  coverage: CoverageResult,
  knockoutRisk?: KnockoutRiskResult
): EmployerIntent {
  const whyNow: string[] = [];
  const teamContext: string[] = [];
  const pressurePoints: string[] = [];

  if (/(grow|scale|expanding|rapid|fast-paced|launch)/i.test(jobDescriptionText)) {
    whyNow.push('They appear to be hiring to handle growth or a new launch.');
  }
  if (/(retain|customer satisfaction|client experience|support|loyalty)/i.test(jobDescriptionText)) {
    whyNow.push('Customer outcomes look central, so they likely need someone who improves experience and retention.');
  }
  if (/(process|efficiency|optimi[sz]e|streamline|operations)/i.test(jobDescriptionText)) {
    pressurePoints.push('Operational efficiency and execution consistency matter in this role.');
  }
  if (/(cross-functional|collaborate|stakeholder|partner with|team)/i.test(jobDescriptionText)) {
    teamContext.push('This role likely works across teams, so communication proof matters.');
  }
  if (/(remote|hybrid|onsite|location)/i.test(jobDescriptionText)) {
    teamContext.push('Work setup/location expectations appear important and should be mirrored accurately.');
  }
  if (coverage.missingKeywords.length > 0) {
    pressurePoints.push(`The employer will likely screen for exact language around ${coverage.missingKeywords.slice(0, 3).join(', ')}.`);
  }

  const proofPriorities = uniqueList([
    ...parsedJobData.mustHaves.map((signal) => signal.label),
    ...parsedJobData.outcomes,
  ]).slice(0, 5);

  const candidateWarnings = uniqueList([
    knockoutRisk?.blockers.length ? 'Do not claim knockout requirements you cannot meet.' : '',
    coverage.missingKeywords.length > 0 ? 'Only add missing keywords when you can support them with real experience.' : '',
    'Favor metrics, scope, and outcomes over vague adjectives.',
  ].filter((value): value is string => Boolean(value)));

  return {
    primaryNeed: parsedJobData.outcomes[0] || parsedJobData.responsibilities[0]?.label || parsedJobData.summary,
    whyNow: whyNow.length > 0 ? whyNow : ['The employer seems to want someone who can deliver quickly with minimal ramp time.'],
    teamContext: teamContext.length > 0 ? teamContext : ['The posting suggests they want someone who can fit into the existing workflow without hand-holding.'],
    pressurePoints: pressurePoints.length > 0 ? pressurePoints : ['Exact skill alignment and proof of execution will matter most.'],
    proofPriorities,
    candidateWarnings,
  };
}

function buildProofMap(parsedJobData: ParsedJobData, resumeText: string): MatchEvidence[] {
  const resumeLines = getMeaningfulLines(resumeText);
  const focusSignals = uniqueSignals([
    ...parsedJobData.mustHaves,
    ...parsedJobData.responsibilities,
  ]).slice(0, 8);

  return focusSignals.map((signal, index) => {
    const resumeEvidence = findResumeEvidence(resumeLines, signal.keywords.length > 0 ? signal.keywords : [signal.label]);
    const status = resumeEvidence.length >= 2
      ? 'proven'
      : resumeEvidence.length === 1
        ? 'partial'
        : signal.priority === 'must-have'
          ? 'missing'
          : 'research';

    return {
      id: `proof-${index}`,
      requirement: signal.label,
      status,
      rationale: getMatchRationale(status, signal.priority),
      resumeEvidence,
      jdEvidence: signal.evidence,
      nextMove: getNextMove(status, signal.label),
    };
  });
}

function buildMatchAnalysis({
  proofMap,
  coverage,
  recruiterSearch,
  semanticMatch,
  aiAnalysis,
}: {
  proofMap: MatchEvidence[];
  coverage: CoverageResult;
  recruiterSearch?: RecruiterSearchResult;
  semanticMatch?: SemanticMatchResult;
  aiAnalysis?: AiAnalysisInput;
}): MatchAnalysis {
  const proven = proofMap.filter((item) => item.status === 'proven');
  const missing = proofMap.filter((item) => item.status === 'missing');
  const partial = proofMap.filter((item) => item.status === 'partial');

  const strengths = uniqueList([
    ...(aiAnalysis?.strengths || []),
    ...(semanticMatch?.analysis.strengths || []),
    ...proven.slice(0, 4).map((item) => `You already have resume proof for ${item.requirement.toLowerCase()}.`),
  ]).slice(0, 5);

  const gaps = uniqueList([
    ...(aiAnalysis?.gaps || []),
    ...(semanticMatch?.analysis.gaps || []),
    ...missing.map((item) => `You need defensible evidence for ${item.requirement.toLowerCase()}.`),
    ...coverage.missingKeywords.slice(0, 3).map((keyword) => `The job explicitly calls for "${keyword}" language.`),
  ]).slice(0, 6);

  const defensibleWins = uniqueList([
    ...proven.map((item) => item.requirement),
    ...(recruiterSearch?.matchedTitles || []),
    ...coverage.foundKeywords.slice(0, 4),
  ]).slice(0, 6);

  const unsupportedClaimsToAvoid = uniqueList([
    ...missing.map((item) => item.requirement),
    ...partial.filter((item) => item.resumeEvidence.length === 0).map((item) => item.requirement),
  ]).slice(0, 6);

  return {
    overallAssessment: aiAnalysis?.summary || semanticMatch?.analysis.summary || `You have ${proven.length} clearly supported matches and ${missing.length} areas that need better evidence or more precise language.`,
    strengths,
    gaps,
    defensibleWins,
    proofMap,
    unsupportedClaimsToAvoid,
  };
}

function buildResearchAssistant(
  parsedJobData: ParsedJobData,
  proofMap: MatchEvidence[],
  employerIntent: EmployerIntent,
  coverage: CoverageResult
): ResearchAssistant {
  const checklist = uniqueById<ResearchAssistant['checklist'][number]>([
    ...proofMap
      .filter((item) => item.status === 'missing' || item.status === 'research')
      .slice(0, 4)
      .map((item, index) => ({
        id: `research-proof-${index}`,
        question: `What real example proves ${lowercaseFirst(item.requirement)}?`,
        whyItMatters: 'You should only add claims you can back up with a concrete example, metric, or project.',
        sourceHint: 'Look at past work, metrics, project notes, or performance reviews.',
        output: 'One measurable bullet or specific accomplishment.',
      })),
    {
      id: 'research-company',
      question: `What does ${parsedJobData.companyHint || 'this employer'} care about most right now?`,
      whyItMatters: 'Tailoring lands better when you mirror the business problem, not just the title.',
      sourceHint: 'Use the company careers page, LinkedIn posts, About page, and recent job descriptions.',
      output: 'A short note on business priorities to echo in the resume summary.',
    },
  ]);

  const quickPrompts = uniqueList([
    `Find 3 responsibilities in this posting that directly affect business results: ${parsedJobData.titleHint || 'target role'}`,
    `Summarize what ${parsedJobData.companyHint || 'the employer'} seems to be hiring this person to improve.`,
    `List the exact phrases from the job posting worth mirroring only if they are true for me: ${coverage.missingKeywords.slice(0, 5).join(', ') || 'core requirements'}`,
  ]).slice(0, 3);

  const resumeProofRequests = uniqueList([
    ...employerIntent.proofPriorities.map((priority) => `Gather one metric or concrete example that proves ${lowercaseFirst(priority)}.`),
    'Write down which claims you can prove today versus what still needs evidence.',
  ]).slice(0, 5);

  return {
    checklist,
    quickPrompts,
    resumeProofRequests,
  };
}

function buildTailoredDraft(
  parsedJobData: ParsedJobData,
  matchAnalysis: MatchAnalysis,
  coverage: CoverageResult,
  resumeText: string,
  aiAnalysis?: AiAnalysisInput
): TailoredDraft {
  const suggestions: TailoringSuggestion[] = [];
  const summaryFocus = parsedJobData.titleHint || 'target role';
  const focusAreas = uniqueList([
    ...matchAnalysis.defensibleWins,
    ...coverage.missingKeywords.slice(0, 3),
  ]).slice(0, 5);

  for (const [index, item] of matchAnalysis.proofMap.slice(0, 5).entries()) {
    suggestions.push({
      id: `suggestion-${index}`,
      section: index === 0 ? 'summary' : 'experience',
      action: item.status === 'proven' ? 'rewrite' : item.status === 'partial' ? 'quantify' : 'add',
      instruction:
        item.status === 'proven'
          ? `Move stronger proof for ${item.requirement} closer to the top of the resume.`
          : item.status === 'partial'
            ? `Tighten the existing proof for ${item.requirement} with more scope, tools, or outcome detail.`
            : `Only add ${item.requirement} if you have a real example you can stand behind.`,
      rationale: item.rationale,
      proofRequired: item.resumeEvidence.length > 0 ? item.resumeEvidence : ['Add a real project, metric, customer outcome, or responsibility that proves this.'],
      safeExample: buildSafeExample(item.requirement),
      guardrail: 'Mirror the job language only when it is true. Replace generic adjectives with proof.',
    });
  }

  coverage.missingKeywords.slice(0, 2).forEach((keyword, index) => {
    suggestions.push({
      id: `keyword-suggestion-${index}`,
      section: 'skills',
      action: 'add',
      instruction: `Add the exact phrase "${keyword}" only if you have used it in real work, coursework, or projects.`,
      rationale: 'Exact ATS phrasing helps when the term is legitimate and supported.',
      proofRequired: [`Name where ${keyword} shows up in your work history before adding it.`],
      safeExample: `Example: Used ${keyword} while supporting [team/project] to achieve [outcome].`,
      guardrail: 'Do not keyword-stuff. Every term should map to real experience.',
    });
  });

  return {
    summaryLine: `Targeted for ${summaryFocus}${parsedJobData.companyHint ? ` at ${parsedJobData.companyHint}` : ''}`,
    focusAreas,
    suggestions: suggestions.slice(0, 7),
    draftText: resumeText,
    proofReminder: aiAnalysis?.recommendations?.[0] || 'Keep every change defensible. If you cannot prove it with a project, metric, or responsibility, leave it out.',
  };
}

function buildAtsReview(
  resumeText: string,
  coverage: CoverageResult,
  recruiterSearch?: RecruiterSearchResult,
  knockoutRisk?: KnockoutRiskResult
): AtsReview {
  const parseHealth = estimateParseHealth(resumeText);
  const blockers = uniqueList([
    ...(knockoutRisk?.blockers || []).map((item) => item.label),
    ...coverage.missingKeywords.slice(0, 3).map((keyword) => `Missing exact proof for ${keyword}`),
  ]);

  const readiness = knockoutRisk?.risk === 'high'
    ? 'risky'
    : parseHealth >= 80 && coverage.score >= 70
      ? 'ready'
      : 'needs-work';

  const checklist = [
    parseHealth >= 80 ? 'Resume structure looks ATS-friendly.' : 'Tighten formatting so section headers and bullets parse cleanly.',
    coverage.score >= 70 ? 'Core keyword coverage is solid.' : 'Add missing role language only where it is true.',
    recruiterSearch?.score ? `Recruiter search score is ${recruiterSearch.score}%.` : 'Recruiter search visibility will improve once the targeted language is added.',
    knockoutRisk?.risk === 'low' ? 'No major disqualifier risk is currently flagged.' : 'Review requirement blockers before you apply.',
  ];

  const recommendation = readiness === 'ready'
    ? 'You are close to a submission-ready targeted version. Focus on proof quality and final wording.'
    : readiness === 'needs-work'
      ? 'Tighten the tailored draft, confirm any missing proof, and rerun the ATS review before exporting.'
      : 'Resolve blocker requirements before treating this as an application-ready target.';

  return {
    readiness,
    parseHealth,
    keywordCoverage: coverage.score,
    recruiterSearch: recruiterSearch?.score,
    knockoutRisk: knockoutRisk?.risk || 'low',
    checklist,
    blockers,
    recommendation,
  };
}

function getMeaningfulLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/[•*\u2022]/g, ' ').trim())
    .filter((line) => line.length > 20);
}

function extractTitleHint(lines: string[]): string | null {
  const firstShortLine = lines.find((line) => line.length < 90 && !/[.:]/.test(line));
  if (firstShortLine) return firstShortLine;
  const titleMatch = lines.join(' ').match(/(?:for|seeking|hiring(?: for)?|looking for)\s+(an?|the)?\s*([A-Z][A-Za-z\s\-/&]+?)(?:\.|,|\sat\s|\swith\s)/);
  return titleMatch?.[2]?.trim() || null;
}

function extractCompanyHint(text: string): string | null {
  const companyMatch = text.match(/(?:at|join|for)\s+([A-Z][A-Za-z0-9&.,'\- ]{2,50})/);
  return companyMatch?.[1]?.trim() || null;
}

function extractSeniorityHint(text: string): string | null {
  const seniorityMatch = text.match(/\b(intern|junior|associate|mid(?:-level)?|senior|staff|lead|principal|manager|director|vp)\b/i);
  return seniorityMatch?.[1] ? capitalize(seniorityMatch[1]) : null;
}

function extractLocationHint(text: string): string | null {
  const locationMatch = text.match(/\b(remote|hybrid|on-?site|[A-Z][a-z]+,\s?[A-Z]{2})\b/i);
  return locationMatch?.[1] || null;
}

function summarizeJob(text: string): string {
  const sentence = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s/)[0] || '';
  return sentence.slice(0, 220).trim();
}

function buildSignals(lines: string[], fallbackCategory: JobSignal['category'], priority: JobSignal['priority'] = 'core'): JobSignal[] {
  return uniqueById(
    lines.map((line, index) => ({
      id: `${priority}-${index}`,
      label: cleanSignalText(line),
      category: classifySignal(line, fallbackCategory),
      priority,
      evidence: line,
      keywords: extractKeywordsFromSignal(line),
    }))
  );
}

function classifySignal(line: string, fallback: JobSignal['category']): JobSignal['category'] {
  if (/(sql|python|excel|salesforce|zendesk|jira|tableau|power bi|react|figma|aws|gcp|azure)/i.test(line)) return 'tool';
  if (/(degree|bachelor|master|certification|license)/i.test(line)) return 'education';
  if (/(experience|years|background|track record)/i.test(line)) return 'experience';
  if (/(collaborat|communicat|customer|stakeholder|leadership)/i.test(line)) return 'soft-skill';
  if (/(increase|reduce|retain|launch|improve|grow|deliver)/i.test(line)) return 'outcome';
  if (/(responsib|manage|own|support|coordinate|execute|develop|build|analy[sz]e)/i.test(line)) return 'responsibility';
  return fallback;
}

function extractTools(text: string): string[] {
  const matches = text.match(/\b(SQL|Python|Excel|Salesforce|Zendesk|Jira|Tableau|Power BI|React|TypeScript|JavaScript|AWS|GCP|Azure|HubSpot|Workday|Greenhouse|Lever|Figma|Photoshop|Illustrator)\b/gi) || [];
  return uniqueList(matches.map((match) => match.trim()));
}

function cleanSignalText(text: string): string {
  return text
    .replace(/^[-•\d.()\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[:;.,]+$/, '');
}

function extractKeywordsFromSignal(text: string): string[] {
  const phrases = text.match(/\b[A-Za-z][A-Za-z0-9+#/&-]{2,}\b/g) || [];
  return uniqueList(phrases.filter((word) => !STOP_WORDS.has(word.toLowerCase())).slice(0, 6));
}

function findResumeEvidence(resumeLines: string[], keywords: string[]): string[] {
  const loweredKeywords = keywords.map((keyword) => keyword.toLowerCase());
  return resumeLines.filter((line) => loweredKeywords.some((keyword) => line.toLowerCase().includes(keyword))).slice(0, 3);
}

function getMatchRationale(status: MatchEvidence['status'], priority: JobSignal['priority']): string {
  if (status === 'proven') return 'You already have language in the resume that supports this requirement.';
  if (status === 'partial') return 'There is some evidence, but the proof is thin or indirect.';
  if (status === 'research') {
    return priority === 'preferred'
      ? 'This looks optional, so research before adding or emphasizing it.'
      : 'This needs more context before it belongs in the targeted draft.';
  }
  return 'This requirement is not clearly proven in the resume yet.';
}

function getNextMove(status: MatchEvidence['status'], requirement: string): string {
  if (status === 'proven') return `Elevate the strongest example of ${lowercaseFirst(requirement)} higher in the document.`;
  if (status === 'partial') return `Add scope, tools, or a metric that makes ${lowercaseFirst(requirement)} explicit.`;
  if (status === 'research') return `Research whether you can defend ${lowercaseFirst(requirement)} before adding it.`;
  return `Do not add ${lowercaseFirst(requirement)} unless you can back it up with a real example.`;
}

function buildSafeExample(requirement: string): string {
  return `Rewrite a real bullet so it proves ${lowercaseFirst(requirement)} with context, action, and outcome. Example pattern: “Used [tool/skill] to [do what] which led to [measurable result].”`;
}

function estimateParseHealth(resumeText: string): number {
  const lines = resumeText.split('\n');
  const bulletCount = lines.filter((line) => /^[\s•*\-\d]/.test(line.trim())).length;
  const headerCount = lines.filter((line) => /^[A-Z][A-Z\s/&-]{3,}$/.test(line.trim())).length;
  const avgLineLength = lines.reduce((sum, line) => sum + line.trim().length, 0) / Math.max(lines.length, 1);

  let score = 70;
  if (bulletCount >= 4) score += 10;
  if (headerCount >= 3) score += 10;
  if (avgLineLength > 20 && avgLineLength < 110) score += 10;
  return Math.max(45, Math.min(98, Math.round(score)));
}

function uniqueSignals(signals: JobSignal[]): JobSignal[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = signal.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueList(values: string[]): string[] {
  return values.filter((value, index) => value && values.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index);
}

function uniqueById<T extends { id: string }>(values: T[]): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value.id)) return false;
    seen.add(value.id);
    return true;
  });
}

function lowercaseFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'their', 'have', 'will', 'you', 'our', 'all', 'are', 'who', 'can', 'has', 'using', 'use', 'through', 'about', 'more', 'than', 'year', 'years', 'work', 'role', 'team', 'job', 'required', 'preferred', 'must', 'ability', 'experience', 'strong', 'skills', 'skill', 'support', 'across',
]);
