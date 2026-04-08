export interface ATSAnalysisResult {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
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

const DEFAULT_SECTIONS = [
  'Contact Information',
  'Professional Summary',
  'Work Experience',
  'Skills',
  'Education',
];

function clampScore(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function computeMatchRate(found: string[], missing: string[], explicit: unknown): number {
  if (typeof explicit === 'number' && !Number.isNaN(explicit)) {
    return clampScore(explicit);
  }

  const total = found.length + missing.length;
  if (total === 0) return 0;
  return clampScore((found.length / total) * 100);
}

function normalizeSections(value: unknown): ATSAnalysisResult['sections'] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_SECTIONS.map((name) => ({
      name,
      score: 0,
      feedback: 'No feedback provided.',
    }));
  }

  const normalized = value
    .map((section) => {
      const record = typeof section === 'object' && section !== null
        ? (section as Record<string, unknown>)
        : null;

      if (!record) return null;

      const name = typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : null;

      if (!name) return null;

      return {
        name,
        score: clampScore(record.score),
        feedback: typeof record.feedback === 'string' && record.feedback.trim()
          ? record.feedback.trim()
          : 'No feedback provided.',
      };
    })
    .filter((section): section is ATSAnalysisResult['sections'][number] => !!section);

  return normalized.length > 0
    ? normalized
    : DEFAULT_SECTIONS.map((name) => ({
      name,
      score: 0,
      feedback: 'No feedback provided.',
    }));
}

function buildStrengths(
  explicit: unknown,
  foundKeywords: string[],
  sections: ATSAnalysisResult['sections']
): string[] {
  const provided = toStringArray(explicit).slice(0, 5);
  if (provided.length > 0) return provided;

  const strengths: string[] = [];

  if (foundKeywords.length > 0) {
    strengths.push(`Strong keyword overlap: ${foundKeywords.slice(0, 4).join(', ')}`);
  }

  const highSections = sections.filter((section) => section.score >= 80).slice(0, 3);
  for (const section of highSections) {
    strengths.push(`${section.name}: ${section.feedback}`);
  }

  if (strengths.length === 0) {
    strengths.push('Resume shows relevant baseline alignment to the role.');
  }

  return strengths.slice(0, 5);
}

function buildGaps(
  explicit: unknown,
  missingKeywords: string[],
  sections: ATSAnalysisResult['sections'],
  formattingIssues: string[]
): string[] {
  const provided = toStringArray(explicit).slice(0, 5);
  if (provided.length > 0) return provided;

  const gaps: string[] = [];

  if (missingKeywords.length > 0) {
    gaps.push(`Missing priority keywords: ${missingKeywords.slice(0, 4).join(', ')}`);
  }

  const weakSections = sections
    .filter((section) => section.score <= 60)
    .slice(0, 2)
    .map((section) => `${section.name}: ${section.feedback}`);
  gaps.push(...weakSections);

  if (formattingIssues.length > 0) {
    gaps.push(...formattingIssues.slice(0, 2));
  }

  if (gaps.length === 0) {
    gaps.push('No major gaps detected from the current analysis.');
  }

  return gaps.slice(0, 5);
}

function buildRecommendations(
  explicit: unknown,
  overallSuggestions: string[],
  formattingSuggestions: string[]
): string[] {
  const provided = toStringArray(explicit).slice(0, 5);
  if (provided.length > 0) return provided;

  const combined = [...overallSuggestions, ...formattingSuggestions]
    .map((value) => value.trim())
    .filter(Boolean);

  if (combined.length > 0) {
    return combined.slice(0, 5);
  }

  return ['Tailor resume bullets to mirror the job description language.'];
}

function normalizeATSAnalysis(raw: Record<string, unknown>): ATSAnalysisResult {
  const keywordMatchesRaw =
    typeof raw.keywordMatches === 'object' && raw.keywordMatches !== null
      ? (raw.keywordMatches as Record<string, unknown>)
      : {};

  const found = toStringArray(keywordMatchesRaw.found);
  const missing = toStringArray(keywordMatchesRaw.missing);

  const formattingRaw =
    typeof raw.formatting === 'object' && raw.formatting !== null
      ? (raw.formatting as Record<string, unknown>)
      : {};

  const sections = normalizeSections(raw.sections);
  const formattingIssues = toStringArray(formattingRaw.issues);
  const formattingSuggestions = toStringArray(formattingRaw.suggestions);
  const overallSuggestions = toStringArray(raw.overallSuggestions);
  const strengths = buildStrengths(raw.strengths, found, sections);
  const gaps = buildGaps(raw.gaps, missing, sections, formattingIssues);
  const recommendations = buildRecommendations(raw.recommendations, overallSuggestions, formattingSuggestions);

  return {
    score: clampScore(raw.score),
    summary:
      typeof raw.summary === 'string' && raw.summary.trim()
        ? raw.summary.trim()
        : 'Analysis completed.',
    strengths,
    gaps,
    recommendations,
    keywordMatches: {
      found,
      missing,
      matchRate: computeMatchRate(found, missing, keywordMatchesRaw.matchRate),
    },
    sections,
    formatting: {
      issues: formattingIssues,
      suggestions: formattingSuggestions,
    },
    overallSuggestions,
  };
}

function stripCodeFences(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function tryParseJson(value: string): unknown | null {
  const candidates = [
    value,
    value
      .replace(/^\uFEFF/, '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, '$1'),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try next cleanup strategy.
    }
  }

  return null;
}

function extractCandidates(raw: string): string[] {
  const stripped = stripCodeFences(raw);
  const candidates = [raw.trim(), stripped];

  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(stripped.slice(firstBrace, lastBrace + 1));
  }

  return candidates.filter(Boolean);
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value
      .replace(/\\"/g, '"')
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .trim();
  }
}

function extractNumber(raw: string, key: string): number | null {
  const match = raw.match(new RegExp(`"${key}"\\s*:\\s*([0-9]{1,3}(?:\\.[0-9]+)?)`, 'i'));
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractString(raw: string, key: string): string | null {
  const match = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'i'));
  if (!match) return null;

  const value = decodeJsonString(match[1]).trim();
  return value || null;
}

function extractStringArray(raw: string, key: string, maxItems = 25): string[] {
  const keyMatch = raw.match(new RegExp(`"${key}"\\s*:\\s*\\[`, 'i'));
  if (!keyMatch || typeof keyMatch.index !== 'number') return [];

  const start = keyMatch.index + keyMatch[0].length;
  const segment = raw.slice(start).split(']')[0] || raw.slice(start);
  const values: string[] = [];
  const valuePattern = /"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null = valuePattern.exec(segment);

  while (match && values.length < maxItems) {
    const decoded = decodeJsonString(match[1]).trim();
    if (decoded) values.push(decoded);
    match = valuePattern.exec(segment);
  }

  return values;
}

function recoverSections(raw: string): ATSAnalysisResult['sections'] {
  const keyMatch = raw.match(/"sections"\s*:\s*\[/i);
  if (!keyMatch || typeof keyMatch.index !== 'number') {
    return [];
  }

  const start = keyMatch.index + keyMatch[0].length;
  const sectionChunk = raw.slice(start);
  const objectPattern = /\{\s*"name"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"score"\s*:\s*([0-9]{1,3}(?:\.[0-9]+)?)\s*,\s*"feedback"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  const sections: ATSAnalysisResult['sections'] = [];
  let match: RegExpExecArray | null = objectPattern.exec(sectionChunk);

  while (match) {
    const name = decodeJsonString(match[1]).trim();
    const score = Number(match[2]);
    const feedback = decodeJsonString(match[3]).trim();

    if (name) {
      sections.push({
        name,
        score: clampScore(score),
        feedback: feedback || 'No feedback provided.',
      });
    }

    match = objectPattern.exec(sectionChunk);
  }

  return sections;
}

function recoverPartialAnalysis(raw: string): Record<string, unknown> | null {
  const score = extractNumber(raw, 'score');
  const summary = extractString(raw, 'summary');
  const strengths = extractStringArray(raw, 'strengths', 6);
  const gaps = extractStringArray(raw, 'gaps', 6);
  const recommendations = extractStringArray(raw, 'recommendations', 6);
  const found = extractStringArray(raw, 'found', 30);
  const missing = extractStringArray(raw, 'missing', 30);
  const matchRate = extractNumber(raw, 'matchRate');
  const sections = recoverSections(raw);
  const issues = extractStringArray(raw, 'issues', 15);
  const suggestions = extractStringArray(raw, 'suggestions', 15);
  const overallSuggestions = extractStringArray(raw, 'overallSuggestions', 10);

  const hasSignal =
    score !== null ||
    !!summary ||
    strengths.length > 0 ||
    gaps.length > 0 ||
    recommendations.length > 0 ||
    found.length > 0 ||
    missing.length > 0 ||
    sections.length > 0 ||
    issues.length > 0 ||
    suggestions.length > 0 ||
    overallSuggestions.length > 0;

  if (!hasSignal) {
    return null;
  }

  return {
    ...(score !== null ? { score } : {}),
    ...(summary ? { summary } : {}),
    ...(strengths.length > 0 ? { strengths } : {}),
    ...(gaps.length > 0 ? { gaps } : {}),
    ...(recommendations.length > 0 ? { recommendations } : {}),
    keywordMatches: {
      found,
      missing,
      ...(matchRate !== null ? { matchRate } : {}),
    },
    ...(sections.length > 0 ? { sections } : {}),
    formatting: {
      issues,
      suggestions,
    },
    overallSuggestions,
  };
}

export function parseATSAnalysisResponse(raw: string): ATSAnalysisResult {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('AI returned an empty analysis response');
  }

  for (const candidate of extractCandidates(raw)) {
    const parsed = tryParseJson(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return normalizeATSAnalysis(parsed as Record<string, unknown>);
    }
  }

  const recovered = recoverPartialAnalysis(raw);
  if (recovered) {
    return normalizeATSAnalysis(recovered);
  }

  throw new Error('AI response was not valid JSON');
}
