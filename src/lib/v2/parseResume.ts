/**
 * V2 Resume Parser — AI-first structured extraction via Gemini
 */

import type { ParsedResume } from './types';
import { extractGeminiText, parseResumePayload } from './validation';

const RESUME_PARSE_PROMPT = `Parse this resume into the following JSON structure. Only include fields that are clearly present in the text. Do not infer or fabricate any information.

{
  "contactInfo": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "" },
  "summary": "professional summary or objective if present",
  "workHistory": [
    {
      "title": "job title",
      "company": "company name",
      "location": "city, state if present",
      "startDate": "start date as written",
      "endDate": "end date as written or 'Present'",
      "isCurrent": false,
      "bullets": ["responsibility or achievement 1", "responsibility 2"]
    }
  ],
  "education": [
    { "degree": "degree type", "field": "field of study", "school": "school name", "graduationDate": "", "gpa": "" }
  ],
  "skills": ["skill1", "skill2"],
  "certifications": ["cert1", "cert2"],
  "languages": ["language1"],
  "volunteerWork": [
    { "role": "role", "organization": "org", "description": "what you did" }
  ]
}

Rules:
- Extract work history bullets exactly as written in the resume
- For skills, extract individual skills (split comma-separated lists)
- For certifications, include license numbers or dates if present
- If a section is not present, use an empty array or omit the field
- workHistory should be in chronological order (most recent first)
- Do not add skills or qualifications not explicitly stated`;

const RESUME_SCHEMA = {
  type: 'object' as const,
  properties: {
    contactInfo: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const },
        phone: { type: 'string' as const },
        location: { type: 'string' as const },
        linkedin: { type: 'string' as const },
      },
      required: ['name'],
    },
    summary: { type: 'string' as const },
    workHistory: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' as const },
          company: { type: 'string' as const },
          location: { type: 'string' as const },
          startDate: { type: 'string' as const },
          endDate: { type: 'string' as const },
          isCurrent: { type: 'boolean' as const },
          bullets: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['title', 'company', 'bullets'],
      },
    },
    education: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          degree: { type: 'string' as const },
          field: { type: 'string' as const },
          school: { type: 'string' as const },
          graduationDate: { type: 'string' as const },
          gpa: { type: 'string' as const },
        },
        required: ['degree', 'school'],
      },
    },
    skills: { type: 'array' as const, items: { type: 'string' as const } },
    certifications: { type: 'array' as const, items: { type: 'string' as const } },
    languages: { type: 'array' as const, items: { type: 'string' as const } },
    volunteerWork: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          role: { type: 'string' as const },
          organization: { type: 'string' as const },
          description: { type: 'string' as const },
        },
        required: ['role', 'organization'],
      },
    },
  },
  required: ['contactInfo', 'workHistory', 'education', 'skills', 'certifications'],
};

export async function parseResumeWithGemini(
  resumeText: string,
  apiKey: string,
  model: string = 'gemini-2.5-flash',
  signal?: AbortSignal
): Promise<{ parsed: ParsedResume; warnings: string[] }> {
  const warnings: string[] = [];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${RESUME_PARSE_PROMPT}\n\n=== RESUME TEXT ===\n${resumeText}` }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: RESUME_SCHEMA,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Resume analysis provider request failed (${response.status})`);
  }

  const data: unknown = await response.json();
  const text = extractGeminiText(data);

  if (!text) {
    throw new Error('Resume analysis provider returned no usable result');
  }

  const parsed: ParsedResume = parseResumePayload(text);

  // Validation warnings
  if (!parsed.contactInfo?.name) {
    warnings.push('Could not extract candidate name from resume');
  }
  if (parsed.workHistory.length === 0 && parsed.education.length === 0) {
    warnings.push('No work history or education found — resume may be incomplete or poorly formatted');
  }
  if (parsed.skills.length === 0) {
    warnings.push('No skills section detected — skills may be embedded in work history bullets');
  }

  return { parsed, warnings };
}
