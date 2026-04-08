/**
 * V2 Job Description Parser — AI-first requirement extraction via Gemini
 */

import type { ParsedJobDescription } from './types';

const JD_PARSE_PROMPT = `You are an ATS recruiter configuration assistant. Read this job description and extract the screening criteria a recruiter would configure in their ATS.

Return JSON matching this structure:
{
  "roleTitle": "exact job title",
  "company": "company name if mentioned",
  "location": "location if mentioned",
  "employmentType": "full-time/part-time/contract etc",
  "knockoutCriteria": [
    {
      "requirement": "what is required",
      "category": "education|certification|authorization|physical|screening",
      "isHardRequirement": true
    }
  ],
  "requiredSkills": [
    {
      "skill": "skill name",
      "category": "technical|clinical|soft|tool",
      "matchSection": "skills|certifications|experience|any"
    }
  ],
  "requiredEducation": { "minimumDegree": "High School Diploma/Associate/Bachelor/Master/PhD", "field": "field if specified" },
  "requiredCertifications": ["cert1", "cert2"],
  "preferredQualifications": ["nice-to-have 1", "nice-to-have 2"],
  "keyResponsibilities": ["responsibility 1", "responsibility 2"],
  "booleanSearchTerms": ["term1", "term2", "term3"]
}

Rules:
- knockoutCriteria: Only include HARD requirements that would auto-reject a candidate (licenses, certifications, degrees, background checks, physical requirements, work authorization). Mark isHardRequirement=true for must-haves, false for strong preferences.
- requiredSkills: ONLY extract concrete, ATS-searchable professional skills and qualifications that a recruiter would actually filter resumes by. DO NOT include:
  * Generic aspirational phrases from company culture sections (e.g., "work with kids", "make a difference", "passion for helping")
  * COVID/safety boilerplate (e.g., "social distancing", "protective hygiene", "PPE")
  * Universal soft skills everyone claims (e.g., "team player", "detail oriented") — put these in preferredQualifications instead
  * Company values or mission statements
  Focus on: specific therapy methods, clinical techniques, certifications, software tools, measurable professional competencies.
  Use SHORT skill names (e.g., "ABA therapy" not "Applied Behavior Analysis (ABA) therapy experience of at least 1 year"). Include the acronym if common.
  Use category "clinical" for healthcare/medical skills, "technical" for tech skills, "tool" for specific software/platforms, "soft" for interpersonal skills.
- matchSection: Where a recruiter would expect to find this — "skills" for listed skills, "certifications" for certs/licenses, "experience" for things proven through work history, "any" for general terms.
- booleanSearchTerms: The exact keywords a recruiter would type into their ATS search bar to find candidates for this role. Include the job title, key certifications, key skills, and industry terms. Use SHORT terms (2-3 words max).
- Distinguish between hard requirements (must-have) and preferences (nice-to-have).
- Only extract what the posting explicitly states. Do not infer requirements.`;

const JD_SCHEMA = {
  type: 'object' as const,
  properties: {
    roleTitle: { type: 'string' as const },
    company: { type: 'string' as const },
    location: { type: 'string' as const },
    employmentType: { type: 'string' as const },
    knockoutCriteria: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          requirement: { type: 'string' as const },
          category: { type: 'string' as const, enum: ['education', 'certification', 'authorization', 'physical', 'screening'] },
          isHardRequirement: { type: 'boolean' as const },
        },
        required: ['requirement', 'category', 'isHardRequirement'],
      },
    },
    requiredSkills: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          skill: { type: 'string' as const },
          category: { type: 'string' as const, enum: ['technical', 'clinical', 'soft', 'tool'] },
          matchSection: { type: 'string' as const, enum: ['skills', 'certifications', 'experience', 'any'] },
        },
        required: ['skill', 'category', 'matchSection'],
      },
    },
    requiredEducation: {
      type: 'object' as const,
      properties: {
        minimumDegree: { type: 'string' as const },
        field: { type: 'string' as const },
      },
      required: ['minimumDegree'],
    },
    requiredCertifications: { type: 'array' as const, items: { type: 'string' as const } },
    preferredQualifications: { type: 'array' as const, items: { type: 'string' as const } },
    keyResponsibilities: { type: 'array' as const, items: { type: 'string' as const } },
    booleanSearchTerms: { type: 'array' as const, items: { type: 'string' as const } },
  },
  required: ['roleTitle', 'knockoutCriteria', 'requiredSkills', 'requiredCertifications', 'preferredQualifications', 'keyResponsibilities', 'booleanSearchTerms'],
};

export async function parseJobDescriptionWithGemini(
  jdText: string,
  apiKey: string,
  model: string = 'gemini-2.5-flash'
): Promise<{ parsed: ParsedJobDescription; warnings: string[] }> {
  const warnings: string[] = [];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${JD_PARSE_PROMPT}\n\n=== JOB DESCRIPTION ===\n${jdText}` }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: JD_SCHEMA,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini JD parse failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('').trim();

  if (!text) {
    throw new Error('Gemini returned empty response for JD parsing');
  }

  const parsed: ParsedJobDescription = JSON.parse(text);

  // Validation
  if (!parsed.roleTitle) {
    warnings.push('Could not extract role title from job description');
  }
  if (parsed.requiredSkills.length === 0 && parsed.knockoutCriteria.length === 0) {
    warnings.push('No requirements or skills extracted — job description may be too vague');
  }
  if (parsed.booleanSearchTerms.length === 0) {
    warnings.push('No boolean search terms extracted — adding role title as fallback');
    if (parsed.roleTitle) {
      parsed.booleanSearchTerms = [parsed.roleTitle];
    }
  }

  return { parsed, warnings };
}
