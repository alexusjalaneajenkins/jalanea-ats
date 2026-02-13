import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS, GeminiModel } from '@/lib/llm/types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const ALLOWED_GEMINI_MODELS = new Set(GEMINI_MODELS.map((model) => model.id));

export function resolveGeminiModel(requestedModel?: string | null): GeminiModel {
  if (!requestedModel) {
    return DEFAULT_GEMINI_MODEL;
  }

  if (ALLOWED_GEMINI_MODELS.has(requestedModel as GeminiModel)) {
    return requestedModel as GeminiModel;
  }

  return DEFAULT_GEMINI_MODEL;
}

interface GeminiResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}

export async function generateATSAnalysis(
  resume: string,
  jobDescription: string,
  model?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.DEMO_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  const selectedModel = resolveGeminiModel(model);

  const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyzer. Your job is to analyze resumes against job descriptions and provide detailed, actionable feedback.

You must respond with ONLY valid JSON in this exact format:
{
  "score": <number 0-100>,
  "summary": "<brief 1-2 sentence summary of the match quality>",
  "keywordMatches": {
    "found": ["<keyword1>", "<keyword2>", ...],
    "missing": ["<keyword1>", "<keyword2>", ...],
    "matchRate": <number 0-100>
  },
  "sections": [
    {
      "name": "Contact Information",
      "score": <number 0-100>,
      "feedback": "<specific feedback for this section>"
    },
    {
      "name": "Professional Summary",
      "score": <number 0-100>,
      "feedback": "<specific feedback>"
    },
    {
      "name": "Work Experience",
      "score": <number 0-100>,
      "feedback": "<specific feedback>"
    },
    {
      "name": "Skills",
      "score": <number 0-100>,
      "feedback": "<specific feedback>"
    },
    {
      "name": "Education",
      "score": <number 0-100>,
      "feedback": "<specific feedback>"
    }
  ],
  "formatting": {
    "issues": ["<issue1>", "<issue2>", ...],
    "suggestions": ["<suggestion1>", "<suggestion2>", ...]
  },
  "overallSuggestions": [
    "<actionable suggestion 1>",
    "<actionable suggestion 2>",
    "<actionable suggestion 3>"
  ]
}

Important scoring guidelines:
- 90-100: Excellent match, highly likely to pass ATS
- 75-89: Good match, likely to pass with minor improvements
- 50-74: Moderate match, needs optimization
- Below 50: Poor match, significant improvements needed

Focus on:
1. Keyword matching between job description and resume
2. Standard section presence and formatting
3. Quantifiable achievements
4. Action verbs usage
5. ATS-friendly formatting (no tables, graphics, etc.)`;

  const userPrompt = `Analyze this resume against the job description:

=== JOB DESCRIPTION ===
${jobDescription}

=== RESUME ===
${resume}

Provide your analysis in the JSON format specified.`;

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${selectedModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        // Schema enforcement guarantees valid JSON structure [EXTERNAL - Gemini research]
        responseSchema: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            summary: { type: 'string' },
            keywordMatches: {
              type: 'object',
              properties: {
                found: { type: 'array', items: { type: 'string' } },
                missing: { type: 'array', items: { type: 'string' } },
                matchRate: { type: 'number' },
              },
              required: ['found', 'missing', 'matchRate'],
            },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  score: { type: 'number' },
                  feedback: { type: 'string' },
                },
                required: ['name', 'score', 'feedback'],
              },
            },
            formatting: {
              type: 'object',
              properties: {
                issues: { type: 'array', items: { type: 'string' } },
                suggestions: { type: 'array', items: { type: 'string' } },
              },
              required: ['issues', 'suggestions'],
            },
            overallSuggestions: { type: 'array', items: { type: 'string' } },
          },
          required: ['score', 'summary', 'keywordMatches', 'sections', 'formatting', 'overallSuggestions'],
        },
      },
    }),
  }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let errorMessage = `Gemini API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText) as { error?: { message?: string } };
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {
      if (errorText.trim()) {
        errorMessage = `${errorMessage} - ${errorText.slice(0, 200)}`;
      }
    }
    throw new Error(errorMessage);
  }

  const data: GeminiResponse = await response.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (text) {
    return text;
  }

  const blockReason = data.promptFeedback?.blockReason || candidate?.finishReason;
  if (blockReason) {
    throw new Error(`Gemini returned no text output (${blockReason})`);
  }

  throw new Error('Gemini returned an empty analysis response');
}
