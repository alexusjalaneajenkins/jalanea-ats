import type {
  AIRankingResult,
  KnockoutCriterion,
  ParsedJobDescription,
  ParsedResume,
  RequiredSkill,
} from './types';

type UnknownRecord = Record<string, unknown>;

const KNOCKOUT_CATEGORIES = new Set<KnockoutCriterion['category']>([
  'education',
  'certification',
  'authorization',
  'physical',
  'screening',
]);
const SKILL_CATEGORIES = new Set<RequiredSkill['category']>([
  'technical',
  'clinical',
  'soft',
  'tool',
]);
const MATCH_SECTIONS = new Set<RequiredSkill['matchSection']>([
  'skills',
  'certifications',
  'experience',
  'any',
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, maxLength = 2_000): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function optionalString(value: unknown, maxLength = 2_000): string | undefined {
  const normalized = asString(value, maxLength);
  return normalized || undefined;
}

function asStringArray(
  value: unknown,
  maxItems = 200,
  maxItemLength = 2_000
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function requireRecord(value: unknown, context: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new Error(`Invalid ${context} response shape`);
  }
  return value;
}

function requireArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${context} response shape`);
  }
  return value;
}

export function extractGeminiText(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.candidates)) return null;
  const candidate = payload.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content)) return null;
  const parts = candidate.content.parts;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .map((part) => (isRecord(part) ? asString(part.text, 200_000) : ''))
    .join('')
    .trim();
  return text || null;
}

export function parseResumePayload(text: string): ParsedResume {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Resume analysis returned invalid JSON');
  }

  const parsed = requireRecord(raw, 'resume analysis');
  const contactInfo = requireRecord(parsed.contactInfo, 'resume analysis');
  const rawWorkHistory = requireArray(
    parsed.workHistory,
    'resume analysis'
  );
  const rawEducation = requireArray(parsed.education, 'resume analysis');
  requireArray(parsed.skills, 'resume analysis');
  requireArray(parsed.certifications, 'resume analysis');

  const workHistory = rawWorkHistory
    .filter(isRecord)
    .map((entry) => ({
      title: asString(entry.title),
      company: asString(entry.company),
      location: optionalString(entry.location),
      startDate: optionalString(entry.startDate),
      endDate: optionalString(entry.endDate),
      isCurrent:
        typeof entry.isCurrent === 'boolean' ? entry.isCurrent : undefined,
      bullets: asStringArray(entry.bullets),
    }))
    .filter((entry) => entry.title || entry.company || entry.bullets.length)
    .slice(0, 100);

  const education = rawEducation
    .filter(isRecord)
    .map((entry) => ({
      degree: asString(entry.degree),
      field: optionalString(entry.field),
      school: asString(entry.school),
      graduationDate: optionalString(entry.graduationDate),
      gpa: optionalString(entry.gpa),
    }))
    .filter((entry) => entry.degree || entry.school)
    .slice(0, 50);

  const volunteerWork = Array.isArray(parsed.volunteerWork)
    ? parsed.volunteerWork
        .filter(isRecord)
        .map((entry) => ({
          role: asString(entry.role),
          organization: asString(entry.organization),
          description: optionalString(entry.description),
        }))
        .filter((entry) => entry.role || entry.organization)
        .slice(0, 50)
    : undefined;

  return {
    contactInfo: {
      name: asString(contactInfo.name),
      email: optionalString(contactInfo.email),
      phone: optionalString(contactInfo.phone),
      location: optionalString(contactInfo.location),
      linkedin: optionalString(contactInfo.linkedin),
    },
    summary: optionalString(parsed.summary, 10_000),
    workHistory,
    education,
    skills: asStringArray(parsed.skills),
    certifications: asStringArray(parsed.certifications),
    languages: Array.isArray(parsed.languages)
      ? asStringArray(parsed.languages)
      : undefined,
    volunteerWork,
  };
}

export function parseJobDescriptionPayload(
  text: string
): ParsedJobDescription {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Job analysis returned invalid JSON');
  }

  const parsed = requireRecord(raw, 'job analysis');
  const rawKnockouts = requireArray(
    parsed.knockoutCriteria,
    'job analysis'
  );
  const rawSkills = requireArray(parsed.requiredSkills, 'job analysis');
  requireArray(parsed.requiredCertifications, 'job analysis');
  requireArray(parsed.preferredQualifications, 'job analysis');
  requireArray(parsed.keyResponsibilities, 'job analysis');
  requireArray(parsed.booleanSearchTerms, 'job analysis');

  const knockoutCriteria = rawKnockouts
    .filter(isRecord)
    .flatMap((criterion): KnockoutCriterion[] => {
      const requirement = asString(criterion.requirement);
      const category = asString(
        criterion.category
      ) as KnockoutCriterion['category'];
      if (
        !requirement ||
        !KNOCKOUT_CATEGORIES.has(category) ||
        typeof criterion.isHardRequirement !== 'boolean'
      ) {
        return [];
      }
      return [
        {
          requirement,
          category,
          isHardRequirement: criterion.isHardRequirement,
        },
      ];
    })
    .slice(0, 100);

  const requiredSkills = rawSkills
    .filter(isRecord)
    .flatMap((skill): RequiredSkill[] => {
      const name = asString(skill.skill);
      const category = asString(skill.category) as RequiredSkill['category'];
      const matchSection = asString(
        skill.matchSection
      ) as RequiredSkill['matchSection'];
      if (
        !name ||
        !SKILL_CATEGORIES.has(category) ||
        !MATCH_SECTIONS.has(matchSection)
      ) {
        return [];
      }
      return [{ skill: name, category, matchSection }];
    })
    .slice(0, 200);

  let requiredEducation: ParsedJobDescription['requiredEducation'];
  if (isRecord(parsed.requiredEducation)) {
    const minimumDegree = asString(parsed.requiredEducation.minimumDegree);
    if (minimumDegree) {
      requiredEducation = {
        minimumDegree,
        field: optionalString(parsed.requiredEducation.field),
      };
    }
  }

  return {
    roleTitle: asString(parsed.roleTitle),
    company: optionalString(parsed.company),
    location: optionalString(parsed.location),
    employmentType: optionalString(parsed.employmentType),
    knockoutCriteria,
    requiredSkills,
    requiredEducation,
    requiredCertifications: asStringArray(parsed.requiredCertifications),
    preferredQualifications: asStringArray(parsed.preferredQualifications),
    keyResponsibilities: asStringArray(parsed.keyResponsibilities),
    booleanSearchTerms: asStringArray(parsed.booleanSearchTerms),
  };
}

function labelForScore(score: number): AIRankingResult['fitLabel'] {
  if (score >= 85) return 'Strong Match';
  if (score >= 65) return 'Good Match';
  if (score >= 40) return 'Partial Match';
  return 'Weak Match';
}

export function parseAIRankingPayload(text: string): AIRankingResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('AI ranking returned invalid JSON');
  }

  const parsed = requireRecord(raw, 'AI ranking');
  if (typeof parsed.fitScore !== 'number' || !Number.isFinite(parsed.fitScore)) {
    throw new Error('Invalid AI ranking response shape');
  }

  const summary = asString(parsed.summary, 10_000);
  if (
    !summary ||
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.gaps) ||
    !Array.isArray(parsed.conceptualMatches) ||
    !Array.isArray(parsed.recommendations)
  ) {
    throw new Error('Invalid AI ranking response shape');
  }

  const fitScore = Math.round(Math.min(100, Math.max(0, parsed.fitScore)));
  return {
    fitScore,
    fitLabel: labelForScore(fitScore),
    summary,
    strengths: asStringArray(parsed.strengths, 50),
    gaps: asStringArray(parsed.gaps, 50),
    conceptualMatches: asStringArray(parsed.conceptualMatches, 50),
    recommendations: asStringArray(parsed.recommendations, 50),
  };
}
