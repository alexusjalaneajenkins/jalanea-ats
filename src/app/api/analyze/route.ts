import { NextRequest, NextResponse } from 'next/server';
import { generateATSAnalysis } from '@/lib/ai/deepseek';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resume, jobDescription } = body;

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Both resume and job description are required' },
        { status: 400 }
      );
    }

    if (resume.length < 50) {
      return NextResponse.json(
        { error: 'Resume seems too short. Please paste your full resume.' },
        { status: 400 }
      );
    }

    if (jobDescription.length < 50) {
      return NextResponse.json(
        { error: 'Job description seems too short. Please paste the full job posting.' },
        { status: 400 }
      );
    }

    const response = await generateATSAnalysis(resume, jobDescription);

    // Parse the JSON response from DeepSeek with multiple strategies
    let result: ATSAnalysisResult;
    try {
      // Strategy 1: Try direct JSON parsing (fastest)
      try {
        result = JSON.parse(response);
      } catch {
        // Strategy 2: Extract from markdown code blocks (```json ... ```)
        const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          result = JSON.parse(codeBlockMatch[1]);
        } else {
          // Strategy 3: Find last complete JSON object (greedy match from end)
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        }
      }
    } catch (parseError) {
      // If all parsing strategies fail, return a detailed error
      console.error('Failed to parse AI response:', response);
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse analysis. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('ATS Analysis Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
