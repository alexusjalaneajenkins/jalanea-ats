export interface ATSAnalysisResult {
  score: number;
  summary: string;
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

  return {
    score: clampScore(raw.score),
    summary:
      typeof raw.summary === 'string' && raw.summary.trim()
        ? raw.summary.trim()
        : 'Analysis completed.',
    keywordMatches: {
      found,
      missing,
      matchRate: computeMatchRate(found, missing, keywordMatchesRaw.matchRate),
    },
    sections: normalizeSections(raw.sections),
    formatting: {
      issues: toStringArray(formattingRaw.issues),
      suggestions: toStringArray(formattingRaw.suggestions),
    },
    overallSuggestions: toStringArray(raw.overallSuggestions),
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

  throw new Error('AI response was not valid JSON');
}
