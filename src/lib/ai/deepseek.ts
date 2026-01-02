const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export async function generateATSAnalysis(
  resume: string,
  jobDescription: string
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

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

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `DeepSeek API error: ${response.status}`);
  }

  const data: DeepSeekResponse = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
